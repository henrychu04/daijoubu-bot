const fetch = require('node-fetch');
const CronJob = require('cron').CronJob;
const encryption = require('../scripts/encryption');

const Users = require('../models/users');

module.exports = function main(client) {
  try {
    let job = new CronJob('* * * * *', function () {
      confirm(client);
    });

    job.start();
  } catch (err) {
    console.log(err);
  }
};

async function confirm(client) {
  const users = await Users.find();
  const date = new Date();

  for (let i = 0; i < users.length; i++) {
    if (users[i].settings.orderRefresh == 'live') {
      await confirmOrders(client, users[i], users[i].settings.orderRefresh);
    } else if (users[i].settings.orderRefresh == 'daily' && date.getHours() == 4 && date.getMinutes() == 1) {
      await confirmOrders(client, users[i], users[i].settings.orderRefresh);
    }
  }
}

async function confirmOrders(client, user, refresh) {
  let returnString = 'Orders successfully confirmed:\n';
  let number = 0;

  try {
    let crnt = new Date();
    let day = crnt.getDate();
    let month = crnt.getMonth() + 1;
    let date = `${month}/${day}`;

    let orders = [];
    let pages = 0;

    let purchaseOrders = await fetch(
      'https://sell-api.goat.com/api/v1/purchase-orders?filter=10&includeMetadata=1&page=1',
      {
        headers: {
          'user-agent': client.config.aliasHeader,
          authorization: `Bearer ${encryption.decrypt(user.login)}`,
        },
      }
    )
      .then((res) => {
        return res.json();
      })
      .catch((err) => {
        throw new Error(err);
      });

    pages = purchaseOrders.metadata.total_pages;

    if (purchaseOrders.purchase_orders) {
      purchaseOrders.purchase_orders.forEach((order) => {
        if (order.status == 'NEEDS_CONFIRMATION') {
          orders.push(order);
        }
      });

      if (orders.length != 0) {
        for (let i = 0; i < orders.length; i++) {
          number = orders[i].number;

          let confirmation = await fetch(`https://sell-api.goat.com/api/v1/purchase-orders/${number}/confirm`, {
            method: 'PUT',
            headers: {
              'user-agent': client.config.aliasHeader,
              authorization: `Bearer ${encryption.decrypt(user.login)}`,
            },
            body: `{"number":"${number}"}`,
          })
            .then((res) => {
              return res.status;
            })
            .catch((err) => {
              throw new Error(err);
            });

          let shipping = await fetch(
            `https://sell-api.goat.com/api/v1/purchase-orders/${number}/generate-shipping-label`,
            {
              method: 'PUT',
              headers: {
                'user-agent': client.config.aliasHeader,
                authorization: `Bearer ${encryption.decrypt(user.login)}`,
              },
              body: `{"number":"${number}"}`,
            }
          )
            .then((res) => {
              return res.status;
            })
            .catch((err) => {
              throw new Error(err);
            });

          if (confirmation != 200 || shipping != 200) {
            throw new Error('Error confirming');
          }

          returnString += `\t${i}. ${orders[i].listing.product.name} - ${orders[
            i
          ].listing.size_option.name.toUpperCase()} $${orders[i].listing.price_cents / 100}\n\t\tOrder number: ${
            orders[i].number
          }\n`;
        }

        await client.users.cache
          .get(user.d_id)
          .send('```alias orders - ' + date + '\n' + returnString + '```')
          .then(console.log('Successfully Confirmed Goat Orders\n'))
          .catch((err) => {
            throw new Error(err);
          });
      } else {
        if (refresh == 'daily') {
          await client.users.cache
            .get(user.d_id)
            .send('```alias orders - ' + date + '\n' + 'No orders to confirm.```')
            .then(console.log('Successfully Confirmed Goat Orders\n'))
            .catch((err) => {
              throw new Error(err);
            });
        }
      }
    } else {
      if (refresh == 'daily') {
        await client.users.cache
          .get(user.d_id)
          .send('```alias orders - ' + date + '\n' + 'No orders to confirm.```')
          .then(console.log('Successfully Confirmed Goat Orders\n'))
          .catch((err) => {
            throw new Error(err);
          });
      }
    }
  } catch (err) {
    console.log(err);

    if (err.message == 'Error confirming') {
      await client.users.cache
        .get(user.d_id)
        .send('```alias orders - ' + date + '\n' + returnString + '```')
        .catch((err) => {
          throw new Error(err);
        });
      await client.users.cache.get(user.d_id).send('```' + `Error confirming order number ${number}` + '```');
    }
  }
}
