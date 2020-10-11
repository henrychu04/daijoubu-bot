const mongoose = require('mongoose');

const userScehma = mongoose.Schema({
  d_id: String,
  email: String,
  pw: String,
  login: String,
  settings: {
    orderRefresh: String,
    adjustListing: String,
  },
});

module.exports = mongoose.model('User', userScehma, 'users');
