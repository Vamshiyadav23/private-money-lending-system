const Loan = require('../models/Loan');
const Borrower = require('../models/Borrower');
const Repayment = require('../models/Repayment');

// Get all loans
exports.getAllLoans = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    let query = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const loans = await Loan.find(query)
      .populate('borrowerId', 'name email phone creditScore')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Loan.countDocuments(query);
    
    res.json({
      loans,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new loan
exports.createLoan = async (req, res) => {
  try {
    const { borrowerId, principal, interestRate, startDate, loanTerm, repaymentSchedule } = req.body;
    
    // Verify borrower exists
    const borrower = await Borrower.findById(borrowerId);
    if (!borrower) {
      return res.status(404).json({ message: 'Borrower not found' });
    }
    
    // Calculate loan details
    const start = new Date(startDate);
    const endDate = new Date(start);
    endDate.setMonth(start.getMonth() + parseInt(loanTerm));
    
    const totalDue = principal + (principal * (interestRate / 100) * (parseInt(loanTerm) / 12));
    
    const loan = new Loan({
      borrowerId,
      borrowerName: borrower.name,
      principal,
      interestRate,
      startDate: start,
      endDate,
      repaymentSchedule,
      totalDue,
      remainingAmount: totalDue,
      loanTerm: parseInt(loanTerm)
    });
    
    await loan.save();
    
    // Create repayment schedule
    await createRepaymentSchedule(loan);
    
    res.status(201).json(loan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Helper function to create repayment schedule
const createRepaymentSchedule = async (loan) => {
  const repayments = [];
  const startDate = new Date(loan.startDate);
  
  let dueDate = new Date(startDate);
  const installmentAmount = loan.totalDue / getNumberOfInstallments(loan);
  
  for (let i = 0; i < getNumberOfInstallments(loan); i++) {
    dueDate = calculateNextDueDate(dueDate, loan.repaymentSchedule);
    
    repayments.push({
      loanId: loan._id,
      borrowerId: loan.borrowerId,
      borrowerName: loan.borrowerName,
      amount: parseFloat(installmentAmount.toFixed(2)),
      dueDate: new Date(dueDate),
      type: loan.repaymentSchedule,
      status: 'pending'
    });
  }
  
  await Repayment.insertMany(repayments);
};

const getNumberOfInstallments = (loan) => {
  switch (loan.repaymentSchedule) {
    case 'daily':
      return Math.ceil(loan.loanTerm * 30); // Approximate
    case 'weekly':
      return Math.ceil(loan.loanTerm * 4); // Approximate
    case 'monthly':
      return loan.loanTerm;
    default:
      return loan.loanTerm;
  }
};

const calculateNextDueDate = (currentDate, schedule) => {
  const nextDate = new Date(currentDate);
  
  switch (schedule) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
  }
  
  return nextDate;
};

// Update loan status
exports.updateLoanStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const loan = await Loan.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }
    
    res.json(loan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get loan details with repayments
exports.getLoanDetails = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id).populate('borrowerId');
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }
    
    const repayments = await Repayment.find({ loanId: req.params.id }).sort({ dueDate: 1 });
    
    res.json({
      loan,
      repayments
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};