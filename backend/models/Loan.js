
const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema(
  {
    borrowerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Borrower',
      required: true
    },

    borrowerName: {
      type: String,
      required: true,
      trim: true
    },

    // Face value owed by the borrower, not cash disbursed.
    principal: {
      type: Number,
      required: [true, 'Principal amount is required'],
      min: [0.01, 'Principal must be greater than zero']
    },

    // Percentage deducted upfront.
    interestRate: {
      type: Number,
      required: [true, 'Interest rate is required'],
      min: [0, 'Interest rate cannot be negative'],
      max: [99.99, 'Interest rate must be less than 100']
    },

    // Amount deducted before disbursement.
    upfrontInterest: {
      type: Number,
      required: true,
      min: 0
    },

    // Actual cash handed to the borrower.
    disbursedAmount: {
      type: Number,
      required: true,
      min: 0
    },

    startDate: {
      type: Date,
      required: true,
      default: Date.now
    },

    // Last scheduled installment date, not automatic closure date.
    endDate: {
      type: Date,
      required: true
    },

    repaymentSchedule: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: true,
      default: 'monthly'
    },

    status: {
      type: String,
      enum: [
        'active',
        'completed',
        'overdue',
        'defaulted',
        'cancelled'
      ],
      default: 'active',
      required: true
    },

    // Total amount the borrower must repay.
    totalDue: {
      type: Number,
      required: true,
      min: 0
    },

    // Total money actually collected so far.
    paidAmount: {
      type: Number,
      default: 0,
      min: 0
    },

    // Amount still owed by the borrower.
    remainingAmount: {
      type: Number,
      required: true,
      min: 0
    },

    // Number of scheduled installments.
    loanTerm: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isSafeInteger,
        message: 'Loan term must be a whole number of installments'
      }
    }
  },
  {
    timestamps: true
  }
);

// Recalculate the balance when financial fields change.
// Do not automatically override cancelled/defaulted status.
loanSchema.pre('save', function (next) {
  const money = (amount) =>
    Math.round((amount + Number.EPSILON) * 100) / 100;

  if (
    this.isNew ||
    this.isModified('totalDue') ||
    this.isModified('paidAmount')
  ) {
    this.paidAmount = money(this.paidAmount || 0);

    this.remainingAmount = money(
      Math.max(0, this.totalDue - this.paidAmount)
    );

    // A loan is completed only when fully repaid.
    if (this.remainingAmount === 0) {
      this.status = 'completed';
    } else if (this.status === 'completed') {
      this.status = 'active';
    }
  }

  next();
});

module.exports = mongoose.model('Loan', loanSchema);
