const Orders = require('../../../models/orders.js');

const response = {
  SUCCESS: 'success',
  NO_ITEMS: 'no_items',
  NO_CHANGE: 'no_change',
  EXIT: 'exit',
  TIMEOUT: 'timeout',
  ERROR: 'error',
};

module.exports = async (user) => {
  let returnObj = {
    returnedEnum: null,
    orderArray: null,
  };

  const userOrders = await Orders.find({ d_id: user.d_id });
  const userOrdersArray = userOrders[0].aliasOrders;

  if (userOrdersArray.length == 0) {
    returnObj.returnedEnum = response.NO_ITEMS;
    return returnObj;
  }

  let orderArray = [
    { name: 'In Review', value: [] },
    { name: 'Needs Confirmation', value: [] },
    { name: 'Needs Shipping Method', value: [] },
    { name: 'Needs Shipping', value: [] },
    { name: 'Shipped', value: [] },
    { name: 'Received', value: [] },
    { name: 'Dropped Off', value: [] },
    { name: 'Has Issues', value: [] },
    { name: 'Open', value: [] },
  ];

  let reviewNum = 0;
  let confirmNum = 0;
  let needShipMethodNum = 0;
  let needShipNum = 0;
  let shippedNum = 0;
  let receivedNum = 0;
  let droppedNum = 0;
  let issuesNum = 0;
  let i = 0;

  userOrdersArray.forEach((order) => {
    let date = new Date(order.take_action_by);

    switch (convertStatus(order.status)) {
      case 'In Review':
        for (let obj of orderArray) {
          if (obj.name == 'In Review') {
            obj.value.push({
              number: order.number,
              string: `\t\t${reviewNum}. ${order.name} - ${order.size} $${order.price / 100}\n\t\t\tOrder number: ${
                order.number
              }\n`,
            });
            break;
          }
        }
        reviewNum++;
        break;
      case 'Needs Confirmation':
        for (let obj of orderArray) {
          if (obj.name == 'Needs Confirmation') {
            obj.value.push({
              number: order.number,
              string: `\t\t${confirmNum}. ${order.name} - ${order.size} $${order.price / 100}\n\t\t\tOrder number: ${
                order.number
              }\n\t\t\tConfirm by: ${date.getMonth() + 1}/${date.getDate()}\n`,
            });
            break;
          }
        }
        confirmNum++;
        break;
      case 'Needs Shipping Method':
        for (let obj of orderArray) {
          if (obj.name == 'Needs Shipping Method') {
            obj.value.push({
              number: order.number,
              string: `\t\t${needShipMethodNum}. ${order.name} - ${order.size} $${
                order.price / 100
              }\n\t\t\tOrder number: ${order.number}\n\t\t\tShip by: ${date.getMonth() + 1}/${date.getDate()}\n`,
            });
            break;
          }
        }
        needShipMethodNum++;
        break;
      case 'Needs Shipping':
        for (let obj of orderArray) {
          if (obj.name == 'Needs Shipping') {
            obj.value.push({
              number: order.number,
              string: `\t\t${needShipNum}. ${order.name} - ${order.size} $${order.price / 100}\n\t\t\tOrder number: ${
                order.number
              }\n\t\t\tShip by: ${date.getMonth() + 1}/${date.getDate()}\n`,
            });
            break;
          }
        }
        needShipNum++;
        break;
      case 'Shipped':
        for (let obj of orderArray) {
          if (obj.name == 'Shipped') {
            obj.value.push({
              number: order.number,
              string: `\t\t${shippedNum}. ${order.name} - ${order.size} $${order.price / 100}\n\t\t\tOrder number: ${
                order.number
              }\n\t\t\tUPS tracking number: ${order.tracking}\n`,
            });
            break;
          }
        }
        shippedNum++;
        break;
      case 'Dropped Off':
        for (let obj of orderArray) {
          if (obj.name == 'Dropped Off') {
            obj.value.push({
              number: order.number,
              string: `\t\t${droppedNum}. ${order.name} - ${order.size} $${order.price / 100}\n\t\t\tOrder number: ${
                order.number
              }\n`,
            });
            break;
          }
        }
        droppedNum++;
        break;
      case 'Received':
        for (let obj of orderArray) {
          if (obj.name == 'Received') {
            obj.value.push({
              number: order.number,
              string: `\t\t${receivedNum}. ${order.name} - ${order.size} $${order.price / 100}\n\t\t\tOrder number: ${
                order.number
              }\n`,
            });
            break;
          }
        }
        receivedNum++;
        break;
      case 'Has Issues':
        for (let obj of orderArray) {
          if (obj.name == 'Has Issues') {
            obj.value.push({
              number: order.number,
              string: `\t\t${issuesNum}. ${order.name} - ${order.size} $${order.price / 100}\n\t\t\tOrder number: ${
                order.number
              }\n`,
            });
            break;
          }
        }
        issuesNum++;
        break;
      default:
        for (let obj of orderArray) {
          if (obj.name == 'Open') {
            obj.value.push({
              number: order.number,
              string: `\t${i}. ${order.name} - ${order.size} $${order.price / 100}\n\t\tOrder number: ${
                order.number
              }\n`,
            });
            break;
          }
        }
        i++;
        console.log(`\nNew order status is '${order.status}'\n`);
        break;
    }
  });

  returnObj.returnedEnum = response.SUCCESS;
  returnObj.orderArray = orderArray;

  return returnObj;
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
