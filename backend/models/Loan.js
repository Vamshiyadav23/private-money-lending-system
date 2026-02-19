const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  borrowerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Borrower',
    required: true
  },
  borrowerName: {
    type: String,
    required: true
  },
  principal: {
    type: Number,
    required: [true, 'Principal amount is required'],
    min: [0, 'Principal cannot be negative']
  },
  interestRate: {
    type: Number,
    required: [true, 'Interest rate is required'],
    min: [0, 'Interest rate cannot be negative']
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  repaymentSchedule: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'monthly'
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'defaulted', 'cancelled'],
    default: 'active'
  },
  totalDue: {
    type: Number,
    required: true
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  remainingAmount: {
    type: Number,
    required: true
  },
  loanTerm: {
    type: Number, // in months
    required: true
  }
}, {
  timestamps: true
});

// Calculate remaining amount
loanSchema.pre('save', function(next) {
  this.remainingAmount = this.totalDue - this.paidAmount;
  
  // Update status based on remaining amount
  if (this.remainingAmount <= 0 && this.status === 'active') {
    this.status = 'completed';
  }
  
  next();
});

module.exports = mongoose.model('Loan', loanSchema);