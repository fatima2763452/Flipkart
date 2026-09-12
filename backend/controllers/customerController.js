const Customer = require('../models/Customer');
const Entry = require('../models/Entry');
const Exit = require('../models/Exit');

const createCustomer = async (req, res) => {
  try {
    const { customerId, name, ownerId, mobileLast4 } = req.body;

    if (!customerId || !name || !ownerId) {
      return res.status(400).json({ message: 'Please provide customer ID, name, and owner ID' });
    }

    const customerExists = await Customer.findOne({ customerId, ownerId });
    if (customerExists) {
      if (customerExists.isDeleted) {
        return res.status(400).json({ message: 'Customer with this ID already exists in Recycle Bin. Please restore them or delete permanently first.' });
      }
      return res.status(400).json({ message: 'Customer with this ID already exists' });
    }

    const customer = await Customer.create({
      customerId,
      name,
      ownerId,
      mobileLast4: mobileLast4 || ''
    });

    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCustomerPnlHelper = async (mongoId) => {
  try {
    const entries = await Entry.find({ customerId: mongoId }).lean();
    const exits = await Exit.find({ customerId: mongoId }).lean();

    const holdingsMap = {};
    entries.forEach(trade => {
      if (!holdingsMap[trade.symbol]) {
        holdingsMap[trade.symbol] = {
          symbol: trade.symbol,
          totalBuyQty: 0,
          totalBuyCost: 0,
          totalSellQty: 0,
          totalSellCost: 0,
          totalBrokerage: 0,
          lastPrice: 0
        };
      }
      const h = holdingsMap[trade.symbol];
      h.lastPrice = trade.ltp || trade.price;
      if (trade.customUpnl !== undefined) h.customUpnl = trade.customUpnl;
      h.totalBrokerage += (trade.brokerageFee || 0);

      if (trade.action === 'buy') {
        h.totalBuyQty += trade.quantity;
        h.totalBuyCost += (trade.quantity * trade.price);
      } else if (trade.action === 'sell') {
        h.totalSellQty += trade.quantity;
        h.totalSellCost += (trade.quantity * trade.price);
      }
    });

    let totalHoldingsPnl = 0;
    Object.values(holdingsMap).forEach(h => {
      const netQty = h.totalBuyQty - h.totalSellQty;
      if (Math.abs(netQty) < 0.0001) return;
      const absoluteQty = Math.abs(netQty);
      const isBuy = netQty > 0;
      const avgCost = isBuy ? (h.totalBuyQty > 0 ? h.totalBuyCost / h.totalBuyQty : 0) : (h.totalSellQty > 0 ? h.totalSellCost / h.totalSellQty : 0);

      let upnl = 0;
      if (isBuy) {
        upnl = (h.lastPrice - avgCost) * absoluteQty;
      } else {
        upnl = (avgCost - h.lastPrice) * absoluteQty;
      }
      upnl -= h.totalBrokerage;
      totalHoldingsPnl += (h.customUpnl !== undefined ? h.customUpnl : upnl);
    });

    const totalRealizedPnl = exits.reduce((sum, exit) => sum + (exit.realizedPnl || 0), 0);
    return totalHoldingsPnl + totalRealizedPnl;
  } catch (err) {
    console.error('Error calculating customer PnL:', err);
    return 0;
  }
};

const getCustomers = async (req, res) => {
  try {
    const { ownerId } = req.query;
    if (!ownerId) {
      return res.status(400).json({ message: 'Owner ID is required' });
    }

    // Only get active (not soft-deleted) customers matching ownerId or legacy default 'owner_id'
    const customers = await Customer.find({
      $or: [
        { ownerId: ownerId },
        { ownerId: 'owner_id' }
      ],
      isDeleted: { $ne: true }
    }).sort({ createdAt: -1 });

    const customersWithPnl = await Promise.all(
      customers.map(async (cust) => {
        const custObj = cust.toObject();
        custObj.totalPnl = await getCustomerPnlHelper(cust._id.toString());
        return custObj;
      })
    );

    res.json(customersWithPnl);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getDeletedCustomers = async (req, res) => {
  try {
    const { ownerId } = req.query;
    if (!ownerId) {
      return res.status(400).json({ message: 'Owner ID is required' });
    }

    // Only get soft-deleted customers matching ownerId or legacy default 'owner_id'
    const customers = await Customer.find({
      $or: [
        { ownerId: ownerId },
        { ownerId: 'owner_id' }
      ],
      isDeleted: true
    }).sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Soft delete (moves to Recycle Bin)
const softDeleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByIdAndUpdate(id, { isDeleted: true }, { returnDocument: 'after' });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json({ message: 'Customer moved to Recycle Bin successfully', customer });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Restore from Recycle Bin
const restoreCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByIdAndUpdate(id, { isDeleted: false }, { returnDocument: 'after' });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json({ message: 'Customer restored successfully', customer });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Permanent delete (deletes customer + all related entries/exits)
const permanentDeleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Find the customer first to get their customerId string
    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const { customerId } = customer;

    // 2. Delete all Entries and Exits linked to this customerId
    await Entry.deleteMany({ customerId });
    await Exit.deleteMany({ customerId });

    // 3. Delete the customer document
    await Customer.findByIdAndDelete(id);

    res.json({ message: 'Customer and all associated data deleted permanently' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createCustomer,
  getCustomers,
  getDeletedCustomers,
  softDeleteCustomer,
  restoreCustomer,
  permanentDeleteCustomer
};
