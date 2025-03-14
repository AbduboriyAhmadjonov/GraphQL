const express = require('express');

const authController = require('../controllers/auth.controller');
const User = require('../models/user.model');

const { body } = require('express-validator');

const router = express.Router();

router.put(
  '/signup',
  [
    body('email')
      .trim()
      .isEmail()
      .normalizeEmail() // { gmail_lowercase: false }
      .withMessage('Please enter a valid email')
      .custom((value, { req }) => {
        return User.findOne({ email: value }).then((userDoc) => {
          if (userDoc) {
            return Promise.reject('E-mail address already exists!');
          }
        });
      }),
    body('password').trim().isLength({ min: 5 }),
    body('name').trim().notEmpty(),
  ],
  authController.signup
);

router.post('/login', authController.login);

module.exports = router;
