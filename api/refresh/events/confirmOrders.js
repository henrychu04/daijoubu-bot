const confirmReq = require('../../requests/confirmReq.js');
const generateReq = require('../../requests/generateReq.js');

module.exports = async (client, loginToken, user, aliasOrdersArray) => {
  let stringArray = [];

  let crntDate = new Date();
  let day = crntDate.getDate();
  let month = crntDate.getMonth() + 1;
  let date = `${month}/${day}`;

  let needConfirmOrderArray = [];

  if (aliasOrdersArray.purchase_orders) {
    aliasOrdersArray.purchase_orders.forEach((order) => {
      if (order.status == 'NEEDS_CONFIRMATION') {
        needConfirmOrderArray.push(order);
      }
    });

    for (let order of needConfirmOrderArray) {
      let orderNum = order.number;

      try {
        let confirmRes = await confirmReq(client, loginToken, orderNum);

        if (confirmRes != 200) {
          throw new Error('Error confirming');
        }

        let generateRes = await generateReq(client, loginToken, orderNum);

        if (generateRes != 200) {
          throw new Error('Error generating');
        }

        stringArray.push(
          `\t${stringArray.length}. ${order.listing.product.name} - ${order.listing.size_option.name.toUpperCase()} $${
            order.listing.price_cents / 100
          }\n\t\tOrder number: ${orderNum}\n`
        );
      } catch (err) {
        console.log(err);

        if (stringArray.length != 0) {
          if (user.webhook.length != 0) {
            returnArray = buildArray(stringArray);

            if (err.message == 'Error confirming') {
              returnArray.push({
                title: 'Order Confirmations',
                body: '```' + `Error confirming order number ${orderNum}` + '```',
              });

              return returnArray;
            } else if (err.message == 'Error generating') {
              returnArray.push({
                title: 'Order Confirmations',
                body: '```' + `Error generating a shipping label for order number ${orderNum}` + '```',
              });

              return returnArray;
            }
          }
        }
      }
    }

    if (needConfirmOrderArray.length == 0) {
      if (user.settings.orderRefresh == 'daily') {
        if (user.webhook.length != 0) {
          return [
            {
              title: 'Order Confirmations',
              body: '```' + `alias Orders - ${date}:\n\tNo orders to confirm` + '```',
            },
          ];
        }
      }
    } else {
      if (user.webhook.length != 0) {
        return buildArray(stringArray);
      }
    }
  } else {
    if (user.settings.orderRefresh == 'daily') {
      if (user.webhook.length != 0) {
        return [
          {
            title: 'Order Confirmations',
            body: '```' + `alias Orders - ${date}:\n\tNo orders to confirm` + '```',
          },
        ];
      }
    }
  }
};

function buildArray(stringArray) {
  let combinedArray = [];
  let count = 0;

  for (let [index, crnt] of stringArray) {
    if (index % 15 == 0 && index != 0) {
      count++;
    }

    if (combinedArray[count] == undefined) {
      if (index == 0) {
        combinedArray[count] += `New alias Order(s) Confirmed - ${date}:\n${crnt}`;
      } else {
        combinedArray[count] += crnt;
      }
    } else {
      combinedArray[count] == crnt;
    }
  }

  let returnArray = [];

  for (let crnt of combinedArray) {
    returnArray.push({ title: 'Order Confirmations', body: '```' + crnt + '```' });
  }

  return returnArray;
}
