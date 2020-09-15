const fetch = require('node-fetch');
const CronJob = require('cron').CronJob;
const Discord = require('discord.js');
const Login = require('../models/login');
const encryption = require('../scripts/encryption');
require('dotenv').config();

const webhookClient = new Discord.WebhookClient(process.env.GOAT_ORDERS_ID, process.env.GOAT_ORDERS_TOKEN);

module.exports = function main() {
  try {
    let job = new CronJob('01 00 * * *', function () {
      confirm();
    });

    job.start();
  } catch (err) {
    console.log(err);
  }
};

async function confirm() {
  try {
    console.log('Checking Goat Orders');

    let crnt = new Date();
    let day = crnt.getDate();
    let month = crnt.getMonth() + 1;
    let date = `${month}/${day}`;

    let loginToken = await Login.find();
    let orders = [];
    let pages = 0;
    let returnString = 'Orders successfully confirmed:\n';

    let purchaseOrders = await fetch(
      'https://sell-api.goat.com/api/v1/purchase-orders?filter=10&includeMetadata=1&page=1',
      {
        headers: {
          'user-agent': 'alias/1.1.1 (iPhone; iOS 14.0; Scale/2.00)',
          authorization: `Bearer ${encryption.decrypt(loginToken[0].login)}`,
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

    purchaseOrders.purchase_orders.forEach((order) => {
      if (order.status == 'NEEDS_CONFIRMATION') {
        orders.push(order);
      }
    });

    if (orders.length != 0) {
      orders.forEach(async (order, i) => {
        let number = order.number;

        while (true) {
          let confirmation = await fetch(`https://sell-api.goat.com/api/v1/purchase-orders/${number}/confirm`, {
            method: 'PUT',
            headers: {
              'user-agent': 'alias/1.1.1 (iPhone; iOS 14.0; Scale/2.00)',
              authorization: `Bearer ${encryption.decrypt(loginToken[0].login)}`,
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
                'user-agent': 'alias/1.1.1 (iPhone; iOS 14.0; Scale/2.00)',
                authorization: `Bearer ${encryption.decrypt(loginToken[0].login)}`,
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

          if (confirmation == 200 && shipping == 200) {
            break;
          }
        }

        returnString += `\t${i} ${order.listing.product.name} - ${order.listing.size_option.name.toUpperCase()} $${
          order.listing.price_cents / 100
        }\n`;
      });

      await webhookClient
        .send('```' + date + '\n' + returnString + '```')
        .then(console.log('Successfully Confirmed Goat Orders\n'))
        .catch((err) => {
          throw new Error(err);
        });
    } else {
      await webhookClient
        .send('```' + date + '\n' + 'No orders to confirm.```')
        .then(console.log('Successfully Confirmed Goat Orders\n'))
        .catch((err) => {
          throw new Error(err);
        });
    }
  } catch (err) {
    console.log(err);
  }
}