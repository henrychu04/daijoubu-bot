const events = require('events');
const refresh = require('./events/index.js');
const sleep = require('../../scripts/sleep.js');
const encryption = require('../../scripts/encryption.js');

const Users = require('../../models/users.js');
const Listings = require('../../models/listings.js');
const Orders = require('../../models/orders.js');

const getAllListings = require('../requests/getAllListings.js');
const getAllOrders = require('../requests/getAllOrders.js');

const oneMinute = 60000;

module.exports = class Monitor extends events {
  constructor(client) {
    super();

    this.client = client;

    this.monitor();
  }

  monitor = async () => {
    try {
      const date = new Date();

      const allUsers = await Users.find();
      let allListings = new Map();

      for (let user of allUsers) {
        const userListings = await Listings.find({ d_id: user.d_id });
        const userListingsArray = userListings[0];
        const userOrders = await Orders.find({ d_id: user.d_id });
        const userOrdersArray = userOrders[0];

        let loginToken = encryption.decrypt(user.aliasLogin);

        const aliasListings = await getAllListings(this.client, loginToken);
        const aliasOrders = await getAllOrders(this.client, loginToken);

        let newRefresh = new refresh(
          this.client,
          user,
          loginToken,
          userListingsArray.aliasListings,
          userOrdersArray.aliasOrders,
          aliasListings,
          aliasOrders
        );

        await newRefresh.addListings();
        await newRefresh.deleteListings();
        await newRefresh.syncListingPrices();

        let updateLowestRes = await newRefresh.updateLowest(allListings);

        if (updateLowestRes) {
          this.emit('newUpdate', updateLowestRes);
        }

        let addOrdersRes = await newRefresh.addOrders();

        if (addOrdersRes) {
          this.emit('newUpdate', addOrdersRes);
        }

        await newRefresh.deleteOrders();

        let syncOrdersRes = await newRefresh.syncOrders();

        if (syncOrdersRes) {
          this.emit('newUpdate', syncOrdersRes);
        }

        let confirmOrdersRes = undefined;

        if (user.settings.orderRefresh == 'live') {
          confirmOrdersRes = await newRefresh.confirmOrders();
        } else if (user.settings.orderRefresh == 'daily' && date.getHours() == 5 && date.getMinutes() == 1) {
          confirmOrdersRes = await newRefresh.confirmOrders();
        }

        if (confirmOrdersRes) {
          this.emit('newUpdate', confirmOrdersRes);
        }

        let earningsRes = await newRefresh.earnings();

        if (earningsRes) {
          this.emit('newUpdate', earningsRes);
        }
      }
    } catch (err) {
      console.log(err);

      await sleep(oneMinute);
      return this.monitor();
    }

    await sleep(oneMinute);
    return this.monitor();
  };
};
