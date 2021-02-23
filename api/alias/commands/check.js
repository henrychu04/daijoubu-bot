const Listings = require('../../../models/listings.js');

const response = {
  SUCCESS: 'success',
  NO_ITEMS: 'no_items',
  NO_CHANGE: 'no_change',
  EXIT: 'exit',
  TIMEOUT: 'timeout',
  ERROR: 'error',
};

module.exports = async (user) => {
  let returnObj = {
    returnedEnum: null,
    newLowestAsksArray: null,
    userListingsCheckArray: null,
  };

  const userListings = await Listings.find({ d_id: user.d_id });
  const userListingsArray = userListings[0].aliasListings;

  if (userListingsArray.length == 0) {
    returnObj.returnedEnum = response.NO_ITEMS;
    return returnObj;
  }

  let newLowestAsksArray = [];
  let userListingsCheckArray = [];
  let num = 0;
  let j = 0;

  for (let i = 0; i < userListingsArray.length; i++) {
    if (i % 15 == 0 && i != 0) {
      j++;
    }

    let listing = userListingsArray[i];

    if (listing.price > listing.lowest) {
      userListingsCheckArray.push(listing);

      if (newLowestAsksArray[j] == undefined) {
        newLowestAsksArray[j] = `\n\t${num}. ${listing.name}\n\t\tsize: ${listing.size} $${listing.price / 100} => $${
          listing.lowest / 100
        }\n`;
      } else {
        newLowestAsksArray[j] += `\n\t${num}. ${listing.name}\n\t\tsize: ${listing.size} $${listing.price / 100} => $${
          listing.lowest / 100
        }\n`;
      }

      num++;
    }
  }

  if (userListingsCheckArray.length != 0) {
    returnObj.returnedEnum = response.SUCCESS;
    returnObj.newLowestAsksArray = newLowestAsksArray;
    returnObj.userListingsCheckArray = userListingsCheckArray;

    return returnObj;
  } else {
    returnObj.returnedEnum = response.NO_CHANGE;
    return returnObj;
  }
};
