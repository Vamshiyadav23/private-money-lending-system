
const mongoose = require('mongoose');
const Loan = require('../models/Loan');
const Borrower = require('../models/Borrower');
const Repayment = require('../models/Repayment');

// Round monetary amounts to two decimal places.
const roundMoney = (amount) =>
  Math.round((amount + Number.EPSILON) * 100) / 100;

// Convert rupees to integer paise to avoid installment rounding errors.
const toPaise = (amount) => Math.round(Number(amount) * 100);

// =====================================================
// GET ALL LOANS
// =====================================================
exports.getAllLoans = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    );

    const { status } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    const loans = await Loan.find(query)
      .populate('borrowerId', 'name email phone creditScore')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await Loan.countDocuments(query);

    return res.json({
      loans,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
};

// =====================================================
// CREATE LOAN — UPFRONT INTEREST MODEL
// =====================================================
exports.createLoan = async (req, res) => {
  try {
    const {
      borrowerId,
      principal,
      interestRate,
      startDate,
      loanTerm,
      repaymentSchedule
    } = req.body;

    // Validate borrower ID.
    if (!mongoose.isValidObjectId(borrowerId)) {
      return res.status(400).json({
        message: 'A valid borrower ID is required'
      });
    }

    // Validate principal.
    const faceValue = Number(principal);

    if (!Number.isFinite(faceValue) || faceValue <= 0) {
      return res.status(400).json({
        message: 'Principal must be a positive number'
      });
    }

    if (toPaise(faceValue) <= 0) {
      return res.status(400).json({
        message: 'Principal must be at least ₹0.01'
      });
    }

    // Validate upfront interest percentage.
    const rate = Number(interestRate);

    if (
      !Number.isFinite(rate) ||
      rate < 0 ||
      rate >= 100
    ) {
      return res.status(400).json({
        message: 'Interest rate must be at least 0% and less than 100%'
      });
    }

    // Loan term represents the number of installments.
    const installmentCount = Number(loanTerm);

    if (
      !Number.isSafeInteger(installmentCount) ||
      installmentCount <= 0
    ) {
      return res.status(400).json({
        message: 'Loan term must be a positive whole number of installments'
      });
    }

    const schedule = String(repaymentSchedule || '').toLowerCase();

    if (!['daily', 'weekly', 'monthly'].includes(schedule)) {
      return res.status(400).json({
        message: 'Repayment schedule must be daily, weekly, or monthly'
      });
    }

    // Find the borrower.
    const borrower = await Borrower.findById(borrowerId);

    if (!borrower) {
      return res.status(404).json({
        message: 'Borrower not found'
      });
    }

    // Validate the start date.
    const start = startDate ? new Date(startDate) : new Date();

    if (Number.isNaN(start.getTime())) {
      return res.status(400).json({
        message: 'Invalid start date'
      });
    }

    // -------------------------------------------------
    // UPFRONT INTEREST CALCULATION
    // -------------------------------------------------
    //
    // Example:
    // Face value       = ₹20,000
    // Upfront interest = 15% = ₹3,000
    // Cash disbursed   = ₹17,000
    // Total to collect = ₹20,000
    //
    // principal represents the face value owed.
    // -------------------------------------------------

    const faceValuePaise = toPaise(faceValue);

    const upfrontInterestPaise = Math.round(
      faceValuePaise * rate / 100
    );

    const disbursedPaise =
      faceValuePaise - upfrontInterestPaise;

    const totalDue = faceValuePaise / 100;
    const upfrontInterest = upfrontInterestPaise / 100;
    const disbursedAmount = disbursedPaise / 100;

    // Generate scheduled due dates.
    const dueDates = [];
    let currentDueDate = new Date(start);

    for (let i = 0; i < installmentCount; i++) {
      currentDueDate = calculateNextDueDate(
        currentDueDate,
        schedule
      );

      dueDates.push(new Date(currentDueDate));
    }

    const endDate = dueDates[dueDates.length - 1];

    // Create the loan record.
    const loan = new Loan({
      borrowerId: borrower._id,
      borrowerName: borrower.name,
      principal: totalDue,
      interestRate: rate,
      upfrontInterest,
      disbursedAmount,
      startDate: start,
      endDate,
      repaymentSchedule: schedule,
      loanTerm: installmentCount,
      totalDue,
      remainingAmount: totalDue,
      status: 'active'
    });

    await loan.save();

    // Create installments.
    try {
      await createRepaymentSchedule(loan, dueDates);
    } catch (scheduleError) {
      // Best-effort cleanup to avoid leaving an incomplete loan.
      await Repayment.deleteMany({ loanId: loan._id });
      await Loan.deleteOne({ _id: loan._id });

      throw scheduleError;
    }

    return res.status(201).json({
      message: 'Loan created successfully',
      loan,
      calculation: {
        faceValue: totalDue,
        interestRate: rate,
        upfrontInterest,
        disbursedAmount,
        totalDue,
        installmentCount,
        repaymentSchedule: schedule,
        scheduledInstallmentAmount: roundMoney(
          totalDue / installmentCount
        )
      }
    });
  } catch (error) {
    console.error('Create loan error:', error);

    return res.status(400).json({
      message: error.message
    });
  }
};

// =====================================================
// CREATE REPAYMENT SCHEDULE
// =====================================================
const createRepaymentSchedule = async (loan, dueDates) => {
  const count = dueDates.length;

  if (count === 0) {
    throw new Error('At least one installment is required');
  }

  const totalPaise = toPaise(loan.totalDue);
  const baseInstallmentPaise = Math.floor(totalPaise / count);

  let allocatedPaise = 0;
  const repayments = [];

  for (let i = 0; i < count; i++) {
    // Allocate the remainder to the last installment.
    const amountPaise =
      i === count - 1
        ? totalPaise - allocatedPaise
        : baseInstallmentPaise;

    allocatedPaise += amountPaise;

    repayments.push({
      loanId: loan._id,
      borrowerId: loan.borrowerId,
      borrowerName: loan.borrowerName,
      amount: amountPaise / 100,
      dueDate: new Date(dueDates[i]),
      type: loan.repaymentSchedule,
      status: 'pending'
    });
  }

  await Repayment.insertMany(repayments);
};

// =====================================================
// CALCULATE NEXT DUE DATE
// =====================================================
const calculateNextDueDate = (currentDate, schedule) => {
  const nextDate = new Date(currentDate);

  switch (schedule) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;

    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;

    case 'monthly': {
      // Avoid JavaScript month overflow, such as
      // January 31 rolling into March.
      const originalDay = nextDate.getDate();

      nextDate.setDate(1);
      nextDate.setMonth(nextDate.getMonth() + 1);

      const lastDayOfMonth = new Date(
        nextDate.getFullYear(),
        nextDate.getMonth() + 1,
        0
      ).getDate();

      nextDate.setDate(
        Math.min(originalDay, lastDayOfMonth)
      );

      break;
    }

    default:
      throw new Error('Unsupported repayment schedule');
  }

  return nextDate;
};

// =====================================================
// UPDATE LOAN STATUS
// =====================================================
exports.updateLoanStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      'active',
      'completed',
      'overdue',
      'defaulted',
      'cancelled'
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: 'Invalid loan status'
      });
    }

    const loan = await Loan.findById(req.params.id);

    if (!loan) {
      return res.status(404).json({
        message: 'Loan not found'
      });
    }

    // Do not manually complete a loan with money outstanding.
    if (
      status === 'completed' &&
      Number(loan.remainingAmount) > 0
    ) {
      return res.status(400).json({
        message: 'Cannot complete a loan with an outstanding balance'
      });
    }

    loan.status = status;
    await loan.save();

    return res.json({
      message: 'Loan status updated successfully',
      loan
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message
    });
  }
};

// =====================================================
// GET LOAN DETAILS AND REPAYMENT SCHEDULE
// =====================================================
exports.getLoanDetails = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid loan ID'
      });
    }

    const loan = await Loan.findById(req.params.id)
      .populate('borrowerId');

    if (!loan) {
      return res.status(404).json({
        message: 'Loan not found'
      });
    }

    const repayments = await Repayment.find({
      loanId: loan._id
    }).sort({ dueDate: 1 });

    return res.json({
      loan,
      repayments
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
};
