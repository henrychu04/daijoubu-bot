const generateReq = require('../../requests/generateReq.js');

let crntDate = new Date();
let day = crntDate.getDate();
let month = crntDate.getMonth() + 1;
let date = `${month}/${day}`;

module.exports = async (client, loginToken, user, aliasOrdersArray) => {
  let stringArray = [];
  let needShipping = [];

  aliasOrdersArray.aliasOrders.forEach((order) => {
    if (order.status == 'NEEDS_SHIPPING_METHOD') {
      needShipping.push(order);
    }
  });

  for (let order of needShipping) {
    let orderNum = order.number;

    try {
      let generateRes = await generateReq(client, loginToken, orderNum);

      if (generateRes != 200) {
        throw new Error('Error generating');
      }

      let orderShipDate = order.take_action_by;

      stringArray.push(
        `\t${stringArray.length}. ${order.name} - ${order.size} $${
          order.price / 100
        }\n\t\tOrder number: ${orderNum}\n\t\tShip by: ${orderShipDate}\n`
      );
    } catch (err) {
      console.log(err);

      if (stringArray.length != 0) {
        if (user.webhook.length != 0) {
          returnArray = buildArray(stringArray);

          if (err.message == 'Error generating') {
            returnArray.push({
              title: 'Order Shipping Label Generation',
              body: '```' + `Error generating a shipping label for order number ${orderNum}` + '```',
            });

            return returnArray;
          }
        }
      }
    }
  }

  if (needShipping.length != 0) {
    if (user.webhook.length != 0) {
      return buildArray(stringArray);
    }
  }
};

function buildArray(stringArray) {
  let combinedArray = [];
  let count = 0;

  for (let [index, crnt] of stringArray.entries()) {
    if (index % 15 == 0 && index != 0) {
      count++;
    }

    if (combinedArray[count] == undefined) {
      if (index == 0) {
        combinedArray[count] = `New alias Shipping Label(s) Generated - ${date}:\n${crnt}`;
      } else {
        combinedArray[count] = crnt;
      }
    } else {
      combinedArray[count] += crnt;
    }
  }

  let returnArray = [];

  for (let crnt of combinedArray) {
    returnArray.push({ title: 'Order Shipping Label Generation', body: '```' + crnt + '```' });
  }

  return returnArray;
}
