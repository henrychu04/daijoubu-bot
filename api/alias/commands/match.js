const check = require('./check.js');
const updateReq = require('../../requests/updateReq.js');
const getAllListings = require('../../requests/getAllListings.js');
const syncListingPrices = require('../../refresh/events/syncListingPrices.js');

const response = {
  SUCCESS: 'success',
  NO_ITEMS: 'no_items',
  NO_CHANGE: 'no_change',
  EXIT: 'exit',
  TIMEOUT: 'timeout',
  ERROR: 'error',
};

module.exports = async (client, loginToken, user, message) => {
  let returnObj = {
    returnedEnum: null,
    all: null,
    msg: null,
  };

  let listings = await getAllListings(client, loginToken);

  let listingObj = [];

  listings.listing.forEach(async (listing) => {
    listingObj = checkListings(listing, listingObj);
  });

  let checkRes = await check(user);

  if (checkRes.returnedEnum == response.SUCCESS) {
    for (let [index, crnt] of checkRes.newLowestAsksArray) {
      if (index == 0) {
        let initialString = 'Current Listings With a Lower Ask:';
        initialString += crnt;
        await message.channel.send('```' + initialString + '```');
      } else {
        await message.channel.send('```' + crnt + '```');
      }
    }
  } else if (checkRes.returnedEnum == response.NO_CHANGE) {
    returnObj.returnedEnum = response.NO_CHANGE;
    return returnObj;
  } else if (checkRes.returnedEnum == response.NO_ITEMS) {
    returnObj.returnedEnum = response.NO_ITEMS;
    return returnObj;
  }

  await message.channel.send('```' + `Enter 'all' or listing number(s) to update\nEnter 'n' to cancel` + '```');

  let nums = [];
  let all = false;
  let exit = false;
  let stopped = false;

  const collector = message.channel.createMessageCollector((msg) => msg.author.id == message.author.id, {
    time: 30000,
  });

  for await (const msg of collector) {
    nums = msg.content.split(' ');

    if (msg.content.toLowerCase() == 'n') {
      collector.stop();
      stopped = true;
      exit = true;
      console.log('Canceled\n');
    } else if (checkNumParams(nums)) {
      if (nums[0].toLowerCase() == 'all') {
        collector.stop();
        all = true;
        stopped = true;
      } else {
        let valid = true;

        for (let crnt of nums) {
          if (parseInt(crnt) >= listingObj.length) {
            valid = false;
            await msg.channel.send(
              '```' +
                'One or more entered listing number(s) do not exist\nPlease enter existing listing numbers(s)' +
                '```'
            );
            break;
          }
        }

        if (valid) {
          collector.stop();
          stopped = true;
        }
      }
    } else {
      await msg.channel.send('```' + `Invalid format\nEnter 'all' or listing number(s)` + '```');
    }
  }

  if (exit) {
    returnObj.returnedEnum = response.EXIT;
    return returnObj;
  } else if (!stopped) {
    returnObj.returnedEnum.TIMEOUT;
    return returnObj;
  }

  const msg = await message.channel.send('```' + `Updating ...` + '```');

  if (all) {
    for (let listing of listingObj) {
      if (listing.price_cents > listing.product.lowest_price_cents) {
        let updateRes = await updateReq(client, loginToken, listing);

        if (updateRes != 200) {
          throw new Error('Error updating');
        }
      }
    }
  } else {
    for (let num of nums) {
      for (let listing of listingObj) {
        if (listing.id == checkRes.userListingsCheckArray[parseInt(num)].id) {
          let updateRes = await updateReq(client, loginToken, listing);

          if (updateRes != 200) {
            throw new Error('Error updating');
          }
        }
      }
    }
  }

  await syncListingPrices(client, user, loginToken);

  returnObj.returnedEnum = response.SUCCESS;
  returnObj.all = all;
  returnObj.msg = msg;

  return returnObj;
};

function checkListings(obj, listingObj) {
  if (!obj.is_consigned) {
    let ask = obj.price_cents;

    let lowestAsk = obj.product.lowest_price_cents;
    let lower = false;

    if (parseInt(lowestAsk) < parseInt(ask)) {
      lower = true;
    }

    if (lower) {
      listingObj.push(obj);
    }
  }

  return listingObj;
}

function checkNumParams(nums) {
  if (nums.length == 1) {
    if (nums[0].toLowerCase() == 'all') {
      return true;
    } else if (!isNaN(nums[0])) {
      return true;
    } else {
      return false;
    }
  }

  for (let crnt of nums) {
    if (isNaN(crnt)) {
      return false;
    }
  }

  return true;
}
