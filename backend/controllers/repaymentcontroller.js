
const mongoose = require('mongoose');
const Repayment = require('../models/Repayment');
const Loan = require('../models/Loan');
const Borrower = require('../models/Borrower');

// -----------------------------------------------------
// MONEY HELPERS
// -----------------------------------------------------
const toPaise = (amount) => Math.round(Number(amount) * 100);

const fromPaise = (amount) => amount / 100;

const validAmount = (amount) => {
  const value = Number(amount);
  return Number.isFinite(value) && value > 0 &&
    Number.isSafeInteger(toPaise(value));
};

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(query.limit, 10) || 10)
  );

  return { page, limit };
};

// -----------------------------------------------------
// APPLY AN ACTUAL PAYMENT TO A LOAN
// -----------------------------------------------------
const applyPaymentToLoan = async (loanId, amount) => {
  const loan = await Loan.findById(loanId);

  if (!loan) {
    throw new Error('Loan not found');
  }

  if (['cancelled', 'defaulted'].includes(loan.status)) {
    throw new Error(`Cannot accept payment for a ${loan.status} loan`);
  }

  const totalPaise = toPaise(loan.totalDue);
  const paidPaise = toPaise(loan.paidAmount || 0);
  const paymentPaise = toPaise(amount);
  const remainingPaise = Math.max(0, totalPaise - paidPaise);

  if (paymentPaise > remainingPaise) {
    throw new Error(
      `Payment exceeds the outstanding balance of ₹${fromPaise(remainingPaise).toFixed(2)}`
    );
  }

  const newPaidPaise = paidPaise + paymentPaise;
  const newRemainingPaise = Math.max(0, totalPaise - newPaidPaise);

  loan.paidAmount = fromPaise(newPaidPaise);
  loan.remainingAmount = fromPaise(newRemainingPaise);

  if (newRemainingPaise === 0) {
    loan.status = 'completed';
  }

  await loan.save();

  return loan;
};

