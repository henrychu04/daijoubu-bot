const mongoose = require('mongoose');

const ordersSchema = mongoose.Schema({
  d_id: String,
  orders: [Object],
});

module.exports = mongoose.model('Order', ordersSchema, 'orders');
