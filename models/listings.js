const mongoose = require('mongoose');

const listingsSchema = mongoose.Schema({
  d_id: String,
  listings: [Object],
});

module.exports = mongoose.model('Listing', listingsSchema, 'listings');
