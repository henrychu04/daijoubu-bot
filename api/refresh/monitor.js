const events = require('events');
const moment = require('moment-timezone');
const Refresh = require('./events/index.js');
const sleep = require('../../scripts/sleep.js');

const Users = require('../../models/users.js');

const oneMinute = 60000;

module.exports = class Monitor extends events {
  constructor(client) {
    super();

    this.client = client;

    this.monitor();
  }

  monitor = async () => {
    while (1) {
      try {
        const date = new Date();

        // const allUsers = await Users.find();
        const allUsers = await Users.find({ d_id: '504000540804382741' });
        let allListings = new Map();

        for (let user of allUsers) {
          let refresh = new Refresh(this.client, user);
          await refresh.init();

          await refresh.addListings();
          await refresh.deleteListings();
          await refresh.syncListingPrices();

          let updateLowestRes = await refresh.updateLowest(allListings);

          if (updateLowestRes) {
            this.emit('newUpdate', updateLowestRes);
          }

          let addOrdersRes = await refresh.addOrders();

          if (addOrdersRes) {
            this.emit('newUpdate', addOrdersRes);
          }

          await refresh.deleteOrders();

          let syncOrdersRes = await refresh.syncOrders();

          if (syncOrdersRes) {
            this.emit('newUpdate', syncOrdersRes);
          }

          let confirmOrdersRes = undefined;
          let genShipping = undefined;

          const crntDate = moment().tz('America/New_York');

          if (user.settings.orderRefresh == 'live') {
            console.log('confirming live orders');
            confirmOrdersRes = await refresh.confirmOrders();
            genShipping = await refresh.genShipping();
          } else if (user.settings.orderRefresh == 'daily' && crntDate.hour() == 0 && crntDate.minute() == 1) {
            console.log('confirming orders\n');
            confirmOrdersRes = await refresh.confirmOrders();
            genShipping = await refresh.genShipping();
          }

          if (confirmOrdersRes) {
            this.emit('newUpdate', confirmOrdersRes);
          }

          if (genShipping) {
            this.emit('newUpdate', genShipping);
          }

          let earningsRes = await refresh.earnings();

          if (earningsRes) {
            this.emit('newUpdate', earningsRes);
          }
        }
      } catch (err) {
        console.log(err);
      }

      await sleep(oneMinute);
    }
  };
};
