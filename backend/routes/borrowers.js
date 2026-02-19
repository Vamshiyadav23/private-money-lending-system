const express = require('express');
const router = express.Router();
const {
  getAllBorrowers,
  getBorrower,
  getBorrowerDetails,
  createBorrower,
  updateBorrower,
  deleteBorrower
} = require('../controllers/borrowerController');

router.get('/', getAllBorrowers);
router.get('/:id', getBorrower);
router.get('/:id/details', getBorrowerDetails);
router.post('/', createBorrower);
router.put('/:id', updateBorrower);
router.delete('/:id', deleteBorrower);

module.exports = router;