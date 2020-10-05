const mongoose = require('mongoose');

const loginSchema = mongoose.Schema({
  d_id: String,
  email: String,
  pw: String,
  login: String,
});

module.exports = mongoose.model('Login', loginSchema, 'logins');
