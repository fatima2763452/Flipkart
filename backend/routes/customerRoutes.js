const express = require('express');
const { 
  createCustomer, 
  getCustomers, 
  getDeletedCustomers,
  softDeleteCustomer, 
  restoreCustomer, 
  permanentDeleteCustomer 
} = require('../controllers/customerController');
const router = express.Router();

router.post('/', createCustomer);
router.get('/', getCustomers);
router.get('/deleted', getDeletedCustomers);
router.delete('/:id', softDeleteCustomer);
router.put('/:id/restore', restoreCustomer);
router.delete('/:id/permanent', permanentDeleteCustomer);

module.exports = router;
