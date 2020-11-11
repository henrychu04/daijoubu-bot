const fetch = require('node-fetch');
const Discord = require('discord.js');
const Sentry = require('@sentry/node');
const encryption = require('./encryption');

const Users = require('../models/users');
const Listings = require('../models/listings');
const Orders = require('../models/orders');

const maxRetries = 3;

module.exports = async function refresh(client, loginToken, user) {
  if (!loginToken) {
    const users = await Users.find();
    let allListings = new Map();

    for (let i = 0; i < users.length; i++) {
      const date = new Date();

      let user = users[i];

      let webhook = null;

      if (user.webhook.length != 0) {
        let split = user.webhook.split('/');
        let id = split[5];
        let token = split[6];
        webhook = new Discord.WebhookClient(id, token);
      }

      try {
        if (user.settings.orderRefresh == 'live') {
          await confirmOrders(client, user, user.settings.orderRefresh, webhook);
        } else if (user.settings.orderRefresh == 'daily' && date.getHours() == 5 && date.getMinutes() == 1) {
          await confirmOrders(client, user, user.settings.orderRefresh, webhook);
        }

        const userListings = await Listings.find({ d_id: user.d_id });
        const userListingsArray = userListings[0].listings;

        let aliasListings = await getListings(client, user.login);

        await addListing(user, aliasListings, userListingsArray);
        await deleteListing(user, aliasListings, userListingsArray);
        await syncListingPrice(aliasListings, userListingsArray);
        allListings = await updateLowest(client, user, allListings, webhook, userListingsArray);

        const userOrders = await Orders.find({ d_id: user.d_id });
        const userOrdersArray = userOrders[0].orders;

        let aliasOrders = await getOrders(client, user.login);

        await addOrder(client, user, aliasOrders, webhook, userOrdersArray);
        await deleteOrder(user, aliasOrders, userOrdersArray);
        await syncOrders(client, user, aliasOrders, webhook, userOrdersArray);

        await earnings(client, user, webhook);
      } catch (err) {
        console.log(err);

        Sentry.captureException(err, (scope) => {
          scope.clear();
          scope.setUser({
            id: user.d_id,
          });
          return scope;
        });

        Sentry.configureScope((scope) => scope.setUser(null));
      }
    }
  } else {
    try {
      let aliasListings = await getListings(client, loginToken);

      await addListing(user, aliasListings);
      await deleteListing(user, aliasListings);
      await syncListingPrice(user, aliasListings);
    } catch (err) {
      console.log(err);

      Sentry.captureException(err, (scope) => {
        scope.clear();
        scope.setUser({
          id: user.d_id,
        });
        return scope;
      });

      Sentry.configureScope((scope) => scope.setUser(null));
    }
  }
};

