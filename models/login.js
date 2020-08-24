const mongoose = require('mongoose');

const loginSchema = mongoose.Schema({
  login: String,
});

module.exports = mongoose.model('Login', loginSchema, 'logins');
