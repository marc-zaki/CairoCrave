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
  costPrice: {
    type: Number,
    default: 0 // Ingredient / COGS cost price for margin analysis
  },
  station: {
    type: String,
    enum: ['Grill', 'Fryer', 'Salad/Sides', 'Beverages', 'Assembly', 'General'],
    default: 'General'
  },
  inStock: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    default: ''
  },
  ingredients: [
    {
      inventoryItem: {
        type: Schema.Types.ObjectId,
        ref: 'Inventory'
      },
      quantityRequired: {
        type: Number,
        default: 1
      }
    }
  ]
}, {
  timestamps: true,
  collection: 'menus'
});

module.exports = mongoose.model('Menu', menuSchema);