async function updateLowest(client, user, allListings, webhook, userListingsArray) {
  try {
    let liveString = 'Listings Updated:\n';
    let live = 0;
    let manualString = 'Listings With a New Lowest Ask:\n';
    let manual = 0;

    for (let i = 0; i < userListingsArray.length; i++) {
      if (allListings.has(userListingsArray[i].slug)) {
        let existing = allListings.get(userListingsArray[i].slug);

        for (size of existing.availability) {
          if (size.size == userListingsArray[i].size && size.lowest_price_cents) {
            let lowest = parseInt(size.lowest_price_cents);

            if (userListingsArray[i].setting == 'live' && lowest != userListingsArray[i].price) {
              await updateListing(client, user, userListingsArray[i].id, lowest);

              liveString += `\t${live}. ${userListingsArray[i].name} size: ${userListingsArray[i].size} $${
                userListingsArray[i].price / 100
              }\n\t\t$${userListingsArray[i].price} => $${lowest / 100}\n`;
              live++;

              await Listings.updateOne(
                { 'listings.id': userListingsArray[i].id },
                { $set: { 'listings.$.price': lowest } }
              ).catch((err) => console.log(err));
            }

            if (lowest != userListingsArray[i].lowest) {
              if (userListingsArray[i].setting == 'manual') {
                manualString += `\t${manual}. ${userListingsArray[i].name} size: ${userListingsArray[i].size} $${
                  userListingsArray[i].price / 100
                }\n\t\t$${userListingsArray[i].lowest / 100} => $${lowest / 100}\n`;
                manual++;
              }

              await Listings.updateOne(
                { 'listings.id': userListingsArray[i].id },
                { $set: { 'listings.$.lowest': lowest } }
              ).catch((err) => console.log(err));
            }
          }
        }
      } else {
        let pageDataRes = false;
        let pageData = null;
        let count = 0;

        while (!pageDataRes) {
          pageData = await fetch(
            `https://sell-api.goat.com/api/v1/analytics/products/${userListingsArray[i].slug}/availability?box_condition=1&shoe_condition=1`,
            {
              headers: client.config.headers,
            }
          ).then((res, err) => {
            pageDataRes = res.status;

            if (res.status == 200) {
              return res.json();
            } else {
              console.log('Res is', res.status);
              console.trace();

              if (err) {
                console.log(err);
              }
            }
          });

          count++;

          if (count == maxRetries) {
            throw new Error('Max retries');
          }
        }

        allListings.set(userListingsArray[i].slug, pageData);

        for (size of pageData.availability) {
          if (size.size == userListingsArray[i].size && size.lowest_price_cents) {
            let lowest = parseInt(size.lowest_price_cents);

            if (userListingsArray[i].setting == 'live' && lowest != userListingsArray[i].price) {
              await updateListing(client, user, userListingsArray[i].id, lowest);

              liveString += `\t${live}. ${userListingsArray[i].name} size: ${userListingsArray[i].size} $${
                userListingsArray[i].price / 100
              }\n\t\t$${userListingsArray[i].price} => $${lowest / 100}\n`;
              live++;

              await Listings.updateOne(
                { 'listings.id': userListingsArray[i].id },
                { $set: { 'listings.$.price': lowest } }
              ).catch((err) => console.log(err));
            }

            if (lowest != userListingsArray[i].lowest) {
              if (userListingsArray[i].setting == 'manual') {
                manualString += `\t${manual}. ${userListingsArray[i].name} size: ${userListingsArray[i].size} $${
                  userListingsArray[i].price / 100
                }\n\t\t$${userListingsArray[i].lowest / 100} => $${lowest / 100}\n`;
                manual++;
              }

              await Listings.updateOne(
                { 'listings.id': userListingsArray[i].id },
                { $set: { 'listings.$.lowest': lowest } }
              ).catch((err) => console.log(err));
            }
          }
        }
      }
    }

    if (live > 0) {
      let success = false;

      if (webhook != null) {
        let count = 0;

        while (!success) {
          await webhook
            .send('```' + liveString + '```', {
              username: 'Listing Updates',
              avatarURL: client.config.aliasPicture,
            })
            .then(() => {
              success = true;
              console.log(`User: ${user.d_id}\nSuccessfully updated live alias listings\n`);
            })
            .catch((err) => {
              if (err.message == 'Unknown Webhook') {
                throw new Error('Unknown webhook');
              } else if (err.message == 'Invalid Webhook Token') {
                throw new Error('Invalid webhook token');
              } else {
                throw new Error(err);
              }
            });

          count++;

          if (count == maxRetries) {
            throw new Error('Max retries');
          }
        }
      }
    }

    if (manual > 0) {
      let success = false;

      if (webhook != null) {
        let count = 0;

        while (!success) {
          await webhook
            .send('```' + manualString + '```', {
              username: 'Listing Updates',
              avatarURL: client.config.aliasPicture,
            })
            .then(() => {
              success = true;
              console.log(`User: ${user.d_id}\nSuccessfully updated manual alias listings\n`);
            })
            .catch((err) => {
              if (err.message == 'Unknown Webhook') {
                throw new Error('Unknown webhook');
              } else if (err.message == 'Invalid Webhook Token') {
                throw new Error('Invalid webhook token');
              } else {
                throw new Error(err);
              }
            });

          count++;

          if (count == maxRetries) {
            throw new Error('Max retries');
          }
        }
      }
    }

    return allListings;
  } catch (err) {
    console.log(err);
  }
}

