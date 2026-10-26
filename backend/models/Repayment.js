
const mongoose = require('mongoose');

const repaymentSchema = new mongoose.Schema(
  {
    loanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Loan',
      required: true,
      index: true
    },

    borrowerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Borrower',
      required: true,
      index: true
    },

    borrowerName: {
      type: String,
      required: true,
      trim: true
    },

    // Amount scheduled or actually collected, depending on the record.
    amount: {
      type: Number,
      required: [true, 'Repayment amount is required'],
      min: [0.01, 'Repayment amount must be greater than zero']
    },

    // Scheduled due date, or the actual date for a manual payment.
    dueDate: {
      type: Date,
      required: true,
      index: true
    },

    // Set only when payment is actually received.
    paymentDate: {
      type: Date,
      default: null
    },

    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue', 'cancelled'],
      default: 'pending',
      required: true,
      index: true
    },

    type: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: true
    },

    lateFee: {
      type: Number,
      default: 0,
      min: [0, 'Late fee cannot be negative']
    }
  },
  {
    timestamps: true
  }
);

// Do not automatically change repayment status in save middleware.
// Status transitions must be handled explicitly by the controller.

module.exports = mongoose.model('Repayment', repaymentSchema);
