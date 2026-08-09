const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const menuSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true // Price in EGP
  },
  inStock: {
    type: Boolean,
    default: true
  },
  description: {
    type: String
  }
}, {
  timestamps: true,
  collection: 'menus'
});

module.exports = mongoose.model('Menu', menuSchema);