async function updateListing(client, user, id, lowest) {
  let listings = await getListings(client, user.login);
  let obj = {};

  for (let i = 0; i < listings.listing.length; i++) {
    if (listings.listing[i].id == id) {
      obj = listings.listing[i];
    }
  }

  obj.price_cents = lowest.toString();

  let updateRes = 0;
  let count = 0;

  while (updateRes != 200) {
    updateRes = await fetch(`https://sell-api.goat.com/api/v1/listings/${id}`, {
      method: 'PUT',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${encryption.decrypt(user.login)}`,
      },
      body: `{"listing":${JSON.stringify(obj)}}`,
    })
      .then((res, err) => {
        if (res.status == 401) {
          throw new Error('Login expired');
        } else if (res.status == 404) {
          throw new Error('Not exist');
        } else if (res.status != 200) {
          console.log('Res is', res.status);
          console.trace();

          if (err) {
            console.log(err);
          }
        }

        return res.status;
      })
      .catch((err) => {
        throw new Error(err);
      });

    count++;

    if (count == maxRetries) {
      throw new Error('Max retries');
    }
  }
}

async function syncListingPrice(aliasListings, userListingsArray) {
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

async function addListing(user, aliasListings, userListingsArray) {
  if (aliasListings.listing) {
    for (let i = 0; i < aliasListings.listing.length; i++) {
      let crnt = aliasListings.listing[i];
      let exist = false;

      userListingsArray.forEach((listing) => {
        if (listing.id == crnt.id) {
          exist = true;
        }
      });

      if (exist) {
        continue;
      }

      let obj = {
        id: crnt.id,
        name: crnt.product.name,
        size: parseFloat(crnt.size_option.value),
        price: parseInt(crnt.price_cents),
        slug: crnt.product.id,
        lowest: parseInt(crnt.product.lowest_price_cents),
        setting: user.settings.adjustListing,
      };

      await Listings.updateOne({ d_id: user.d_id }, { $push: { listings: obj } }).catch((err) => console.log(err));
    }
  }
}

async function deleteListing(user, aliasListings, userListingsArray) {
  for (let i = 0; i < userListingsArray.length; i++) {
    let crnt = userListingsArray[i];
    let deleted = true;

    if (aliasListings.listing) {
      aliasListings.listing.forEach((listing) => {
        if (crnt.id == listing.id) {
          deleted = false;
        }
      });
    }

    if (!deleted) {
      continue;
    }

    await Listings.updateOne({ d_id: user.d_id }, { $pull: { listings: { id: crnt.id } } }).catch((err) =>
      console.log(err)
    );
  }
}

async function getListings(client, loginToken) {
  let getStatus = 0;
  let listings = {};
  let count = 0;

  while (getStatus != 200) {
    listings = await fetch(`https://sell-api.goat.com/api/v1/listings?filter=1&includeMetadata=1&page=1`, {
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
        console.trace();

        if (err) {
          console.log(err);
        }
      }
    });

    count++;

    if (count == maxRetries) {
      throw new Error('Max retries');
    }
  }

  for (let i = 1; i < listings.metadata.total_pages; i++) {
    let temp = {};
    getStatus = 0;
    count = 0;

    while (getStatus != 200) {
      temp = await fetch(`https://sell-api.goat.com/api/v1/listings?filter=1&includeMetadata=1&page=${i}`, {
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
          console.trace();

          if (err) {
            console.log(err);
          }
        }
      });

      count++;

      if (count == maxRetries) {
        throw new Error('Max retries');
      }
    }

    for (let j = 0; j < temp.listing.length; j++) {
      listings.listing.push(temp.listing[i]);
    }
  }

  return listings;
}

