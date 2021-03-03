const aliasLogin = require('../requests/aliasLogin.js');
const check = require('./commands/check.js');
const match = require('./commands/match.js');
const mongoListings = require('./commands/mongoListings.js');
const deleteReq = require('./commands/delete.js');
const edit = require('./commands/edit.js');
const getOrders = require('./commands/getOrders.js');
const confirm = require('./commands/confirm.js');
const generate = require('./commands/generate.js');
const settings = require('./commands/settings.js');
const list = require('./commands/list.js');
const me = require('./commands/me.js');
const earnings = require('./commands/earnings.js');
const cancel = require('./commands/cancel.js');
const cashOut = require('./commands/cashOut.js');

module.exports = {
  aliasLogin,
  check,
  match,
  mongoListings,
  deleteReq,
  edit,
  getOrders,
  confirm,
  generate,
  settings,
  list,
  me,
  earnings,
  cancel,
  cashOut
};
