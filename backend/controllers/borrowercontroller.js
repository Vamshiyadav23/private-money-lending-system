const Borrower = require('../models/Borrower');
const Loan = require('../models/Loan');
const Repayment = require('../models/Repayment');

// Get all borrowers
exports.getAllBorrowers = async (req, res) => {
  try {
    const { search, riskRating, page = 1, limit = 10 } = req.query;
    
    let query = {};
    
    // Search by name or email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filter by risk rating
    if (riskRating && riskRating !== 'all') {
      query.riskRating = riskRating;
    }
    
    const borrowers = await Borrower.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Borrower.countDocuments(query);
    
    res.json({
      borrowers,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single borrower
exports.getBorrower = async (req, res) => {
  try {
    const borrower = await Borrower.findById(req.params.id);
    if (!borrower) {
      return res.status(404).json({ message: 'Borrower not found' });
    }
    res.json(borrower);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new borrower
exports.createBorrower = async (req, res) => {
  try {
    const borrower = new Borrower(req.body);
    await borrower.save();
    res.status(201).json(borrower);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Email already exists' });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
};

// Update borrower
exports.updateBorrower = async (req, res) => {
  try {
    const borrower = await Borrower.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!borrower) {
      return res.status(404).json({ message: 'Borrower not found' });
    }
    
    res.json(borrower);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete borrower
exports.deleteBorrower = async (req, res) => {
  try {
    // Check if borrower has active loans
    const activeLoans = await Loan.findOne({ 
      borrowerId: req.params.id, 
      status: 'active' 
    });
    
    if (activeLoans) {
      return res.status(400).json({ 
        message: 'Cannot delete borrower with active loans' 
      });
    }
    
    const borrower = await Borrower.findByIdAndDelete(req.params.id);
    
    if (!borrower) {
      return res.status(404).json({ message: 'Borrower not found' });
    }
    
    res.json({ message: 'Borrower deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get borrower's loans and repayment history
exports.getBorrowerDetails = async (req, res) => {
  try {
    const borrower = await Borrower.findById(req.params.id);
    if (!borrower) {
      return res.status(404).json({ message: 'Borrower not found' });
    }
    
    const loans = await Loan.find({ borrowerId: req.params.id });
    const repayments = await Repayment.find({ borrowerId: req.params.id });
    
    res.json({
      borrower,
      loans,
      repayments
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};