let express = require('express'),
  router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

let userSchema = require('../models/User');

// SIGNUP
router.route('/signup').post(async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;
    
    // Check if user already exists
    const existingUser = await userSchema.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    userSchema.create({ username, email, password: hashedPassword, role }, (error, data) => {
      if (error) {
        return next(error);
      } else {
        // Generate JWT
        const token = jwt.sign(
          { userId: data._id, role: data.role },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );
        res.status(201).json({ user: data, token });
      }
    });
  } catch (err) {
    next(err);
  }
});

// LOGIN
router.route('/login').post(async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await userSchema.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({ user, token });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