async function confirmOrders(client, user, refresh, webhook) {
  let confirmed = 0;
  let number = 0;
  let returnString = '';

  try {
    let crnt = new Date();
    let day = crnt.getDate();
    let month = crnt.getMonth() + 1;
    let date = `${month}/${day}`;

    let orders = [];
    let getStatus = 0;
    let purchaseOrders = {};
    let count = 0;

    while (getStatus != 200) {
      purchaseOrders = await fetch(
        'https://sell-api.goat.com/api/v1/purchase-orders?filter=10&includeMetadata=1&page=1',
        {
          headers: {
            'user-agent': client.config.aliasHeader,
            authorization: `Bearer ${encryption.decrypt(user.login)}`,
          },
        }
      ).then((res, err) => {
        getStatus = res.status;

        if (res.status == 200) {
          return res.json();
        } else if (res.status == 401) {
          throw new Error('Login expired');
        } else {
          console.log('Res is', res.status);
          console.trace();

          if (err) {
            console.log(err);
          }
        }
      });

      count++;

      if (count == maxRetries) {
        throw new Error('Max retries');
      }
    }

    for (let i = 1; i < purchaseOrders.metadata.total_pages; i++) {
      let temp = {};
      getStatus = 0;
      count = 0;

      while (getStatus != 200) {
        temp = await fetch(`https://sell-api.goat.com/api/v1/purchase-orders?filter=10&includeMetadata=1&page=${i}`, {
          headers: {
            'user-agent': client.config.aliasHeader,
            authorization: `Bearer ${encryption.decrypt(user.login)}`,
          },
        }).then((res, err) => {
          getStatus = res.status;

          if (res.status == 200) {
            return res.json();
          } else if (res.status == 401) {
            throw new Error('Login expired');
          } else {
            console.log('Res is', res.status);
            console.trace();

            if (err) {
              console.log(err);
            }
          }
        });

        count++;

        if (count == maxRetries) {
          throw new Error('Max retries');
        }
      }

      for (let j = 0; j < temp.listing.length; j++) {
        purchaseOrders.listing.push(temp.listing[i]);
      }
    }

    if (purchaseOrders.purchase_orders) {
      purchaseOrders.purchase_orders.forEach((order) => {
        if (order.status == 'NEEDS_CONFIRMATION') {
          orders.push(order);
        }
      });

      for (let i = 0; i < orders.length; i++) {
        number = orders[i].number;
        let confirmation = 0;
        count = 0;

        while (confirmation != 200) {
          confirmation = await fetch(`https://sell-api.goat.com/api/v1/purchase-orders/${number}/confirm`, {
            method: 'PUT',
            headers: {
              'user-agent': client.config.aliasHeader,
              authorization: `Bearer ${encryption.decrypt(user.login)}`,
            },
            body: `{"number":"${number}"}`,
          }).then((res, err) => {
            if (res.status == 401) {
              throw new Error('Login expired');
            } else if (res.status != 200) {
              console.log('Res is', res.status);
              console.trace();

              if (err) {
                console.log(err);
              }
            }

            return res.status;
          });

          count++;

          if (count == maxRetries) {
            throw new Error('Max retries');
          }
        }

        let shipping = 0;
        count = 0;

        while (shipping != 200) {
          shipping = await fetch(`https://sell-api.goat.com/api/v1/purchase-orders/${number}/generate-shipping-label`, {
            method: 'PUT',
            headers: {
              'user-agent': client.config.aliasHeader,
              authorization: `Bearer ${encryption.decrypt(user.login)}`,
            },
            body: `{"number":"${number}"}`,
          }).then((res, err) => {
            if (res.status == 401) {
              throw new Error('Login expired');
            } else if (res.status != 200) {
              console.log('Res is', res.status);
              console.trace();

              if (err) {
                console.log(err);
              }
            }

            return res.status;
          });

          count++;

          if (count == maxRetries) {
            throw new Error('Max retries');
          }
        }

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

      if (orders.length == 0) {
        if (refresh == 'daily') {
          if (webhook != null) {
            let success = false;
            count = 0;

            while (!success) {
              await webhook
                .send('```alias Orders - ' + date + '\n' + 'No orders to confirm```', {
                  username: 'Order Confirmations',
                  avatarURL: client.config.aliasPicture,
                })
                .then(() => {
                  success = true;
                  console.log(`User: ${user.d_id}\nSuccessfully confirmed alias orders\n`);
                })
                .catch((err) => {
                  if (err.message == 'Unknown Webhook') {
                    throw new Error('Unknown webhook');
                  } else if (err.message == 'Invalid Webhook Token') {
                    throw new Error('Invalid webhook token');
                  } else {
                    throw new Error(err);
                  }
                });

              count++;

              if (count == maxRetries) {
                throw new Error('Max retries');
              }
            }
          }
        }
      } else {
        if (webhook != null) {
          let success = false;
          count = 0;

          while (!success) {
            await webhook
              .send('```alias Orders - ' + date + '\n' + returnString + '```', {
                username: 'Order Confirmations',
                avatarURL: client.config.aliasPicture,
              })
              .then(() => {
                success = true;
                console.log(`User: ${user.d_id}\nSuccessfully confirmed alias orders\n`);
              })
              .catch((err) => {
                if (err.message == 'Unknown Webhook') {
                  throw new Error('Unknown webhook');
                } else if (err.message == 'Invalid Webhook Token') {
                  throw new Error('Invalid webhook token');
                } else {
                  throw new Error(err);
                }
              });

            count++;

            if (count == maxRetries) {
              throw new Error('Max retries');
            }
          }
        }
      }
    } else {
      if (refresh == 'daily') {
        if (webhook != null) {
          let success = false;
          count = 0;

          while (!success) {
            await webhook
              .send('```alias Orders - ' + date + '\n' + 'No orders to confirm```', {
                username: 'Order Confirmations',
                avatarURL: client.config.aliasPicture,
              })
              .then(() => {
                success = true;
                console.log(`User: ${user.d_id}\nSuccessfully checked alias orders\n`);
              })
              .catch((err) => {
                if (err.message == 'Unknown Webhook') {
                  throw new Error('Unknown webhook');
                } else if (err.message == 'Invalid Webhook Token') {
                  throw new Error('Invalid webhook token');
                } else {
                  throw new Error(err);
                }
              });

            count++;

            if (count == maxRetries) {
              throw new Error('Max retries');
            }
          }
        }
      }
    }
  } catch (err) {
    console.log(err);

    if (err.message == 'Error confirming') {
      if (confirmed != 0) {
        if (webhook != null) {
          let success = false;
          count = 0;

          while (!success) {
            await webhook
              .send('```alias Orders - ' + date + '\n' + returnString + '```', {
                username: 'Order Confirmations',
                avatarURL: client.config.aliasPicture,
              })
              .then(() => {
                sucess = true;
              })
              .catch((err) => {
                if (err.message == 'Unknown Webhook') {
                  throw new Error('Unknown webhook');
                } else if (err.message == 'Invalid Webhook Token') {
                  throw new Error('Invalid webhook token');
                } else {
                  throw new Error(err);
                }
              });

            count++;

            if (count == maxRetries) {
              throw new Error('Max retries');
            }
          }

          count = 0;

          while (!success) {
            await webhook
              .send('```' + `Error confirming order number ${number}` + '```', {
                username: 'Order Confirmations',
                avatarURL: client.config.aliasPicture,
              })
              .then(() => {
                sucess = true;
              })
              .catch((err) => {
                if (err.message == 'Unknown Webhook') {
                  throw new Error('Unknown webhook');
                } else if (err.message == 'Invalid Webhook Token') {
                  throw new Error('Invalid webhook token');
                } else {
                  throw new Error(err);
                }
              });

            count++;

            if (count == maxRetries) {
              throw new Error('Max retries');
            }
          }
        }
      }
    }
  }
}

async function earnings(client, user, webhook) {
  let earningsRes = 0;
  let earnings = null;
  let count = 0;

  while (earningsRes != 200) {
    earnings = await fetch('https://sell-api.goat.com/api/v1/users/earnings', {
      method: 'GET',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${encryption.decrypt(user.login)}`,
      },
    }).then((res, err) => {
      earningsRes = res.status;

      if (res.status == 200) {
        return res.json();
      } else {
        console.log('Res is', res.status);
        console.trace();

        if (err) {
          console.log(err);
        }
      }
    });

    count++;

    if (count == maxRetries) {
      throw new Error('Max retries');
    }
  }

  let crntEarnings = 0;

  if (earnings.amount_cents) {
    crntEarnings = parseInt(earnings.amount_cents);

    if (user.cashoutAmount < crntEarnings) {
      if (webhook != null) {
        let success = false;
        count = 0;

        while (!success) {
          await webhook
            .send('```' + `Amount available for cashout: $${crntEarnings / 100}` + '```', {
              username: 'Earnings',
              avatarURL: client.config.aliasPicture,
            })
            .then(() => {
              success = true;
              console.log(`User: ${user.d_id}\nNew cashout amount detected - webhook successfully sent\n`);
            })
            .catch((err) => {
              if (err.message == 'Unknown Webhook') {
                throw new Error('Unknown webhook');
              } else if (err.message == 'Invalid Webhook Token') {
                throw new Error('Invalid webhook token');
              } else {
                throw new Error(err);
              }
            });

          count++;

          if (count == maxRetries) {
            throw new Error('Max retries');
          }
        }
      }
    }
  }

  if (crntEarnings != user.cashoutAmount) {
    await Users.updateOne({ _id: user._id }, { $set: { cashoutAmount: crntEarnings } }, async (err) => {
      if (!err) {
        console.log(`User: ${user._id}\nCash out database amount updated successfully\n`);
      }
    }).catch((err) => {
      throw new Error(err);
    });
  }
}

async function getOrders(client, loginToken) {
  let getStatus = 0;
  let purchaseOrders = {};
  let count = 0;

  while (getStatus != 200) {
    purchaseOrders = await fetch(
      'https://sell-api.goat.com/api/v1/purchase-orders?filter=10&includeMetadata=1&page=1',
      {
        headers: {
          'user-agent': client.config.aliasHeader,
          authorization: `Bearer ${encryption.decrypt(loginToken)}`,
        },
      }
    ).then((res, err) => {
      getStatus = res.status;

      if (res.status == 200) {
        return res.json();
      } else if (res.status == 401) {
        throw new Error('Login expired');
      } else {
        console.log('Res is', res.status);
        console.trace();

        if (err) {
          console.log(err);
        }
      }
    });

    count++;

    if (count == maxRetries) {
      throw new Error('Max retries');
    }
  }

  for (let i = 1; i < purchaseOrders.metadata.total_pages; i++) {
    let temp = {};
    getStatus = 0;
    count = 0;

    while (getStatus != 200) {
      temp = await fetch(`https://sell-api.goat.com/api/v1/purchase-orders?filter=10&includeMetadata=1&page=${i}`, {
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
          console.trace();

          if (err) {
            console.log(err);
          }
        }
      });

      count++;

      if (count == maxRetries) {
        throw new Error('Max retries');
      }
    }

    for (let j = 0; j < temp.listing.length; j++) {
      purchaseOrders.listing.push(temp.listing[i]);
    }
  }

  return purchaseOrders;
}

