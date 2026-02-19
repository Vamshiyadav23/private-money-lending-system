const express = require('express');
const router = express.Router();
const {
  getAllLoans,
  getLoanDetails,
  createLoan,
  updateLoanStatus
} = require('../controllers/loanController');

router.get('/', getAllLoans);
router.get('/:id', getLoanDetails);
router.post('/', createLoan);
router.put('/:id/status', updateLoanStatus);

module.exports = router;