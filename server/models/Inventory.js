const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const inventorySchema = new Schema({
  itemName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    required: true // e.g., "kg", "pcs"
  },
  threshold: {
    type: Number,
    required: true,
    default: 10 // Alert when quantity goes below this
  }
}, {
  timestamps: true,
  collection: 'inventory'
});

module.exports = mongoose.model('Inventory', inventorySchema);
