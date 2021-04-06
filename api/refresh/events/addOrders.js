const moment = require('moment-timezone');

const Orders = require('../../../models/orders.js');

module.exports = async (user, userOrders, aliasOrders) => {
  let newOrderFound = false;
  let stringArray = [];

  if (aliasOrders.purchase_orders) {
    for (let aliasOrder of aliasOrders.purchase_orders) {
      let exist = false;

      for (let userOrder of userOrders.aliasOrders) {
        if (userOrder.number == aliasOrder.number) {
          exist = true;
          break;
        }
      }

      if (exist) {
        continue;
      }

      newOrderFound = true;

      let date = new Date(aliasOrder.take_action_by);

      let newOrder = {
        number: aliasOrder.number,
        status: aliasOrder.status,
        take_action_by: `${date.getMonth() + 1}/${date.getDate()}`,
        size: parseFloat(aliasOrder.listing.size),
        price: parseInt(aliasOrder.listing.price_cents),
        name: aliasOrder.listing.product.name,
        tracking: '',
      };

      stringArray.push(
        `\t${stringArray.length}. ${newOrder.name} - ${newOrder.size} $${
          newOrder.price / 100
        }\n\t\tStatus: ${convertStatus(newOrder.status)}\n\t\tTake action by: ${newOrder.take_action_by}\n`
      );

      await Orders.updateOne({ d_id: user.d_id }, { $push: { aliasOrders: newOrder } }).catch((err) =>
        console.log(err)
      );
    }
  }

  if (newOrderFound) {
    if (user.webhook.length != 0) {
      let combinedArray = [];
      let count = 0;

      for (let [index, crnt] of stringArray.entries()) {
        if (index % 15 == 0 && index != 0) {
          count++;
        }

        if (combinedArray[count] == undefined) {
          if (index == 0) {
            combinedArray[count] = 'New Open Order(s):\n' + crnt;
          } else {
            combinedArray[count] = crnt;
          }
        } else {
          combinedArray[count] += crnt;
        }
      }

      let returnArray = [];

      for (let crnt of combinedArray) {
        returnArray.push({ title: 'Orders', body: '```' + crnt + '```' });
      }

      return returnArray;
    }
  }
};

function convertStatus(status) {
  if (status == 'IN_REVIEW') {
    return 'In Review';
  } else if (status == 'NEEDS_CONFIRMATION') {
    return 'Needs Confirmation';
  } else if (status == 'NEEDS_SHIPPING_METHOD') {
    return 'Needs Shipping Method';
  } else if (status == 'NEEDS_SHIPPING') {
    return 'Needs Shipping';
  } else if (status == 'SHIPPED') {
    return 'Shipped';
  } else if (status == 'DROPPED_OFF') {
    return 'Dropped Off';
  } else if (status == 'RECEIVED') {
    return 'Received';
  } else if (status == 'HAS_ISSUES') {
    return 'Has Issues';
  } else {
    return status;
  }
}
