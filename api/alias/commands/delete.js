const deleteReq = require('../../requests/deleteReq.js');
const allListings = require('./mongoListings.js');
const Refresh = require('../../refresh/events/index.js');

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

  let listingsRes = await allListings(user);

  if (listingsRes.returnedEnum == response.SUCCESS) {
    for (let [index, crnt] of listingsRes.listingArray.entries()) {
      if (index == 0) {
        let initialString = 'Current Listings:';
        initialString += crnt;
        await message.channel.send('```' + initialString + '```');
      } else {
        await message.channel.send('```' + crnt + '```');
      }
    }
  } else if (listingsRes.returnedEnum == response.NO_ITEMS) {
    returnObj.returnedEnum = response.NO_ITEMS;
    return returnObj;
  }

  await message.channel.send('```' + `Enter 'all' or listing number(s) to delete\nEnter 'n' to cancel` + '```');

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
      console.log('Canceled');
    } else if (checkNumParams(nums)) {
      if (nums[0].toLowerCase() == 'all') {
        collector.stop();
        all = true;
        stopped = true;
      } else {
        let valid = true;

        for (let num of nums) {
          if (parseInt(num) >= listingsRes.listingIds.length) {
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
    returnObj.returnedEnum = response.TIMEOUT;
    return returnObj;
  }

  const msg = await message.channel.send('```' + `Deleting ...` + '```');

  let deleteRes = 0;

  if (all) {
    for (let id of listingsRes.listingIds) {
      deleteRes = await deleteReq(client, loginToken, user, id);

      if (deleteRes != 200) {
        throw new Error('Error deleting');
      }
    }
  } else {
    for (let num of nums) {
      deleteRes = await deleteReq(client, loginToken, user, listingsRes.listingIds[parseInt(num)]);

      if (deleteRes != 200) {
        throw new Error('Error deleting');
      }
    }
  }

  let refresh = new Refresh();
  refresh.deleteListings();

  returnObj.returnedEnum = response.SUCCESS;
  returnObj.all = all;
  returnObj.msg = msg;

  return returnObj;
};

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
