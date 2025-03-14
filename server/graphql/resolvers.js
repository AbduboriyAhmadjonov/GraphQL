const bcrypt = require('bcryptjs');

const User = require('../models/user.model');

module.exports = {
  createUser: async function ({ userInput }, req) {
    const existingUser = await User.findOne({ email: userInput.email });

    if (existingUser) {
      const error = new Error('User exists already!');
      throw error;
    }

    const hashedPassword = await bcrypt.hash(userInput.password, 12);
    const user = new User({
      email: userInput.email,
      name: userInput.name,
      password: hashedPassword,
    });
    return {
      ...createdUser._doc,
      _id: somethingIAddLater,
    };
  },
};
