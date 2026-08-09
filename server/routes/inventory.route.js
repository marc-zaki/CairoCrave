let express = require('express'),
  router = express.Router();

let inventorySchema = require('../models/Inventory');

// CREATE Inventory Item
router.route('/create-inventory').post((req, res, next) => {
  inventorySchema.create(req.body, (error, data) => {
    if (error) {
      return next(error);
    } else {
      res.json(data);
    }
  });
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
    (error, data) => {
      if (error) {
        return next(error);
      } else {
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
      res.status(200).json({
        msg: data,
      });
    }
  });
});

module.exports = router;
