const fetch = require('node-fetch');
const encryption = require('./encryption');

const Users = require('../models/users');
const Listings = require('../models/listings');

module.exports = async function refresh(client, loginToken, user) {
  if (!loginToken) {
    const users = await Users.find();
    const date = new Date();
    let allListings = [];

    for (let i = 0; i < users.length; i++) {
      if (users[i].settings.orderRefresh == 'live') {
        await confirmOrders(client, users[i], users[i].settings.orderRefresh);
      } else if (users[i].settings.orderRefresh == 'daily' && date.getHours() == 4 && date.getMinutes() == 1) {
        await confirmOrders(client, users[i], users[i].settings.orderRefresh);
      }

      let aliasListings = await getListings(client, users[i].login);

      await adding(users[i], aliasListings);
      await deleting(users[i], aliasListings);
      await syncPrice(users[i], aliasListings);
      allListings = await updateLowest(client, users[i], allListings);
    }
  } else {
    let aliasListings = await getListings(client, loginToken);

    await adding(user, aliasListings);
    await deleting(user, aliasListings);
    await syncPrice(user, aliasListings);
  }
};

async function updateLowest(client, user, allListings) {
  const userListings = await Listings.find({ d_id: user.d_id });
  const userListingsArray = userListings[0].listings;

  for (let i = 0; i < userListingsArray.length; i++) {
    let exist = false;

    for (let j = 0; j < allListings.length; j++) {
      exist = false;

      if (userListingsArray[i].slug == allListings[j].slug) {
        exist = true;

        allListings[j].data.availability.forEach(async (size) => {
          if (size.size == userListingsArray.size && size.lowest_price_cents) {
            let lowest = parseInt(size.lowest_price_cents);

            if (lowest != userListingsArray[i].lowest) {
              await Listings.updateOne(
                { 'listings.id': userListingsArray[i].id },
                { $set: { 'listings.$.lowest': lowest } }
              ).catch((err) => console.log(err));
            }
          }
        });

        break;
      }
    }

    if (!exist) {
      let pageData = await fetch(
        `https://sell-api.goat.com/api/v1/analytics/products/${userListingsArray[i].slug}/availability?box_condition=1&shoe_condition=1`,
        {
          headers: client.config.headers,
        }
      ).then((res, err) => {
        if (res.status == 200) {
          return res.json();
        } else {
          console.log('Res is', res.status);

          if (err) {
            throw new Error(err.message);
          }
        }
      });

      allListings.push({ slug: userListingsArray[i].slug, data: pageData });

      pageData.availability.forEach(async (size) => {
        if (size.size == userListingsArray.size && size.lowest_price_cents) {
          let lowest = parseInt(size.lowest_price_cents);

          if (lowest != userListingsArray[i].lowest) {
            await Listings.updateOne(
              { 'listings.id': userListingsArray[i].id },
              { $set: { 'listings.$.lowest': lowest } }
            ).catch((err) => console.log(err));
          }
        }
      });
    }
  }

  return allListings;
}

async function syncPrice(user, aliasListings) {
  const userListings = await Listings.find({ d_id: user.d_id });
  const userListingsArray = userListings[0].listings;

  for (let i = 0; i < userListingsArray.length; i++) {
    if (aliasListings.listing) {
      for (let j = 0; j < aliasListings.listing.length; j++) {
        let crntPrice = parseInt(aliasListings.listing[j].price_cents);

        if (userListingsArray[i].id == aliasListings.listing[j].id && userListingsArray[i].price != crntPrice) {
          await Listings.updateOne(
            { 'listings.id': userListingsArray[i].id },
            { $set: { 'listings.$.price': crntPrice } }
          ).catch((err) => console.log(err));
        }
      }
    }
  }
}

async function adding(user, aliasListings) {
  const userListings = await Listings.find({ d_id: user.d_id });
  const userListingsArray = userListings[0].listings;

  if (aliasListings.listing) {
    for (let i = 0; i < aliasListings.listing.length; i++) {
      let exist = false;

      userListingsArray.forEach((listing) => {
        if (listing.id == aliasListings.listing[i].id) {
          exist = true;
        }
      });

      if (exist) {
        continue;
      }

      let obj = {
        id: '',
        name: '',
        size: '',
        price: '',
        slug: '',
        lowest: '',
        setting: 'manual',
      };

      obj.id = aliasListings.listing[i].id;
      obj.name = aliasListings.listing[i].product.name;
      obj.size = parseFloat(aliasListings.listing[i].size_option.value);
      obj.price = parseInt(aliasListings.listing[i].price_cents);
      obj.slug = aliasListings.listing[i].product.id;
      obj.lowest = parseInt(aliasListings.listing[i].product.lowest_price_cents);

      await Listings.updateOne({ _id: userListings[0]._id }, { $push: { listings: obj } }).catch((err) =>
        console.log(err)
      );
    }
  }
}

async function deleting(user, aliasListings) {
  const userListings = await Listings.find({ d_id: user.d_id });
  const userListingsArray = userListings[0].listings;

  for (let i = 0; i < userListingsArray.length; i++) {
    let deleted = true;

    if (aliasListings.listing) {
      aliasListings.listing.forEach((listing) => {
        if (userListingsArray[i].id == listing.id) {
          deleted = false;
        }
      });
    }

    if (!deleted) {
      continue;
    }

    await Listings.updateOne(
      { _id: userListings[0]._id },
      { $pull: { listings: { id: userListingsArray[i].id } } }
    ).catch((err) => console.log(err));
  }
}

async function getListings(client, loginToken) {
  let getStatus = 0;
  let listings = [];

  while (getStatus != 200) {
    listings = await fetch('https://sell-api.goat.com/api/v1/listings?filter=1&includeMetadata=1&page=1', {
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${encryption.decrypt(loginToken)}`,
      },
    }).then((res, err) => {
      getStatus = res.status;

      if (res.status == 200) {
        return res.json();
      } else if (res.status == 401) {
        throw new Error('Login expired');
      } else {
        console.log('Res is', res.status);

        if (err) {
          console.log(err);
        }
      }
    });
  }

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
