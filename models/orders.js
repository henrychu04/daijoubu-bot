const mongoose = require('mongoose');

const ordersSchema = mongoose.Schema({
  d_id: String,
  aliasOrders: [Object],
  goatOrders: [Object],
});

module.exports = mongoose.model('Order', ordersSchema, 'orders');
