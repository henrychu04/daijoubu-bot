const confirmReq = require('../../requests/confirmReq.js');
const generateReq = require('../../requests/generateReq.js');

module.exports = async (client, loginToken, user, aliasOrdersArray) => {
  let confirmed = 0;
  let orderNum = 0;
  let returnString = '';

  let crnt = new Date();
  let day = crnt.getDate();
  let month = crnt.getMonth() + 1;
  let date = `${month}/${day}`;

  let orders = [];

  if (aliasOrdersArray.purchase_orders) {
    aliasOrdersArray.purchase_orders.forEach((order) => {
      if (order.status == 'NEEDS_CONFIRMATION') {
        orders.push(order);
      }
    });

    for (let order of orders) {
      orderNum = order.number;

      try {
        let confirmRes = await confirmReq(client, loginToken, orderNum);

        if (confirmRes != 200) {
          throw new Error('Error confirming');
        }

        let generateRes = await generateReq(client, loginToken, orderNum);

        if (generateRes != 200) {
          throw new Error('Error generating');
        }

        returnString += `\t${confirmed}. ${
          order.listing.product.name
        } - ${order.listing.size_option.name.toUpperCase()} $${
          order.listing.price_cents / 100
        }\n\t\tOrder number: ${orderNum}\n`;

        confirmed++;
      } catch (err) {
        console.log(err);

        if (confirmed != 0) {
          if (user.webhook.length != 0) {
            if (err.message == 'Error confirming') {
              return [
                { title: 'Order Confirmations', body: '```alias Orders - ' + date + '\n' + returnString + '```' },
                { title: 'Order Confirmations', body: '```' + `Error confirming order number ${orderNum}` + '```' },
              ];
            } else if (err.message == 'Error generating') {
              return [
                { title: 'Order Confirmations', body: '```alias Orders - ' + date + '\n' + returnString + '```' },
                {
                  title: 'Order Confirmations',
                  body: '```' + `Error generating a shipping label for order number ${orderNum}` + '```',
                },
              ];
            }
          }
        }
      }
    }

    if (orders.length == 0) {
      if (user.settings.orderRefresh == 'daily') {
        if (user.webhook.length != 0) {
          return [
            { title: 'Order Confirmations', body: '```alias Orders - ' + date + '\n' + '\tNo orders to confirm```' },
          ];
        }
      }
    } else {
      if (user.webhook.length != 0) {
        return [{ title: 'Order Confirmations', body: '```alias Orders - ' + date + '\n' + returnString + '```' }];
      }
    }
  } else {
    if (user.settings.orderRefresh == 'daily') {
      if (user.webhook.length != 0) {
        return [{ title: 'Order Confirmations', body: '```alias Orders - ' + date + '\n' + '\tNo orders to confirm```' }];
      }
    }
  }
};
