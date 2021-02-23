const Orders = require('../../../models/orders.js');

module.exports = async (aliasOrders, userOrdersArray) => {
  let changed = false;
  let changedString = 'Updated Order(s):\n';
  let k = 0;

  for (let i = 0; i < userOrdersArray.length; i++) {
    if (aliasOrders.purchase_orders) {
      for (let j = 0; j < aliasOrders.purchase_orders.length; j++) {
        let crnt = userOrdersArray[i];

        if (crnt.number == aliasOrders.purchase_orders[j].number) {
          let statusChange = false;
          let dateChange = false;
          let oldStatus = '';

          if (crnt.status != aliasOrders.purchase_orders[j].status) {
            changed = true;
            statusChange = true;
            oldStatus = crnt.status;
            crnt.status = aliasOrders.purchase_orders[j].status;
          }

          let newParsedDate = new Date(aliasOrders.purchase_orders[j].take_action_by);
          let oldDate = '';

          if (crnt.take_action_by != `${newParsedDate.getMonth() + 1}/${newParsedDate.getDate()}`) {
            changed = true;
            dateChange = true;
            oldDate = crnt.take_action_by;
            crnt.take_action_by = `${newParsedDate.getMonth() + 1}/${newParsedDate.getDate()}`;
          }

          if (statusChange && dateChange) {
            if (crnt.status == 'SHIPPED') {
              crnt.tracking = aliasOrders.purchase_orders[j].shipping_info.tracking_code;

              changedString += `\t${k}. ${crnt.name} - ${crnt.size} $${crnt.price / 100}\n\t\tStatus: ${convertStatus(
                oldStatus
              )} => ${convertStatus(crnt.status)}\n\t\tUPS tracking number: ${crnt.tracking}\n`;
            } else if (crnt.status == 'NEEDS_CONFIRMATION') {
              changedString += `\t${k}. ${crnt.name} - ${crnt.size} $${crnt.price / 100}\n\t\tStatus: ${convertStatus(
                oldStatus
              )} => ${convertStatus(crnt.status)}\n\t\tTake action by: ${oldDate} => ${crnt.take_action_by}\n`;
            } else if (crnt.status == 'NEEDS_SHIPPING') {
              changedString += `\t${k}. ${crnt.name} - ${crnt.size} $${crnt.price / 100}\n\t\tStatus: ${convertStatus(
                oldStatus
              )} => ${convertStatus(crnt.status)}\n\t\tTake action by: ${oldDate} => ${crnt.take_action_by}\n`;
            } else {
              changedString += `\t${k}. ${crnt.name} - ${crnt.size} $${crnt.price / 100}\n\t\tStatus: ${convertStatus(
                oldStatus
              )} => ${convertStatus(crnt.status)}\n`;
            }
            k++;
          } else if (statusChange) {
            if (crnt.status == 'SHIPPED') {
              crnt.tracking = aliasOrders.purchase_orders[j].shipping_info.tracking_code;

              changedString += `\t${k}. ${crnt.name} - ${crnt.size} $${crnt.price / 100}\n\t\tStatus: ${convertStatus(
                oldStatus
              )} => ${convertStatus(crnt.status)}\n\t\tUPS tracking number: ${crnt.tracking}\n`;
            } else if (crnt.status == 'NEEDS_CONFIRMATION') {
              changedString += `\t${k}. ${crnt.name} - ${crnt.size} $${crnt.price / 100}\n\t\tStatus: ${convertStatus(
                oldStatus
              )} => ${convertStatus(crnt.status)}\n\t\tTake action by: ${crnt.take_action_by}\n`;
            } else if (crnt.status == 'NEEDS_SHIPPING') {
              changedString += `\t${k}. ${crnt.name} - ${crnt.size} $${crnt.price / 100}\n\t\tStatus: ${convertStatus(
                oldStatus
              )} => ${convertStatus(crnt.status)}\n\t\tTake action by: ${crnt.take_action_by}\n`;
            } else {
              changedString += `\t${k}. ${crnt.name} - ${crnt.size} $${crnt.price / 100}\n\t\tStatus: ${convertStatus(
                oldStatus
              )} => ${convertStatus(crnt.status)}\n`;
            }
            k++;
          } else if (dateChange) {
            if (crnt.status == 'SHIPPED') {
              crnt.tracking = aliasOrders.purchase_orders[j].shipping_info.tracking_code;

              changedString += `\t${k}. ${crnt.name} - ${crnt.size} $${crnt.price / 100}\n\t\tStatus: ${convertStatus(
                crnt.status
              )}\n\t\tUPS tracking number: ${crnt.tracking}\n`;
            } else if (crnt.status == 'NEEDS_CONFIRMATION') {
              changedString += `\t${k}. ${crnt.name} - ${crnt.size} $${crnt.price / 100}\n\t\tStatus: ${convertStatus(
                crnt.status
              )}\n\t\tTake action by: ${oldDate} => ${crnt.take_action_by}\n`;
            } else if (crnt.status == 'NEEDS_SHIPPING') {
              changedString += `\t${k}. ${crnt.name} - ${crnt.size} $${crnt.price / 100}\n\t\tStatus: ${convertStatus(
                crnt.status
              )}\n\t\tTake action by: ${oldDate} => ${crnt.take_action_by}\n`;
            } else {
              changedString += `\t${k}. ${crnt.name} - ${crnt.size} $${crnt.price / 100}\n\t\tStatus: ${convertStatus(
                crnt.status
              )}\n`;
            }
            k++;
          }

          if (changed) {
            await Orders.updateOne(
              { 'aliasOrders.number': crnt.number },
              {
                $set: {
                  'aliasOrders.$': crnt,
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
    return [{ title: 'Orders', body: '```' + changedString + '```' }];
  }
};
