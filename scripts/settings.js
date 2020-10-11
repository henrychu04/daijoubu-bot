const fetch = require('node-fetch');
const CronJob = require('cron').CronJob;
const encryption = require('./encryption');

const Users = require('../models/users');

module.exports = function main(client) {
  try {
    let job = new CronJob('* * * * *', function () {
      refresh(client);
    });

    job.start();
  } catch (err) {
    console.log(err);
  }
};

async function refresh(client) {
  const users = await Users.find();
  const date = new Date();

  for (let i = 0; i < users.length; i++) {
    if (users[i].settings.orderRefresh == 'live') {
      await confirmOrders(client, users[i], users[i].settings.orderRefresh);
    } else if (users[i].settings.orderRefresh == 'daily' && date.getHours() == 4 && date.getMinutes() == 1) {
      await confirmOrders(client, users[i], users[i].settings.orderRefresh);
    }

    let listings = await getListings(client, users[i]);

    await adding(users[i], listings);
    await deleting(users[i], listings);
  }
}

async function adding(user, listings) {
  let userListings = await Users.findById(user._id);
  userListings = userListings.listings;
  let listingArray = [];

  if (listings.listing) {
    for (let i = 0; i < listings.listing.length; i++) {
      let exist = false;

      userListings.forEach((listing) => {
        if (listing.id == listings.listing[i].id) {
          exist = true;
        }
      });

      if (exist) {
        continue;
      }

      let obj = {
        id: '',
        size: '',
        price: '',
        slug: '',
      };

      obj.id = listings.listing[i].id;
      obj.size = listings.listing[i].size_option.name;
      obj.price = listings.listing[i].price_cents;
      obj.slug = listings.listing[i].product.id;

      listingArray.push(obj);
    }
  }

  listingArray.forEach(async (listing) => {
    await Users.updateOne({ _id: user._id }, { $push: { listings: listing } }).catch((err) => console.log(err));
  });
}

async function deleting(user, listings) {
  let userListings = await Users.findById(user._id);
  userListings = userListings.listings;

  for (let i = 0; i < userListings.length; i++) {
    let deleted = true;

    if (listings.listing) {
      listings.listing.forEach((listing) => {
        if (userListings[i].id == listing.id) {
          deleted = false;
        }
      });
    }

    if (deleted) {
      await Users.updateOne({ _id: user._id }, { $pull: { listings: { id: userListings[i].id } } }).catch((err) =>
        console.log(err)
      );
    }
  }
}

async function getListings(client, user) {
  let listings = await fetch('https://sell-api.goat.com/api/v1/listings?filter=1&includeMetadata=1&page=1', {
    headers: {
      'user-agent': client.config.aliasHeader,
      authorization: `Bearer ${encryption.decrypt(user.login)}`,
    },
  }).then((res, err) => {
    if (res.status == 200) {
      return res.json();
    } else if (res.status == 401) {
      throw new Error('Login expired');
    } else {
      console.log('Res is', res.status);

      if (err) {
        throw new Error(err.message);
      }
    }
  });

  return listings;
}

async function confirmOrders(client, user, refresh) {
  let returnString = 'Orders successfully confirmed:\n';
  let confirmed = 0;
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
          }).then((res) => {
            return res.status;
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
          ).then((res) => {
            return res.status;
          });

          if (confirmation != 200 || shipping != 200) {
            throw new Error('Error confirming');
          }

          returnString += `\t${i}. ${orders[i].listing.product.name} - ${orders[
            i
          ].listing.size_option.name.toUpperCase()} $${orders[i].listing.price_cents / 100}\n\t\tOrder number: ${
            orders[i].number
          }\n`;

          confirmed++;
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
      if (confirmed != 0) {
        await client.users.cache
          .get(user.d_id)
          .send('```alias orders - ' + date + '\n' + returnString + '```')
          .catch((err) => {
            throw new Error(err);
          });
      }
      await client.users.cache.get(user.d_id).send('```' + `Error confirming order number ${number}` + '```');
    }
  }
}