// -----------------------------------------------------
// GET ALL REPAYMENTS
// -----------------------------------------------------
exports.getAllRepayments = async (req, res) => {
  try {
    const { status, type, search } = req.query;
    const { page, limit } = getPagination(req.query);

    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (type && type !== 'all') {
      query.type = type;
    }

    if (search && search.trim()) {
      query.borrowerName = {
        $regex: escapeRegex(search.trim()),
        $options: 'i'
      };
    }

    const [repayments, total] = await Promise.all([
      Repayment.find(query)
        .populate('loanId', 'principal interestRate totalDue remainingAmount')
        .sort({ dueDate: 1, createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit),

      Repayment.countDocuments(query)
    ]);

    return res.json({
      repayments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// -----------------------------------------------------
// RECORD A MANUAL PAYMENT
// The amount is what the borrower ACTUALLY paid today.
// -----------------------------------------------------
exports.recordRepayment = async (req, res) => {
  let repayment;

  try {
    const { loanId, amount, paymentDate } = req.body;

    if (!mongoose.isValidObjectId(loanId)) {
      return res.status(400).json({ message: 'Valid loan ID is required' });
    }

    if (!validAmount(amount)) {
      return res.status(400).json({
        message: 'Payment amount must be a positive monetary amount'
      });
    }

    const date = paymentDate ? new Date(paymentDate) : new Date();

    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({ message: 'Invalid payment date' });
    }

    const loan = await Loan.findById(loanId);

    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const paymentAmount = fromPaise(toPaise(amount));

    // Save the actual payment as a paid repayment record.
    repayment = new Repayment({
      loanId: loan._id,
      borrowerId: loan.borrowerId,
      borrowerName: loan.borrowerName,
      amount: paymentAmount,
      paymentDate: date,
      dueDate: date,
      status: 'paid',
      type: loan.repaymentSchedule
    });

    await repayment.save();

    try {
      const updatedLoan = await applyPaymentToLoan(
        loan._id,
        paymentAmount
      );

      return res.status(201).json({
        message: 'Payment recorded successfully',
        repayment,
        loan: updatedLoan
      });
    } catch (error) {
      // Remove the payment record if the balance update fails.
      await Repayment.deleteOne({ _id: repayment._id });
      repayment = null;
      throw error;
    }
  } catch (error) {
    const statusCode = error.message === 'Loan not found' ? 404 : 400;

    return res.status(statusCode).json({
      message: error.message
    });
  }
};

// -----------------------------------------------------
// MARK ONE SCHEDULED INSTALLMENT AS PAID
// A pending installment can only be processed once.
// -----------------------------------------------------
exports.markAsPaid = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid repayment ID' });
    }

    const date = new Date();

    // Conditional update prevents repeated marking of a paid record.
    const repayment = await Repayment.findOneAndUpdate(
      {
        _id: req.params.id,
        status: 'pending'
      },
      {
        $set: {
          status: 'paid',
          paymentDate: date
        }
      },
      { new: true }
    );

    if (!repayment) {
      const existing = await Repayment.findById(req.params.id);

      if (!existing) {
        return res.status(404).json({ message: 'Repayment not found' });
      }

      return res.status(409).json({
        message: 'This repayment is not pending and cannot be paid again'
      });
    }

    try {
      const loan = await applyPaymentToLoan(
        repayment.loanId,
        repayment.amount
      );

      return res.json({
        message: 'Repayment marked as paid',
        repayment,
        loan
      });
    } catch (error) {
      // Best-effort rollback if the loan balance cannot be updated.
      await Repayment.updateOne(
        { _id: repayment._id, status: 'paid' },
        {
          $set: { status: 'pending' },
          $unset: { paymentDate: 1 }
        }
      );

      throw error;
    }
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

// -----------------------------------------------------
// MARK MULTIPLE SCHEDULED INSTALLMENTS AS PAID
// -----------------------------------------------------
exports.markMultipleAsPaid = async (req, res) => {
  try {
    const { repaymentIds } = req.body;

    if (
      !Array.isArray(repaymentIds) ||
      repaymentIds.length === 0 ||
      repaymentIds.length > 100
    ) {
      return res.status(400).json({
        message: 'Provide between 1 and 100 repayment IDs'
      });
    }

    if (!repaymentIds.every(mongoose.isValidObjectId)) {
      return res.status(400).json({
        message: 'One or more repayment IDs are invalid'
      });
    }

    const uniqueIds = [...new Set(repaymentIds.map(String))];
    const updated = [];
    const failed = [];
    const date = new Date();

    for (const id of uniqueIds) {
      const repayment = await Repayment.findOneAndUpdate(
        { _id: id, status: 'pending' },
        { $set: { status: 'paid', paymentDate: date } },
        { new: true }
      );

      if (!repayment) {
        failed.push({
          repaymentId: id,
          message: 'Not found or no longer pending'
        });
        continue;
      }

      try {
        await applyPaymentToLoan(repayment.loanId, repayment.amount);
        updated.push(id);
      } catch (error) {
        // Best-effort rollback for this installment.
        await Repayment.updateOne(
          { _id: repayment._id, status: 'paid' },
          {
            $set: { status: 'pending' },
            $unset: { paymentDate: 1 }
          }
        );

        failed.push({
          repaymentId: id,
          message: error.message
        });
      }
    }

    return res.json({
      message: `${updated.length} repayments marked as paid`,
      updatedCount: updated.length,
      updatedIds: updated,
      failed
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

// -----------------------------------------------------
// GET TODAY'S PENDING REPAYMENTS
// -----------------------------------------------------
exports.getTodaysDueRepayments = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const repayments = await Repayment.find({
      dueDate: { $gte: today, $lt: tomorrow },
      status: 'pending'
    })
      .populate('loanId')
      .sort({ dueDate: 1 });

    return res.json(repayments);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// -----------------------------------------------------
// GET OVERDUE PENDING REPAYMENTS
// -----------------------------------------------------
exports.getOverdueRepayments = async (req, res) => {
  try {
    const now = new Date();

    const repayments = await Repayment.find({
      dueDate: { $lt: new Date() },
      status: { $in: ['pending', 'overdue'] }
    })
      .populate('loanId')
      .sort({ dueDate: 1 });

    return res.json(repayments);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


/**
 * Recalculate a loan balance from all repayments marked as paid.
 * This keeps the loan totals consistent after an edit or deletion.
 */
const recalculateLoanBalance = async (loanId) => {
  const loan = await Loan.findById(loanId);

  if (!loan) {
    throw new Error('Loan not found');
  }

  const result = await Repayment.aggregate([
    {
      $match: {
        loanId: loan._id,
        status: 'paid'
      }
    },
    {
      $group: {
        _id: null,
        totalPaidPaise: {
          $sum: {
            $round: [
              { $multiply: ['$amount', 100] },
              0
            ]
          }
        }
      }
    }
  ]);

  const paidPaise = result[0]?.totalPaidPaise || 0;
  const totalDuePaise = Math.round(Number(loan.totalDue) * 100);

  if (paidPaise > totalDuePaise) {
    throw new Error(
      'Recorded payments exceed the loan total. Correct the payment records first.'
    );
  }

  loan.paidAmount = paidPaise / 100;
  loan.remainingAmount = (totalDuePaise - paidPaise) / 100;

  if (loan.remainingAmount === 0) {
    loan.status = 'completed';
  } else if (loan.status === 'completed') {
    loan.status = 'active';
  }

  await loan.save();

  return loan;
};


// -----------------------------------------------------
// UPDATE A REPAYMENT
// PUT /api/repayments/:id
// -----------------------------------------------------
exports.updateRepayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paymentDate } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: 'Invalid repayment ID'
      });
    }

    const repayment = await Repayment.findById(id);

    if (!repayment) {
      return res.status(404).json({
        message: 'Repayment not found'
      });
    }

    const oldAmount = repayment.amount;
    const oldPaymentDate = repayment.paymentDate;

    if (amount !== undefined) {
      if (!validAmount(amount)) {
        return res.status(400).json({
          message: 'Amount must be greater than zero'
        });
      }

      repayment.amount = fromPaise(toPaise(amount));
    }

    if (paymentDate !== undefined) {
      const date = new Date(paymentDate);

      if (Number.isNaN(date.getTime())) {
        return res.status(400).json({
          message: 'Invalid payment date'
        });
      }

      repayment.paymentDate = date;
    }

    try {
      await repayment.save();

      const loan = await recalculateLoanBalance(repayment.loanId);

      return res.json({
        message: 'Repayment updated successfully',
        repayment,
        loan
      });
    } catch (error) {
      // Restore the original repayment if recalculation fails.
      repayment.amount = oldAmount;
      repayment.paymentDate = oldPaymentDate;
      await repayment.save();

      throw error;
    }
  } catch (error) {
    return res.status(400).json({
      message: error.message
    });
  }
};


// -----------------------------------------------------
// DELETE A REPAYMENT
// DELETE /api/repayments/:id
// -----------------------------------------------------
exports.deleteRepayment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: 'Invalid repayment ID'
      });
    }

    const repayment = await Repayment.findById(id);

    if (!repayment) {
      return res.status(404).json({
        message: 'Repayment not found'
      });
    }

    const loanId = repayment.loanId;
    const deletedRepayment = repayment.toObject();

    await repayment.deleteOne();

    try {
      const loan = await recalculateLoanBalance(loanId);

      return res.json({
        message: 'Repayment deleted and loan balance recalculated',
        deletedRepayment,
        loan
      });
    } catch (error) {
      // Restore the record if recalculation fails.
      await Repayment.create(deletedRepayment);
      throw error;
    }
  } catch (error) {
    return res.status(400).json({
      message: error.message
    });
  }
};

