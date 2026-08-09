const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderItemSchema = new Schema({
  menuItem: {
    type: Schema.Types.ObjectId,
    ref: 'Menu',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 1
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  customNotes: {
    type: String, // e.g., "No pickles"
  }
});

const orderSchema = new Schema({
  items: [orderItemSchema],
  orderNumber: {
    type: String,
    unique: true
  },
  totalPrice: {
    type: Number,
    required: true // Total in EGP
  },
  status: {
    type: String,
    enum: ['Pending', 'Prepping', 'Assembly', 'Ready', 'Delivered'],
    default: 'Pending'
  }
}, {
  timestamps: true,
  collection: 'orders'
});

module.exports = mongoose.model('Order', orderSchema);
