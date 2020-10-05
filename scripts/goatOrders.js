const fetch = require('node-fetch');
const CronJob = require('cron').CronJob;
const encryption = require('../scripts/encryption');
const config = require('../config.json');

const Login = require('../models/logins');

module.exports = function main(client) {
  try {
    let job = new CronJob('01 04 * * *', function () {
      confirm(client);
    });

    job.start();
  } catch (err) {
    console.log(err);
  }
};

async function confirm(client) {
  try {
    console.log('Checking Goat Orders');

    const logins = await Login.find();

    for (let i = 0; i < logins.length; i++) {
      await confirmOrders(client, logins[i]);
    }
  } catch (err) {
    console.log(err);
  }
}

async function confirmOrders(client, login) {
  let crnt = new Date();
  let day = crnt.getDate();
  let month = crnt.getMonth() + 1;
  let date = `${month}/${day}`;

  let orders = [];
  let pages = 0;
  let returnString = 'Orders successfully confirmed:\n';

  let purchaseOrders = await fetch(
    'https://sell-api.goat.com/api/v1/purchase-orders?filter=10&includeMetadata=1&page=1',
    {
      headers: {
        'user-agent': config.aliasHeader,
        authorization: `Bearer ${encryption.decrypt(login.login)}`,
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
        let number = orders[i].number;

        while (true) {
          let confirmation = await fetch(`https://sell-api.goat.com/api/v1/purchase-orders/${number}/confirm`, {
            method: 'PUT',
            headers: {
              'user-agent': config.aliasHeader,
              authorization: `Bearer ${encryption.decrypt(login.login)}`,
            },
            body: `{"number":"${number}"}`,
          })
            .then((res) => {
              return res.status;
            })
            .catch((err) => {
              throw new Error(err);
            });

          if (confirmation == 200) {
            break;
          }
        }

        while (true) {
          let shipping = await fetch(
            `https://sell-api.goat.com/api/v1/purchase-orders/${number}/generate-shipping-label`,
            {
              method: 'PUT',
              headers: {
                'user-agent': config.aliasHeader,
                authorization: `Bearer ${encryption.decrypt(login.login)}`,
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

          if (shipping == 200) {
            break;
          }
        }

        returnString += `\t${i}. ${orders[i].listing.product.name} - ${orders[
          i
        ].listing.size_option.name.toUpperCase()} $${orders[i].listing.price_cents / 100}\n`;
      }

      await client.users.cache
        .get(login.d_id)
        .send('```alias orders - ' + date + '\n' + returnString + '```')
        .then(console.log('Successfully Confirmed Goat Orders\n'))
        .catch((err) => {
          throw new Error(err);
        });
    } else {
      await client.users.cache
        .get(login.d_id)
        .send('```alias orders - ' + date + '\n' + 'No orders to confirm.```')
        .then(console.log('Successfully Confirmed Goat Orders\n'))
        .catch((err) => {
          throw new Error(err);
        });
    }
  } else {
    await client.users.cache
      .get(login.d_id)
      .send('```alias orders - ' + date + '\n' + 'No orders to confirm.```')
      .then(console.log('Successfully Confirmed Goat Orders\n'))
      .catch((err) => {
        throw new Error(err);
      });
  }
}
