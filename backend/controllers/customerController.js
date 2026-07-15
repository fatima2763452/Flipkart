const Customer = require('../models/Customer');
const Entry = require('../models/Entry');
const Exit = require('../models/Exit');

const createCustomer = async (req, res) => {
  try {
    const { customerId, name, ownerId } = req.body;

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
      ownerId
    });

    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCustomers = async (req, res) => {
  try {
    const { ownerId } = req.query;
    if (!ownerId) {
      return res.status(400).json({ message: 'Owner ID is required' });
    }

    // Only get active (not soft-deleted) customers
    const customers = await Customer.find({ ownerId, isDeleted: { $ne: true } }).sort({ createdAt: -1 });
    res.json(customers);
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

    // Only get soft-deleted customers
    const customers = await Customer.find({ ownerId, isDeleted: true }).sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Soft delete (moves to Recycle Bin)
const softDeleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
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
    const customer = await Customer.findByIdAndUpdate(id, { isDeleted: false }, { new: true });
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
