const express = require('express');
const router = express.Router();
const {
  getAllRepayments,
  getTodaysDueRepayments,
  getOverdueRepayments,
  recordRepayment,
  markAsPaid,
  markMultipleAsPaid
} = require('../controllers/repaymentController');

router.get('/', getAllRepayments);
router.get('/today-due', getTodaysDueRepayments);
router.get('/overdue', getOverdueRepayments);
router.post('/', recordRepayment);
router.put('/:id/paid', markAsPaid);
router.put('/bulk/paid', markMultipleAsPaid);

module.exports = router;