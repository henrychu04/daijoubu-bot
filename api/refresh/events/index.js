const addListings = require('./addListings.js');
const deleteListings = require('./deleteListings.js');
const syncListingPrices = require('./syncListingPrices.js');
const updateLowest = require('./updateLowest.js');
const confirmOrders = require('./confirmOrders.js');
const addOrders = require('./addOrders.js');
const deleteOrders = require('./deleteOrders.js');
const syncOrders = require('./syncOrders.js');
const earnings = require('./earnings.js');

const Listings = require('../../../models/listings.js');
const Orders = require('../../../models/orders.js');

let returningUser = null;

module.exports = class refreshClass {
  constructor(client, user, loginToken, userListingsArray, userOrdersArray, aliasListings, aliasOrders) {
    this.client = client;
    this.user = user;
    this.loginToken = loginToken;
    this.userListingsArray = userListingsArray;
    this.userOrdersArray = userOrdersArray;
    this.aliasListings = aliasListings;
    this.aliasOrders = aliasOrders;

    returningUser = this.user;
  }

  addListings = async () => {
    let modified = await addListings(this.user, this.userListingsArray, this.aliasListings);

    if (modified) {
      const userListings = await Listings.find({ d_id: this.user.d_id });
      this.userListingsArray = userListings[0].aliasListings;
    }
  };

  deleteListings = async () => {
    let modified = await deleteListings(this.user, this.userListingsArray, this.aliasListings);

    if (modified) {
      const userListings = await Listings.find({ d_id: this.user.d_id });
      this.userListingsArray = userListings[0].aliasListings;
    }
  };

  syncListingPrices = async () => {
    let modified = await syncListingPrices(this.userListingsArray, this.aliasListings);

    if (modified) {
      const userListings = await Listings.find({ d_id: this.user.d_id });
      this.userListingsArray = userListings[0].aliasListings;
    }
  };

  updateLowest = async (allListings) => {
    let newUpdate = await updateLowest(this.client, this.user, this.loginToken, allListings);

    if (newUpdate) {
      return { newUpdate, returningUser };
    }
  };

  addOrders = async () => {
    let newUpdate = await addOrders(this.user, this.userOrdersArray, this.aliasOrders);

    if (newUpdate) {
      const userOrders = await Orders.find({ d_id: this.user.d_id });
      this.userOrdersArray = userOrders[0].aliasOrders;

      return { newUpdate, returningUser };
    }
  };

  deleteOrders = async () => {
    let modified = await deleteOrders(this.user, this.userOrdersArray, this.aliasOrders);

    if (modified) {
      const userOrders = await Orders.find({ d_id: this.user.d_id });
      this.userOrdersArray = userOrders[0].aliasOrders;
    }
  };

  syncOrders = async () => {
    let newUpdate = await syncOrders(this.user, this.userOrdersArray, this.aliasOrders);

    if (newUpdate) {
      return { newUpdate, returningUser };
    }
  };

  confirmOrders = async () => {
    let newUpdate = await confirmOrders(this.client, this.loginToken, this.user, this.aliasOrders);

    if (newUpdate) {
      const userOrders = await Orders.find({ d_id: this.user.d_id });
      this.userOrdersArray = userOrders[0].aliasOrders;

      return { newUpdate, returningUser };
    }
  };

  earnings = async () => {
    let newUpdate = await earnings(this.client, this.user, this.loginToken);

    if (newUpdate) {
      return { newUpdate, returningUser };
    }
  };
};
