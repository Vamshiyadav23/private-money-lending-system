const mongoose = require('mongoose');

const repaymentSchema = new mongoose.Schema({
  loanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Loan',
    required: true
  },
  borrowerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Borrower',
    required: true
  },
  borrowerName: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: [true, 'Repayment amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  dueDate: {
    type: Date,
    required: true
  },
  paymentDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue', 'cancelled'],
    default: 'pending'
  },
  type: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true
  },
  lateFee: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Auto-update status based on dates
repaymentSchema.pre('save', function(next) {
  const now = new Date();
  
  if (this.status === 'pending' && this.dueDate < now && !this.paymentDate) {
    this.status = 'overdue';
  }
  
  if (this.paymentDate && this.status === 'pending') {
    this.status = 'paid';
  }
  
  next();
});

module.exports = mongoose.model('Repayment', repaymentSchema);