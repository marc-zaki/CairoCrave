let express = require('express'),
  router = express.Router();

let menuSchema = require('../models/Menu');

// CREATE Menu Item
router.route('/create-menu').post((req, res, next) => {
  menuSchema.create(req.body, (error, data) => {
    if (error) {
      return next(error);
    } else {
      res.json(data);
    }
  });
});

// READ Menu Items (With optional Search Engine for Bonus)
router.route('/').get((req, res, next) => {
  const searchQuery = req.query.search;
  let filter = {};
  
  if (searchQuery) {
    filter = { name: { $regex: searchQuery, $options: 'i' } };
  }

  menuSchema.find(filter, (error, data) => {
    if (error) {
      return next(error);
    } else {
      res.json(data);
    }
  });
});

// GET Single Menu Item
router.route('/edit-menu/:id').get((req, res, next) => {
  menuSchema.findById(req.params.id, (error, data) => {
    if (error) {
      return next(error);
    } else {
      res.json(data);
    }
  });
});

// UPDATE Menu Item
router.route('/update-menu/:id').put((req, res, next) => {
  menuSchema.findByIdAndUpdate(
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

// DELETE Menu Item
router.route('/delete-menu/:id').delete((req, res, next) => {
  menuSchema.findByIdAndRemove(req.params.id, (error, data) => {
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
