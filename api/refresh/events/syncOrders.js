const moment = require('moment-timezone');

const Orders = require('../../../models/orders.js');

module.exports = async (user, userOrders, aliasOrders) => {
  let changed = false;
  let changedString = 'Updated Order(s):\n';
  let k = 0;

  for (let userOrder of userOrders.aliasOrders) {
    if (aliasOrders.purchase_orders) {
      for (let aliasOrder of aliasOrders.purchase_orders) {
        if (userOrder.number == aliasOrder.number) {
          let statusChange = false;
          let dateChange = false;
          let oldStatus = '';

          if (userOrder.status != aliasOrder.status) {
            changed = true;
            statusChange = true;
            oldStatus = userOrder.status;
            userOrder.status = aliasOrder.status;
          }

          let newMoment = moment.utc(aliasOrder.take_action_by).tz('America/New_York');

          if (userOrder.take_action_by != `${newMoment.month() + 1}/${newMoment.date()}`) {
            changed = true;
            dateChange = true;
            oldDate = userOrder.take_action_by;
            userOrder.take_action_by = `${newMoment.month() + 1}/${newMoment.date()}`;
          }

          if (statusChange && dateChange) {
            if (userOrder.status == 'SHIPPED') {
              userOrder.tracking = aliasOrder.shipping_info.tracking_code;

              changedString += `\t${k}. ${userOrder.name} - ${userOrder.size} $${
                userOrder.price / 100
              }\n\t\tStatus: ${convertStatus(oldStatus)} => ${convertStatus(
                userOrder.status
              )}\n\t\tUPS tracking number: ${userOrder.tracking}\n`;
            } else if (userOrder.status == 'NEEDS_CONFIRMATION') {
              changedString += `\t${k}. ${userOrder.name} - ${userOrder.size} $${
                userOrder.price / 100
              }\n\t\tStatus: ${convertStatus(oldStatus)} => ${convertStatus(
                userOrder.status
              )}\n\t\tTake action by: ${oldDate} => ${userOrder.take_action_by}\n`;
            } else if (userOrder.status == 'NEEDS_SHIPPING') {
              userOrder.tracking = aliasOrder?.shipping_info?.tracking_code;

              changedString += `\t${k}. ${userOrder.name} - ${userOrder.size} $${
                userOrder.price / 100
              }\n\t\tStatus: ${convertStatus(oldStatus)} => ${convertStatus(
                userOrder.status
              )}\n\t\tTake action by: ${oldDate} => ${userOrder.take_action_by}\n`;
            } else {
              changedString += `\t${k}. ${userOrder.name} - ${userOrder.size} $${
                userOrder.price / 100
              }\n\t\tStatus: ${convertStatus(oldStatus)} => ${convertStatus(userOrder.status)}\n`;
            }
            k++;
          } else if (statusChange) {
            if (userOrder.status == 'SHIPPED') {
              userOrder.tracking = aliasOrder.shipping_info.tracking_code;

              changedString += `\t${k}. ${userOrder.name} - ${userOrder.size} $${
                userOrder.price / 100
              }\n\t\tStatus: ${convertStatus(oldStatus)} => ${convertStatus(
                userOrder.status
              )}\n\t\tUPS tracking number: ${userOrder.tracking}\n`;
            } else if (userOrder.status == 'NEEDS_CONFIRMATION') {
              changedString += `\t${k}. ${userOrder.name} - ${userOrder.size} $${
                userOrder.price / 100
              }\n\t\tStatus: ${convertStatus(oldStatus)} => ${convertStatus(userOrder.status)}\n\t\tTake action by: ${
                userOrder.take_action_by
              }\n`;
            } else if (userOrder.status == 'NEEDS_SHIPPING') {
              userOrder.tracking = aliasOrder?.shipping_info?.tracking_code;

              changedString += `\t${k}. ${userOrder.name} - ${userOrder.size} $${
                userOrder.price / 100
              }\n\t\tStatus: ${convertStatus(oldStatus)} => ${convertStatus(userOrder.status)}\n\t\tTake action by: ${
                userOrder.take_action_by
              }\n`;
            } else {
              changedString += `\t${k}. ${userOrder.name} - ${userOrder.size} $${
                userOrder.price / 100
              }\n\t\tStatus: ${convertStatus(oldStatus)} => ${convertStatus(userOrder.status)}\n`;
            }
            k++;
          } else if (dateChange) {
            if (userOrder.status == 'SHIPPED') {
              userOrder.tracking = aliasOrder.shipping_info.tracking_code;

              changedString += `\t${k}. ${userOrder.name} - ${userOrder.size} $${
                userOrder.price / 100
              }\n\t\tStatus: ${convertStatus(userOrder.status)}\n\t\tUPS tracking number: ${userOrder.tracking}\n`;
            } else if (userOrder.status == 'NEEDS_CONFIRMATION') {
              changedString += `\t${k}. ${userOrder.name} - ${userOrder.size} $${
                userOrder.price / 100
              }\n\t\tStatus: ${convertStatus(userOrder.status)}\n\t\tTake action by: ${oldDate} => ${
                userOrder.take_action_by
              }\n`;
            } else if (userOrder.status == 'NEEDS_SHIPPING') {
              userOrder.tracking = aliasOrder?.shipping_info?.tracking_code;

              changedString += `\t${k}. ${userOrder.name} - ${userOrder.size} $${
                userOrder.price / 100
              }\n\t\tStatus: ${convertStatus(userOrder.status)}\n\t\tTake action by: ${oldDate} => ${
                userOrder.take_action_by
              }\n`;
            } else {
              changedString += `\t${k}. ${userOrder.name} - ${userOrder.size} $${
                userOrder.price / 100
              }\n\t\tStatus: ${convertStatus(userOrder.status)}\n`;
            }
            k++;
          }

          if (changed) {
            await Orders.updateOne(
              { 'aliasOrders.number': userOrder.number },
              {
                $set: {
                  'aliasOrders.$': userOrder,
                },
              }
            ).catch((err) => console.log(err));
          }
          break;
        }
      }
    }
  }

  if (changed) {
    if (user.webhook.length != 0) {
      return [{ title: 'Orders', body: '```' + changedString + '```' }];
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