async function addOrder(client, user, aliasOrders, webhook, userOrdersArray) {
  let added = false;
  let j = 0;
  let newOrderString = 'New Open Order(s):\n';

  if (aliasOrders.purchase_orders) {
    for (crnt of aliasOrders.purchase_orders) {
      let exist = false;

      userOrdersArray.forEach((order) => {
        if (order.number == crnt.number) {
          exist = true;
        }
      });

      if (exist) {
        continue;
      } else {
        added = true;
      }

      let obj = {
        number: crnt.number,
        status: crnt.status,
        take_action_by: crnt.take_action_by,
        size: parseFloat(crnt.listing.size),
        price: parseInt(crnt.listing.price_cents),
        name: crnt.listing.product.name,
        tracking: '',
      };

      let date = new Date(crnt.take_action_by);

      newOrderString += `\t${j}. ${obj.name} - ${obj.size} $${obj.price_cents / 100}\n\t\tStatus: ${convertStatus(
        obj.status
      )}\n\t\tTake action by: ${date.getMonth() + 1}/${date.getDate()}\n`;

      j++;

      await Orders.updateOne({ d_id: user.d_id }, { $push: { orders: obj } }).catch((err) => console.log(err));
    }
  }

  if (added) {
    if (webhook != null) {
      let success = false;
      let count = 0;

      while (!success) {
        await webhook
          .send('```' + newOrderString + '```', {
            username: 'Orders',
            avatarURL: client.config.aliasPicture,
          })
          .then(() => {
            success = true;
            console.log(`User: ${user.d_id}\nNew order added - webhook successfully sent\n`);
          })
          .catch((err) => {
            if (err.message == 'Unknown Webhook') {
              throw new Error('Unknown webhook');
            } else if (err.message == 'Invalid Webhook Token') {
              throw new Error('Invalid webhook token');
            } else {
              throw new Error(err);
            }
          });

        count++;

        if (count == maxRetries) {
          throw new Error('Max retries');
        }
      }
    }
  }
}

