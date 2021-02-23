const Listings = require('../../../models/listings');

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
    listingArray: null,
    listingIds: null,
  };

  const userListings = await Listings.find({ d_id: user.d_id });
  const userListingsArray = userListings[0].aliasListings;

  if (userListingsArray.length == 0) {
    returnObj.returnedEnum = response.NO_ITEMS;
    return returnObj;
  }

  let listingArray = [];
  let listingIds = [];
  let j = 0;

  for (let i = 0; i < userListingsArray.length; i++) {
    if (i % 15 == 0 && i != 0) {
      j++;
    }

    let obj = userListingsArray[i];
    listingIds.push(obj.id);

    if (listingArray[j] == undefined) {
      listingArray[j] = `\n\t${i}. ${obj.name}\n\t\tsize: ${obj.size} - $${obj.price / 100}\n\t\tUpdate Rate: ${
        obj.setting == 'manual' ? 'Manual' : 'Live'
      }\n`;
    } else {
      listingArray[j] += `\n\t${i}. ${obj.name}\n\t\tsize: ${obj.size} - $${obj.price / 100}\n\t\tUpdate Rate: ${
        obj.setting == 'manual' ? 'Manual' : 'Live'
      }\n`;
    }
  }

  returnObj.returnedEnum = response.SUCCESS;
  returnObj.listingArray = listingArray;
  returnObj.listingIds = listingIds;

  return returnObj;
};
