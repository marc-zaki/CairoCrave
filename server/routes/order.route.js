let express = require('express'),
  router = express.Router();

let orderSchema = require('../models/Order');

// CREATE Order (Used by POS Simulator)
router.route('/create-order').post(async (req, res, next) => {
  try {
    const count = await orderSchema.countDocuments();
    req.body.orderNumber = `CR${count + 1}`;
    
    orderSchema.create(req.body, (error, data) => {
      if (error) {
        return next(error);
      } else {
        // Emit socket event if req.io exists
        if (req.io) {
          req.io.emit('new_order', data);
        }
        res.json(data);
      }
    });
  } catch (error) {
    next(error);
  }
});

// READ Orders (Used by KDS and Order History)
router.route('/').get((req, res, next) => {
  orderSchema.find((error, data) => {
    if (error) {
      return next(error);
    } else {
      res.json(data);
    }
  });
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

// UPDATE Order Status (Used by KDS Kanban)
router.route('/update-order/:id').put((req, res, next) => {
  orderSchema.findByIdAndUpdate(
    req.params.id,
    {
      $set: req.body,
    },
    { new: true }, // Return updated document
    (error, data) => {
      if (error) {
        return next(error);
      } else {
        if (req.io) {
           req.io.emit('order_updated', data);
        }
        res.json(data);
      }
    }
  );
});

// DELETE Order
router.route('/delete-order/:id').delete((req, res, next) => {
  orderSchema.findByIdAndRemove(req.params.id, (error, data) => {
    if (error) {
      return next(error);
    } else {
      res.status(200).json({
        msg: data,
      });
    }
  });
});

module.exports = router;