async function deleteOrder(user, aliasOrders, userOrdersArray) {
  for (let i = 0; i < userOrdersArray.length; i++) {
    let crnt = userOrdersArray[i];
    let deleted = true;

    if (aliasOrders.purchase_orders) {
      aliasOrders.purchase_orders.forEach((order) => {
        if (crnt.number == order.number) {
          deleted = false;
        }
      });
    }

    if (!deleted) {
      continue;
    }

    await Orders.updateOne({ d_id: user.d_id }, { $pull: { orders: { number: crnt.number } } }).catch((err) =>
      console.log(err)
    );
  }
}

async function syncOrders(client, user, aliasOrders, webhook, userOrdersArray) {
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
          let oldDate = '';

          if (crnt.status != aliasOrders.purchase_orders[j].status) {
            changed = true;
            statusChange = true;
            oldStatus = crnt.status;
            crnt.status = aliasOrders.purchase_orders[j].status;
          }

          if (crnt.take_action_by != aliasOrders.purchase_orders[j].take_action_by) {
            changed = true;
            dateChange = true;
            oldDate = crnt.take_action_by;
            crnt.take_action_by = aliasOrders.purchase_orders[j].take_action_by;
          }

          if (statusChange && dateChange) {
            let oldParsedDate = new Date(oldDate);
            let newParsedDate = new Date(crnt.take_action_by);

            if (crnt.status == 'SHIPPED') {
              crnt.tracking = aliasOrders.purchase_orders[j].shipping_info.tracking_code;

              changedString += `\t${k}. ${crnt.name} - ${crnt.size} $${crnt.price / 100}\n\t\tStatus: ${convertStatus(
                oldStatus
              )} => ${convertStatus(crnt.status)}\n\t\tTake action by: ${
                oldParsedDate.getMonth() + 1
              }/${oldParsedDate.getDate()} => ${
                newParsedDate.getMonth() + 1
              }/${newParsedDate.getDate()}\n\t\tUPS tracking number: ${crnt.tracking}\n`;
            } else {
              changedString += `\t${k}. ${crnt.name} - ${crnt.size} $${crnt.price / 100}\n\t\tStatus: ${convertStatus(
                oldStatus
              )} => ${convertStatus(crnt.status)}\n\t\tTake action by: ${
                oldParsedDate.getMonth() + 1
              }/${oldParsedDate.getDate()} => ${newParsedDate.getMonth() + 1}/${newParsedDate.getDate()}\n`;
            }
            k++;
          } else if (statusChange) {
            let date = new Date(crnt.take_action_by);

            if (status == 'SHIPPED') {
              crnt.tracking = aliasOrders.purchase_orders[j].shipping_info.tracking_code;

              changedString += `\t${k}. ${crnt.name} - ${crnt.size} $${crnt.price / 100}\n\t\tStatus: ${convertStatus(
                oldStatus
              )} => ${convertStatus(crnt.status)}\n\t\tTake action by: ${
                date.getMonth() + 1
              }/${date.getDate()}\n\t\tUPS tracking number: ${crnt.tracking}\n`;
            } else {
              changedString += `\t${k}. ${crnt.name} - ${crnt.size} $${crnt.price / 100}\n\t\tStatus: ${convertStatus(
                oldStatus
              )} => ${convertStatus(crnt.status)}\n\t\tTake action by: ${date.getMonth() + 1}/${date.getDate()}\n`;
            }
            k++;
          } else if (dateChange) {
            let oldParsedDate = new Date(oldDate);
            let newParsedDate = new Date(crnt.take_action_by);

            if (status == 'SHIPPED') {
              changedString += `\t${k}. ${crnt.name} - ${crnt.size} $${crnt.price / 100}\n\t\tStatus: ${convertStatus(
                crnt.status
              )}\n\t\tTake action by: ${oldParsedDate.getMonth() + 1}/${oldParsedDate.getDate()} => ${
                newParsedDate.getMonth() + 1
              }/${newParsedDate.getDate()}\n`;
            } else {
              changedString += `\t${k}. ${crnt.name} - ${crnt.size} $${crnt.price / 100}\n\t\tStatus: ${convertStatus(
                crnt.status
              )}\n\t\tTake action by: ${oldParsedDate.getMonth() + 1}/${oldParsedDate.getDate()} => ${
                newParsedDate.getMonth() + 1
              }/${newParsedDate.getDate()}\n`;
            }
            k++;
          }

          if (changed) {
            await Orders.updateOne(
              { 'orders.number': crnt.number },
              {
                $set: {
                  'orders.$': crnt,
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
    if (webhook != null) {
      let success = false;
      let count = 0;

      while (!success) {
        await webhook
          .send('```' + changedString + '```', {
            username: 'Orders',
            avatarURL: client.config.aliasPicture,
          })
          .then(() => {
            success = true;
            console.log(`User: ${user.d_id}\nOrder change detected - webhook successfully sent\n`);
          })
          .catch((err) => {
            if (err.message == 'Unknown Webhook') {
              throw new Error('Unknown webhook');
            } else if (err.message == 'Invalid Webhook Token') {
              throw new Error('Invalid webhook token');
            } else {
              throw new Error(err);
            }
          });

        count++;

        if (count == maxRetries) {
          throw new Error('Max retries');
        }
      }
    }
  }
}

function convertStatus(status) {
  if (status == 'IN_REVIEW') {
    return 'In Review';
  } else if (status == 'NEEDS_CONFIRMATION') {
    return 'Needs Confirmation';
  } else if (status == 'NEEDS_SHIPPING') {
    return 'Needs Shipping';
  } else if (status == 'SHIPPED') {
    return 'Shipped';
  } else if (status == 'DROPPED_OFF') {
    return 'Dropped Off';
  } else if (status == 'RECEIVED') {
    return 'Received';
  } else {
    return status;
  }
}
