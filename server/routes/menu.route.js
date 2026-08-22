const express = require('express');
const router = express.Router();

const menuSchema = require('../models/Menu');
const inventorySchema = require('../models/Inventory');

// Helper to calculate recipe cost
const calculateItemCost = async (ingredients) => {
  if (!ingredients || ingredients.length === 0) return 0;
  let totalCost = 0;
  for (const ing of ingredients) {
    if (ing.inventoryItem) {
      const inv = await inventorySchema.findById(ing.inventoryItem);
      if (inv && inv.costPerUnit) {
        totalCost += inv.costPerUnit * (ing.quantityRequired || 1);
      }
    }
  }
  return totalCost;
};

// CREATE Menu Item
router.route('/create-menu').post(async (req, res, next) => {
  try {
    if (req.body.ingredients && req.body.ingredients.length > 0 && !req.body.costPrice) {
      req.body.costPrice = await calculateItemCost(req.body.ingredients);
    }

    const data = await menuSchema.create(req.body);
    if (req.io) {
      req.io.emit('menu_updated', data);
    }
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

// READ Menu Items (With optional Search & Category)
router.route('/').get((req, res, next) => {
  const searchQuery = req.query.search;
  const category = req.query.category;
  let filter = {};
  
  if (searchQuery) {
    filter.name = { $regex: searchQuery, $options: 'i' };
  }
  if (category && category !== 'All') {
    filter.category = category;
  }

  menuSchema.find(filter)
    .populate('ingredients.inventoryItem')
    .exec((error, data) => {
      if (error) {
        return next(error);
      } else {
        res.json(data);
      }
    });
});

// GET Single Menu Item
router.route('/edit-menu/:id').get((req, res, next) => {
  menuSchema.findById(req.params.id)
    .populate('ingredients.inventoryItem')
    .exec((error, data) => {
      if (error) {
        return next(error);
      } else {
        res.json(data);
      }
    });
});

// TOGGLE 86 / IN-STOCK STATUS (Feature 8)
router.route('/toggle-stock/:id').put(async (req, res, next) => {
  try {
    const item = await menuSchema.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Menu item not found' });
    
    item.inStock = !item.inStock;
    await item.save();

    if (req.io) {
      req.io.emit('menu_updated', item);
    }
    res.json(item);
  } catch (error) {
    next(error);
  }
});

// UPDATE Menu Item
router.route('/update-menu/:id').put(async (req, res, next) => {
  try {
    if (req.body.ingredients && req.body.ingredients.length > 0 && (!req.body.costPrice || req.body.costPrice === 0)) {
      req.body.costPrice = await calculateItemCost(req.body.ingredients);
    }

    const data = await menuSchema.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    ).populate('ingredients.inventoryItem');

    if (req.io) {
      req.io.emit('menu_updated', data);
    }
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// DELETE Menu Item
router.route('/delete-menu/:id').delete((req, res, next) => {
  menuSchema.findByIdAndRemove(req.params.id, (error, data) => {
    if (error) {
      return next(error);
    } else {
      if (req.io) {
        req.io.emit('menu_updated', { _id: req.params.id, deleted: true });
      }
      res.status(200).json({
        msg: data,
      });
    }
  });
});

module.exports = router;
