const mongoose = require('mongoose');

const userScehma = mongoose.Schema({
  d_id: String,
  aliasEmail: String,
  aliasPW: String,
  aliasLogin: String,
  goatEmail: String,
  goatPW: String,
  goatLogin: String,
  webhook: String,
  aliasCashoutAmount: Number,
  goatCashoutAmount: Number,
  settings: {
    orderRefresh: String,
    adjustListing: String,
    maxAdjust: Number,
    manualNotif: Boolean,
  },
});

module.exports = mongoose.model('User', userScehma, 'users');
