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
  let count = 0;

  for (let [index, crnt] of userListingsArray.entries()) {
    if (index % 15 == 0 && index != 0) {
      count++;
    }

    listingIds.push(crnt.id);

    if (listingArray[count] == undefined) {
      listingArray[count] = `\n\t${index}. ${crnt.name}\n\t\tsize: ${crnt.size} - $${
        crnt.price / 100
      }\n\t\tUpdate Rate: ${crnt.setting == 'manual' ? 'Manual' : 'Live'}\n`;
    } else {
      listingArray[count] += `\n\t${index}. ${crnt.name}\n\t\tsize: ${crnt.size} - $${
        crnt.price / 100
      }\n\t\tUpdate Rate: ${crnt.setting == 'manual' ? 'Manual' : 'Live'}\n`;
    }
  }

  returnObj.returnedEnum = response.SUCCESS;
  returnObj.listingArray = listingArray;
  returnObj.listingIds = listingIds;

  return returnObj;
};
