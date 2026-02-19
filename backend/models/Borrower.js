const mongoose = require('mongoose');

const borrowerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Borrower name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  address: {
    type: String,
    required: false,
    trim: true
  },
  idProof: {
    type: String,
    required: false,
    trim: true
  },
  creditScore: {
    type: Number,
    default: 650,
    min: 300,
    max: 850
  },
  monthlyIncome: {
    type: Number,
    required: false
  },
  employmentStatus: {
    type: String,
    enum: ['employed', 'self-employed', 'unemployed', 'student', 'retired'],
    default: 'employed'
  },
  employmentYears: {
    type: Number,
    default: 0
  },
  yearsAtAddress: {
    type: Number,
    default: 0
  },
  riskRating: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Calculate risk rating based on credit score
borrowerSchema.pre('save', function(next) {
  if (this.creditScore >= 700) {
    this.riskRating = 'Low';
  } else if (this.creditScore >= 550) {
    this.riskRating = 'Medium';
  } else {
    this.riskRating = 'High';
  }
  next();
});

module.exports = mongoose.model('Borrower', borrowerSchema);