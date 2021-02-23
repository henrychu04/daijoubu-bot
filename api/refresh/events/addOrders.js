const Orders = require('../../../models/orders.js');

module.exports = async (user, userOrdersArray, aliasOrders) => {
  let newOrdersString = 'New Open Order(s):\n';
  let newOrderFound = false;
  let count = 0;

  if (aliasOrders.purchase_orders) {
    for (crnt of aliasOrders.purchase_orders) {
      let exist = false;

      for (let order of userOrdersArray) {
        if (order.number == crnt.number) {
          exist = true;
          break;
        }
      }

      if (exist) {
        continue;
      } else {
        newOrderFound = true;
      }

      let date = new Date(crnt.take_action_by);

      let newOrder = {
        number: crnt.number,
        status: crnt.status,
        take_action_by: `${date.getMonth() + 1}/${date.getDate()}`,
        size: parseFloat(crnt.listing.size),
        price: parseInt(crnt.listing.price_cents),
        name: crnt.listing.product.name,
        tracking: '',
      };

      newOrdersString += `\t${count}. ${newOrder.name} - ${newOrder.size} $${
        newOrder.price / 100
      }\n\t\tStatus: ${convertStatus(newOrder.status)}\n\t\tTake action by: ${newOrder.take_action_by}\n`;

      count++;

      await Orders.updateOne({ d_id: user.d_id }, { $push: { aliasOrders: newOrder } }).catch((err) =>
        console.log(err)
      );
    }
  }

  if (newOrderFound) {
    if (user.webhook != null) {
      return [{ title: 'Orders', body: '```' + newOrdersString + '```' }];
    }
  }
};
