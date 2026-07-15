const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d',
  });
};

const authUser = async (req, res) => {
  const { username, password } = req.body;

  // Mock mode when no DB is connected
  if (!process.env.MONGO_URI) {
    if (username === 'admin' && password === 'admin') {
      return res.json({
        _id: 'mock_id',
        username: 'admin',
        token: generateToken('mock_id'),
      });
    } else {
      return res.status(401).json({ message: 'Invalid username or password (Mock Mode: try admin/admin)' });
    }
  }

  // Real DB mode
  try {
    const user = await User.findOne({ username });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        username: user.username,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { authUser };
