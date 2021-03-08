const Orders = require('../../../models/orders.js');

module.exports = async (user, userOrdersArray, aliasOrders) => {
  let modified = false;

  for (let i = 0; i < userOrdersArray.length; i++) {
    let crnt = userOrdersArray[i];
    let deleted = true;

    if (aliasOrders.purchase_orders) {
      aliasOrders.purchase_orders.forEach((order) => {
        if (crnt.number == order.number) {
          deleted = false;
        }
      });
    }

    if (!deleted) {
      continue;
    }

    modified = true;

    await Orders.updateOne({ d_id: user.d_id }, { $pull: { aliasOrders: { number: crnt.number } } }).catch((err) =>
      console.log(err)
    );
  }

  return modified;
};
