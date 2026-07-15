const express = require('express');
const { createTrade, getCustomerHoldings, getWeeklyRecords, deleteHolding, editHolding, deleteExit, editTrade, bulkDeleteEntries, bulkDeleteExits } = require('../controllers/tradeController');
const router = express.Router();

router.post('/', createTrade);
router.put('/edit/:id', editTrade);
router.get('/holdings/:customerId', getCustomerHoldings);
router.get('/weekly/:customerId', getWeeklyRecords);
router.delete('/holdings/:customerId/:symbol', deleteHolding);
router.put('/holdings/edit/:customerId/:symbol', editHolding);
router.delete('/weekly/:id', deleteExit);
router.post('/holdings/bulk-delete', bulkDeleteEntries);
router.post('/weekly/bulk-delete', bulkDeleteExits);

module.exports = router;
