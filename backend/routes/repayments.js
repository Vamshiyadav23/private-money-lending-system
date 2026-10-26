
const express = require('express');
const router = express.Router();

const {
  getAllRepayments,
  getTodaysDueRepayments,
  getOverdueRepayments,
  recordRepayment,
  markAsPaid,
  markMultipleAsPaid,
  updateRepayment,
  deleteRepayment
} = require('../controllers/repaymentcontroller');

// Get all repayments
router.get('/', getAllRepayments);

// Get today's pending repayments
router.get('/today-due', getTodaysDueRepayments);

// Get overdue repayments
router.get('/overdue', getOverdueRepayments);

// Record an actual payment (partial, normal, or advance)
router.post('/', recordRepayment);

// Mark a scheduled installment as paid
router.put('/bulk/paid', markMultipleAsPaid);
router.put('/:id/paid', markAsPaid);

// Edit an existing repayment
router.put('/:id', updateRepayment);

// Delete a repayment
router.delete('/:id', deleteRepayment);

module.exports = router;
