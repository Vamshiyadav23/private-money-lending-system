const Repayment = require('../models/Repayment');
const Loan = require('../models/Loan');
const Borrower = require('../models/Borrower');

// Get all repayments
exports.getAllRepayments = async (req, res) => {
  try {
    const { status, type, search, page = 1, limit = 10 } = req.query;
    
    let query = {};
    
    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Filter by type
    if (type && type !== 'all') {
      query.type = type;
    }
    
    // Search by borrower name
    if (search) {
      query.borrowerName = { $regex: search, $options: 'i' };
    }
    
    const repayments = await Repayment.find(query)
      .populate('loanId', 'principal interestRate')
      .sort({ dueDate: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Repayment.countDocuments(query);
    
    res.json({
      repayments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Record repayment
exports.recordRepayment = async (req, res) => {
  try {
    const { loanId, amount, paymentDate, status } = req.body;
    
    // Verify loan exists
    const loan = await Loan.findById(loanId);
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }
    
    const repayment = new Repayment({
      loanId,
      borrowerId: loan.borrowerId,
      borrowerName: loan.borrowerName,
      amount,
      paymentDate: paymentDate || new Date(),
      dueDate: new Date(), // For manual repayments, due date is today
      status: status || 'paid',
      type: loan.repaymentSchedule
    });
    
    await repayment.save();
    
    // Update loan paid amount
    await Loan.findByIdAndUpdate(loanId, {
      $inc: { paidAmount: amount }
    });
    
    res.status(201).json(repayment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Mark repayment as paid
exports.markAsPaid = async (req, res) => {
  try {
    const repayment = await Repayment.findByIdAndUpdate(
      req.params.id,
      {
        status: 'paid',
        paymentDate: new Date()
      },
      { new: true }
    );
    
    if (!repayment) {
      return res.status(404).json({ message: 'Repayment not found' });
    }
    
    // Update loan paid amount
    await Loan.findByIdAndUpdate(repayment.loanId, {
      $inc: { paidAmount: repayment.amount }
    });
    
    res.json(repayment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Mark multiple repayments as paid
exports.markMultipleAsPaid = async (req, res) => {
  try {
    const { repaymentIds } = req.body;
    
    const result = await Repayment.updateMany(
      { _id: { $in: repaymentIds } },
      {
        status: 'paid',
        paymentDate: new Date()
      }
    );
    
    // Update corresponding loans
    const repayments = await Repayment.find({ _id: { $in: repaymentIds } });
    
    for (const repayment of repayments) {
      await Loan.findByIdAndUpdate(repayment.loanId, {
        $inc: { paidAmount: repayment.amount }
      });
    }
    
    res.json({ 
      message: `${result.modifiedCount} repayments marked as paid`,
      updatedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get today's due repayments
exports.getTodaysDueRepayments = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const repayments = await Repayment.find({
      dueDate: {
        $gte: today,
        $lt: tomorrow
      },
      status: 'pending'
    }).populate('loanId');
    
    res.json(repayments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get overdue repayments
exports.getOverdueRepayments = async (req, res) => {
  try {
    const today = new Date();
    
    const repayments = await Repayment.find({
      dueDate: { $lt: today },
      status: 'pending'
    }).populate('loanId');
    
    res.json(repayments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};