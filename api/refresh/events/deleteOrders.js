const Orders = require('../../../models/orders.js');

module.exports = async (user, userOrders, aliasOrders) => {
  let modified = false;

  for (let userOrder of userOrders.aliasOrders) {
    let deleted = true;

    if (aliasOrders.purchase_orders) {
      for (let aliasOrder of aliasOrders.purchase_orders) {
        if (aliasOrder.number == order.number) {
          deleted = false;
          break;
        }
      }
    }

    if (!deleted) {
      continue;
    }

    modified = true;

    await Orders.updateOne({ d_id: user.d_id }, { $pull: { aliasOrders: { number: userOrder.number } } }).catch((err) =>
      console.log(err)
    );
  }

  return modified;
};
