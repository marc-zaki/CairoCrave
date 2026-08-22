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
  costPrice: {
    type: Number,
    default: 0 // Item unit cost at time of order for accurate historical COGS
  },
  station: {
    type: String,
    default: 'General'
  },
  customNotes: {
    type: String, // e.g., "No pickles, Extra spicy"
    default: ''
  }
});

const orderSchema = new Schema({
  items: [orderItemSchema],
  orderNumber: {
    type: String,
    unique: true
  },
  subtotal: {
    type: Number,
    default: 0
  },
  deliveryFee: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  totalPrice: {
    type: Number,
    required: true // Final Total in EGP
  },
  costPrice: {
    type: Number,
    default: 0 // Total COGS for order
  },
  orderType: {
    type: String,
    enum: ['Dine-In', 'Takeaway', 'Delivery'],
    default: 'Dine-In'
  },
  tableNumber: {
    type: String,
    default: '' // e.g. "T1", "T2", "VIP-1"
  },
  customerInfo: {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    notes: { type: String, default: '' }
  },
  deliveryInfo: {
    zone: { type: String, default: '' },
    driverName: { type: String, default: '' },
    driverPhone: { type: String, default: '' },
    dispatchedAt: { type: Date },
    deliveredAt: { type: Date }
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Credit Card', 'Mobile Wallet'],
    default: 'Cash'
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Unpaid'],
    default: 'Paid'
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
