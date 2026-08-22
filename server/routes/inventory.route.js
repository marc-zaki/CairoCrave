const express = require('express');
const router = express.Router();

const inventorySchema = require('../models/Inventory');

// CREATE Inventory Item
router.route('/create-inventory').post(async (req, res, next) => {
  try {
    const data = await inventorySchema.create(req.body);
    if (req.io) req.io.emit('inventory_updated', data);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

// READ Inventory Items
router.route('/').get((req, res, next) => {
  inventorySchema.find((error, data) => {
    if (error) {
      return next(error);
    } else {
      res.json(data);
    }
  });
});

// GET Single Inventory Item
router.route('/edit-inventory/:id').get((req, res, next) => {
  inventorySchema.findById(req.params.id, (error, data) => {
    if (error) {
      return next(error);
    } else {
      res.json(data);
    }
  });
});

// UPDATE Inventory Item
router.route('/update-inventory/:id').put((req, res, next) => {
  inventorySchema.findByIdAndUpdate(
    req.params.id,
    {
      $set: req.body,
    },
    { new: true },
    (error, data) => {
      if (error) {
        return next(error);
      } else {
        if (req.io) req.io.emit('inventory_updated', data);
        res.json(data);
      }
    }
  );
});

// DELETE Inventory Item
router.route('/delete-inventory/:id').delete((req, res, next) => {
  inventorySchema.findByIdAndRemove(req.params.id, (error, data) => {
    if (error) {
      return next(error);
    } else {
      if (req.io) req.io.emit('inventory_updated', { _id: req.params.id, deleted: true });
      res.status(200).json({
        msg: data,
      });
    }
  });
});

module.exports = router;
