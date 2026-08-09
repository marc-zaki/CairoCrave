let express = require('express'),
  router = express.Router();
const bcrypt = require('bcrypt');
let userSchema = require('../models/User');

// CREATE User
router.route('/create-user').post(async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;
    
    // Hash password before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    userSchema.create({ username, email, password: hashedPassword, role }, (error, data) => {
      if (error) {
        return next(error);
      } else {
        res.json(data);
      }
    });
  } catch (err) {
    next(err);
  }
});

// READ Users
router.route('/').get((req, res, next) => {
  userSchema.find((error, data) => {
    if (error) {
      return next(error);
    } else {
      res.json(data);
    }
  });
});

// GET Single User
router.route('/edit-user/:id').get((req, res, next) => {
  userSchema.findById(req.params.id, (error, data) => {
    if (error) {
      return next(error);
    } else {
      res.json(data);
    }
  });
});

// UPDATE User
router.route('/update-user/:id').put((req, res, next) => {
  userSchema.findByIdAndUpdate(
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

// DELETE User
router.route('/delete-user/:id').delete((req, res, next) => {
  userSchema.findByIdAndRemove(req.params.id, (error, data) => {
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
