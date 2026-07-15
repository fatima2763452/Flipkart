const mongoose = require('mongoose');

const customerSchema = mongoose.Schema({
  customerId: { type: String, required: true },
  name: { type: String, required: true },
  ownerId: { type: String, required: true },
  status: { type: String, default: 'Active' },
  holdings: { type: String, default: '$0.00' },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Ensure a customer ID is unique per owner
customerSchema.index({ ownerId: 1, customerId: 1 }, { unique: true });

module.exports = mongoose.model('Customer', customerSchema);
