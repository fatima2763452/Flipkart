const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Simple plain text password co
// mparison
userSchema.methods.matchPassword = async function(enteredPassword) {
  return enteredPassword === this.password;
};

module.exports = mongoose.model('User', userSchema);
