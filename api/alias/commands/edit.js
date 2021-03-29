const mongoListings = require('./mongoListings.js');
const getAllListings = require('../../requests/getAllListings');
const editReq = require('../../requests/editReq.js');
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
    msg: null,
    editOthers: null,
  };

  let allListings = await getAllListings(client, loginToken);

  let listingsRes = await mongoListings(user);

  if (listingsRes.returnedEnum == response.SUCCESS) {
    for (let [index, crnt] of listingsRes.listingArray.entries()) {
      if (index == 0) {
        let initialString = 'Current Listing(s):';
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

  let input = '';
  let exit = false;
  let stopped = false;

  await message.channel.send('```' + `Enter one listing number to edit\nEnter 'n' to cancel` + '```');

  const collector1 = message.channel.createMessageCollector((msg) => msg.author.id == message.author.id, {
    time: 30000,
  });

  for await (const msg of collector1) {
    input = msg.content.toLowerCase();

    if (input == 'n') {
      collector1.stop();
      stopped = true;
      exit = true;
      console.log('Canceled');
    } else if (!isNaN(input)) {
      if (parseInt(input) >= listingsRes.listingIds.length) {
        msg.channel.send(
          '```' + 'Entered listing number does not exist\nPlease enter existing listing numbers' + '```'
        );
      } else {
        collector1.stop();
        stopped = true;
      }
    } else {
      msg.channel.send('```' + `Invalid format\nEnter a valid number` + '```');
    }
  }

  if (exit) {
    returnObj.returnedEnum = response.EXIT;
    return returnObj;
  } else if (!stopped) {
    returnObj.returnedEnum = response.TIMEOUT;
    return returnObj;
  }

  await message.channel.send('```' + `Enter new price or 'lowest'\nEnter 'n' to cancel` + '```');

  let listingObj = await editReq.getListing(client, loginToken, listingsRes.listingIds[parseInt(input)]);

  let matchedArray = [];

  for (let listing of allListings.listing) {
    if (
      listing.product.name == listingObj.listing.product.name &&
      parseFloat(listing.size_option.value) == parseFloat(listingObj.listing.size_option.value) &&
      listing.id != listingObj.listing.id
    ) {
      matchedArray.push(listing);
    }
  }

  let lowest = listingObj.listing.product.lowest_price_cents / 100;
  let price = 0;

  const collector2 = message.channel.createMessageCollector((msg) => msg.author.id == message.author.id, {
    time: 30000,
  });

  for await (const msg of collector2) {
    price = msg.content.toLowerCase();

    if (price == 'lowest') {
      collector2.stop();
      stopped = true;
      price = lowest;
    } else if (price == 'n') {
      collector2.stop();
      stopped = true;
      exit = true;
      console.log('Canceled');
    } else if (!isNaN(price)) {
      collector2.stop();
      stopped = true;

      let confirm = false;

      while (!confirm && parseInt(price) < lowest) {
        let confirmRes = await confirmEdit(lowest, price, msg);

        confirm = confirmRes.confirm;
        price = confirmRes.price;

        if (price == -1) {
          exit = true;
        } else if (price == -2) {
          stopped = true;
        }
      }
    } else {
      await msg.channel.send('```' + `Incorrect format\nEnter 'lowest' or a valid number` + '```');
    }
  }

  if (exit) {
    returnObj.returnedEnum = response.EXIT;
    return returnObj;
  } else if (!stopped) {
    returnObj.returnedEnum = response.TIMEOUT;
    return returnObj;
  }

  let editOthers = false;

  if (matchedArray.length != 0) {
    await message.channel.send(
      '```' +
        `${matchedArray.length} listing(s) match the specified listing name and size:\n\t${matchedArray[0].product.name} size ${matchedArray[0].size_option.value}\n\nWould you like to edit all matched listing prices?\n\nEnter 'y' or 'n'` +
        '```'
    );

    const collector3 = message.channel.createMessageCollector((msg) => msg.author.id == message.author.id, {
      time: 30000,
    });

    for await (const msg of collector3) {
      let input = msg.content.toLowerCase();

      if (input == 'y' || input == 'n') {
        if (input == 'n') {
          collector3.stop();
        } else {
          collector3.stop();
          editOthers = true;
        }

        stopped = true;
      } else {
        await msg.channel.send('```' + `Enter either 'y' or 'n'` + '```');
      }
    }

    if (!stopped) {
      returnObj.returnedEnum = response.TIMEOUT;
      return returnObj;
    }
  }

  const msg = await message.channel.send('```Editing ...```');

  let editRes = 0;

  listingObj.listing.price_cents = (parseInt(price) * 100).toString();

  editRes = await editReq.doEdit(client, loginToken, listingsRes.listingIds[input].id, listingObj);

  if (editRes != 200) {
    returnObj.returnedEnum = response.ERROR;
    return returnObj;
  }

  if (editOthers) {
    for (let obj of matchedArray) {
      obj.price_cents = (parseInt(price) * 100).toString();

      let newObj = {
        listing: obj,
      };

      editRes = await editReq.doEdit(client, loginToken, newObj.listing.id, newObj);

      if (editRes != 200) {
        returnObj.returnedEnum = response.ERROR;
        return returnObj;
      }
    }
  }

  let refresh = new Refresh(client, user);
  await refresh.init();
  await refresh.syncListingPrices();

  returnObj.returnedEnum = response.SUCCESS;
  returnObj.msg = msg;
  returnObj.editOthers = editOthers;

  return returnObj;
};

async function confirmEdit(lowest, price, message) {
  let confirm = false;

  await message.channel.send(
    '```' +
      `Current lowest ask: $${lowest}\nYou entered $${price}, a lower asking price than the current lowest asking price of $${lowest}\nEnter a new price, 'y' to confirm, or 'n' to cancel` +
      '```'
  );

  const collector = new Discord.MessageCollector(message.channel, (m) => m.author.id === message.author.id, {
    time: 30000,
  });

  let stopped = false;

  for await (const message of collector) {
    let input = message.content.toLowerCase();

    if (input == 'y') {
      collector.stop();
      stopped = true;
      confirm = true;
    } else if (input == 'n') {
      collector.stop();
      price = -1;
      stopped = true;
      confirm = true;
      console.log('Canceled');
    } else if (!isNaN(input)) {
      collector.stop();
      stopped = true;
      price = input;
      confirm = false;
    } else {
      message.channel.send('Incorrect format\nEnter a valid input');
    }
  }

  if (!stopped) {
    console.log('Timed out\n');
    confirm = true;
    price = -2;
  }

  return { confirm: confirm, price: price };
}
