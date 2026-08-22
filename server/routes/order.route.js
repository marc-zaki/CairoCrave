const express = require('express');
const router = express.Router();

const orderSchema = require('../models/Order');
const menuSchema = require('../models/Menu');
const inventorySchema = require('../models/Inventory');

// CREATE Order (Used by POS Simulator)
router.route('/create-order').post(async (req, res, next) => {
  try {
    const count = await orderSchema.countDocuments();
    req.body.orderNumber = `CR${100 + count + 1}`;

    // Compute COGS and enrich items with stations/costs
    let totalCOGS = 0;
    if (req.body.items && req.body.items.length > 0) {
      for (let item of req.body.items) {
        if (item.menuItem) {
          const menuItem = await menuSchema.findById(item.menuItem);
          if (menuItem) {
            item.station = item.station || menuItem.station || 'General';
            item.costPrice = menuItem.costPrice || 0;
            totalCOGS += (menuItem.costPrice || 0) * (item.quantity || 1);
          }
        }
      }
    }
    req.body.costPrice = totalCOGS;

    const newOrder = await orderSchema.create(req.body);

    // Automatic Recipe & Inventory Deduction
    try {
      if (req.body.items && req.body.items.length > 0) {
        for (const item of req.body.items) {
          const menuItem = await menuSchema.findById(item.menuItem);
          if (menuItem && menuItem.ingredients && menuItem.ingredients.length > 0) {
            for (const ing of menuItem.ingredients) {
              if (ing.inventoryItem) {
                const deductAmount = (ing.quantityRequired || 1) * (item.quantity || 1);
                await inventorySchema.findByIdAndUpdate(ing.inventoryItem, {
                  $inc: { quantity: -deductAmount }
                });
              }
            }
          }
        }

        // Auto out-of-stock check (Auto-86ing) for all menu items
        const allMenuItems = await menuSchema.find().populate('ingredients.inventoryItem');
        let auto86Count = 0;
        for (const menu of allMenuItems) {
          if (menu.ingredients && menu.ingredients.length > 0) {
            let outOfStock = false;
            for (const ing of menu.ingredients) {
              if (ing.inventoryItem && ing.inventoryItem.quantity < (ing.quantityRequired || 1)) {
                outOfStock = true;
                break;
              }
            }
            if (outOfStock && menu.inStock) {
              await menuSchema.findByIdAndUpdate(menu._id, { inStock: false });
              auto86Count++;
            }
          }
        }
      }
    } catch (invErr) {
      console.error('Error deducting inventory:', invErr);
    }

    // Emit real-time socket events
    if (req.io) {
      req.io.emit('new_order', newOrder);
      req.io.emit('inventory_updated');
      if (newOrder.orderType === 'Dine-In') {
        req.io.emit('table_updated', { tableNumber: newOrder.tableNumber, order: newOrder });
      }
      if (newOrder.orderType === 'Delivery') {
        req.io.emit('delivery_updated', newOrder);
      }
    }

    res.status(201).json(newOrder);
  } catch (error) {
    next(error);
  }
});

// READ Orders (Used by KDS, Delivery, Tables, and Manager Analytics)
router.route('/').get((req, res, next) => {
  const filter = {};
  if (req.query.orderType) filter.orderType = req.query.orderType;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.tableNumber) filter.tableNumber = req.query.tableNumber;

  orderSchema.find(filter).sort({ createdAt: -1 }).exec((error, data) => {
    if (error) {
      return next(error);
    } else {
      res.json(data);
    }
  });
});

// GET Active Dine-In Orders for Table Floor Plan
router.route('/active-tables').get(async (req, res, next) => {
  try {
    const activeOrders = await orderSchema.find({
      orderType: 'Dine-In',
      status: { $ne: 'Delivered' }
    });
    res.json(activeOrders);
  } catch (err) {
    next(err);
  }
});

// GET Single Order
router.route('/edit-order/:id').get((req, res, next) => {
  orderSchema.findById(req.params.id, (error, data) => {
    if (error) {
      return next(error);
    } else {
      res.json(data);
    }
  });
});

// UPDATE Order Status (Used by KDS Kanban, Table Clear, etc.)
router.route('/update-order/:id').put((req, res, next) => {
  orderSchema.findByIdAndUpdate(
    req.params.id,
    {
      $set: req.body,
    },
    { new: true },
    (error, data) => {
      if (error) {
        return next(error);
      } else {
        if (req.io) {
          req.io.emit('order_updated', data);
          if (data.orderType === 'Dine-In') {
            req.io.emit('table_updated', { tableNumber: data.tableNumber, order: data });
          }
          if (data.orderType === 'Delivery') {
            req.io.emit('delivery_updated', data);
          }
        }
        res.json(data);
      }
    }
  );
});

// ASSIGN DRIVER & UPDATE DELIVERY DISPATCH (Feature 9)
router.route('/assign-driver/:id').put(async (req, res, next) => {
  try {
    const { driverName, driverPhone, status, dispatchedAt, deliveredAt } = req.body;
    const updatePayload = {
      'deliveryInfo.driverName': driverName,
      'deliveryInfo.driverPhone': driverPhone
    };
    if (status) updatePayload.status = status;
    if (dispatchedAt) updatePayload['deliveryInfo.dispatchedAt'] = dispatchedAt;
    if (deliveredAt) updatePayload['deliveryInfo.deliveredAt'] = deliveredAt;

    const updated = await orderSchema.findByIdAndUpdate(
      req.params.id,
      { $set: updatePayload },
      { new: true }
    );

    if (req.io) {
      req.io.emit('order_updated', updated);
      req.io.emit('delivery_updated', updated);
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE Order
router.route('/delete-order/:id').delete((req, res, next) => {
  orderSchema.findByIdAndRemove(req.params.id, (error, data) => {
    if (error) {
      return next(error);
    } else {
      if (req.io) {
        req.io.emit('order_updated', { _id: req.params.id, deleted: true });
        req.io.emit('table_updated');
      }
      res.status(200).json({
        msg: data,
      });
    }
  });
});

module.exports = router;
