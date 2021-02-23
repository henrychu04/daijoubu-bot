const mongoose = require('mongoose');

const listingsSchema = mongoose.Schema({
  d_id: String,
  aliasListings: [Object],
  goatListings: [Object],
});

module.exports = mongoose.model('Listing', listingsSchema, 'listings');
