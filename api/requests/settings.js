const Users = require('../../models/users.js');
const Listings = require('../../models/listings');

const response = {
  SUCCESS: 'success',
  NO_ITEMS: 'no_items',
  NO_CHANGE: 'no_change',
  EXIT: 'exit',
  TIMEOUT: 'timeout',
  ERROR: 'error',
};

async function editManualNotif(message, user) {
  await message.channel.send(
    '```' + `Editing Manual Listing Notifications\n\tEnter 'on' or 'off'\n\tEnter 'n' to cancel` + '```'
  );

  let exit = false;
  let stopped = false;

  const collector = message.channel.createMessageCollector((msg) => msg.author.id == message.author.id, {
    time: 30000,
  });

  for await (const msg of collector) {
    let input = msg.content.toLowerCase();

    if (input == 'on') {
      await Users.updateOne({ d_id: user.d_id }, { $set: { 'settings.manualNotif': true } }, async (err) => {
        if (!err) {
          await msg.channel.send('```Manual Listing Notifications edited successfully```');
          collector.stop();
          stopped = true;
          console.log('!alias settings edit completed\n');
        }
      }).catch((err) => {
        throw new Error(err);
      });
    } else if (input == 'off') {
      await Users.updateOne({ d_id: user.d_id }, { $set: { 'settings.manualNotif': false } }, async (err) => {
        if (!err) {
          await msg.channel.send('```Manual Listing Notifications edited successfully```');
          collector.stop();
          stopped = true;
          console.log('!alias settings edit completed\n');
        }
      }).catch((err) => {
        throw new Error(err);
      });
    } else if (input == 'n') {
      collector.stop();
      stopped = true;
      exit = true;
    } else {
      await msg.channel.send('```' + `Invalid input enter 'on' or 'off'\nEnter 'n' to cancel` + '```');
    }
  }

  if (exit) {
    return response.EXIT;
  } else if (!stopped) {
    return response.TIMEOUT;
  } else {
    return response.SUCCESS;
  }
}

async function editMaxRange(message, user) {
  await message.channel.send(
    '```' +
      `Editing max price adjustment range for live listings\n\tEnter new number value\n\tEnter 'n' to cancel` +
      '```'
  );

  let exit = false;
  let stopped = false;

  const collector = message.channel.createMessageCollector((msg) => msg.author.id == message.author.id, {
    time: 30000,
  });

  for await (const msg of collector) {
    let input = msg.content.toLowerCase();

    if (!isNaN(input)) {
      await Users.updateOne({ d_id: user.d_id }, { $set: { 'settings.maxAdjust': input } }, async (err) => {
        if (!err) {
          await msg.channel.send('```Max price adjustment range for live listings edited successfully```');
          collector.stop();
          stopped = true;
          console.log('!alias settings edit completed\n');
        }
      }).catch((err) => {
        throw new Error(err);
      });
    } else if (input == 'n') {
      collector.stop();
      stopped = true;
      exit = true;
    } else {
      await msg.channel.send('```' + `Enter valid number` + '```');
    }
  }

  if (exit) {
    return response.EXIT;
  } else if (!stopped) {
    return response.TIMEOUT;
  } else {
    return response.SUCCESS;
  }
}

async function editOrderRate(message, user) {
  await message.channel.send(
    '```' + `Editing order confirmation refresh rate\n\tEnter 'live' or 'daily'\n\tEnter 'n' to cancel` + '```'
  );

  let exit = false;
  let stopped = false;

  const collector = message.channel.createMessageCollector((msg) => msg.author.id == message.author.id, {
    time: 30000,
  });

  for await (const msg of collector) {
    let input = msg.content.toLowerCase();

    if (input == 'live' || input == 'daily') {
      await Users.updateOne({ d_id: user.d_id }, { $set: { 'settings.orderRefresh': input } }, async (err) => {
        if (!err) {
          await msg.channel.send('```Order confirmation refresh rate edited successfully```');
          collector.stop();
          stopped = true;
          console.log('!alias settings edit completed\n');
        }
      }).catch((err) => {
        throw new Error(err);
      });
    } else if (input == 'n') {
      collector.stop();
      stopped = true;
      exit = true;
    } else {
      await msg.channel.send('```' + `Enter either 'live' or 'daily'` + '```');
    }
  }

  if (exit) {
    return response.EXIT;
  } else if (!stopped) {
    return response.TIMEOUT;
  } else {
    return response.SUCCESS;
  }
}

async function editSpecifiedListingRate(message, user) {
  let allListingsRes = await allListings(user);

  if (allListingsRes.returnedEnum == response.SUCCESS) {
    for (let i = 0; i < allListingsRes.listingArray.length; i++) {
      if (i == 0) {
        let initialString = 'Current Listings:';
        initialString += allListingsRes.listingArray[i];
        await message.channel.send('```' + initialString + '```');
      } else {
        await message.channel.send('```' + allListingsRes.listingArray[i] + '```');
      }
    }
  } else {
    return response.NO_ITEMS;
  }

  let nums = '';
  let exit = false;
  let stopped = false;
  let all = false;

  await message.channel.send('```' + `Enter 'all' or listing number(s) to edit\nEnter 'n' to cancel` + '```');

  const collector1 = message.channel.createMessageCollector((msg) => msg.author.id == message.author.id, {
    time: 30000,
  });

  for await (const msg of collector1) {
    nums = msg.content.toLowerCase();
    let split = nums.split(' ');

    if (nums == 'n') {
      collector1.stop();
      stopped = true;
      exit = true;
      console.log('Canceled');
    } else if (nums == 'all') {
      collector1.stop();
      stopped = true;
      all = true;
    } else if (checkNumInputs(split, allListingsRes.listingIds.length - 1)) {
      collector1.stop();
      nums = split;
      stopped = true;
    } else {
      await msg.channel.send('```' + `Invalid format\nEnter valid number(s)` + '```');
    }
  }

  if (exit) {
    return response.EXIT;
  } else if (!stopped) {
    return response.TIMEOUT;
  }

  await message.channel.send('```' + `Enter 'live' or 'manual'\nEnter 'n' to cancel` + '```');

  let input = '';
  let editMsg = null;

  const collector2 = message.channel.createMessageCollector((msg) => msg.author.id == message.author.id, {
    time: 30000,
  });

  for await (const msg of collector2) {
    input = msg.content.toLowerCase();

    if (input == 'n') {
      collector2.stop();
      stopped = true;
      exit = true;
      console.log('Canceled');
    } else if (input == 'live' || input == 'manual') {
      editMsg = await msg.channel.send('```' + 'Editing ...' + '```');
      collector2.stop();
      stopped = true;
    } else {
      await msg.channel.send('```' + `Invalid format\nEnter 'live' or 'manual` + '```');
    }
  }

  if (exit) {
    return response.EXIT;
  } else if (!stopped) {
    return response.TIMEOUT;
  }

  let i = 0;

  if (all) {
    for (let id of allListingsRes.listingIds) {
      await Listings.updateOne({ 'aliasListings.id': id }, { $set: { 'aliasListings.$.setting': input } }).catch(
        (err) => {
          throw new Error(err);
        }
      );
    }

    await editMsg.edit('```' + 'Listing update rate(s) updated successfully' + '```');
    console.log('Listing refresh rate(s) successfully updated\n');
  } else {
    for (let num of nums) {
      await Listings.updateOne(
        { 'aliasListings.id': allListingsRes.listingIds[parseInt(num)] },
        { $set: { 'aliasListings.$.setting': input } }
      ).catch((err) => {
        throw new Error(err);
      });
    }

    await editMsg.edit('```' + 'Listing update rate(s) updated successfully' + '```');
    console.log('Listing refresh rate(s) successfully updated\n');
  }

  return response.SUCCESS;
}

async function editDefaultListingRate(message, user) {
  let exit = false;
  let stopped = false;

  await message.channel.send(
    '```' + `Editing default listing update rate\n\tEnter 'live' or 'manual'\n\tEnter 'n' to cancel` + '```'
  );

  const collector = message.channel.createMessageCollector((msg) => msg.author.id == message.author.id, {
    time: 30000,
  });

  for await (const msg of collector) {
    let input = msg.content.toLowerCase();

    if (input == 'live' || input == 'manual') {
      await Users.updateOne({ d_id: user.d_id }, { $set: { 'settings.adjustListing': input } }, async (err) => {
        if (!err) {
          await msg.channel.send('```Listing update refresh rate edited successfully```');
          collector.stop();
          stopped = true;
          console.log('!alias settings edit completed\n');
        }
      }).catch((err) => {
        throw new Error(err);
      });
    } else if (input == 'n') {
      collector.stop();
      stopped = true;
      exit = true;
    } else {
      await msg.channel.send('```' + `Enter either 'live' or 'manual'` + '```');
    }
  }

  if (exit) {
    return response.EXIT;
  } else if (!stopped) {
    return response.TIMEOUT;
  } else {
    return response.SUCCESS;
  }
}

async function allListings(user) {
  const userListings = await Listings.find({ d_id: user.d_id });
  const userListingsArray = userListings[0].aliasListings;
  let listingArray = [];

  if (userListingsArray.length == 0) {
    return { returnedEnum: response.NO_ITEMS, listingArray: null, listingIds: null };
  }

  let listingIds = [];
  let j = 0;

  for (let i = 0; i < userListingsArray.length; i++) {
    let obj = userListingsArray[i];
    listingIds.push(obj.id);

    if (i % 15 == 0 && i != 0) {
      j++;
    }

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

  return { returnedEnum: response.SUCCESS, listingArray: listingArray, listingIds: listingIds };
}

function checkNumInputs(split, arrayLength) {
  for (let i = 0; i < split.length; i++) {
    if (isNaN(split[i])) {
      return false;
    } else {
      if (parseInt(split[i]) > arrayLength) {
        return false;
      }
    }
  }

  return true;
}

module.exports = { editOrderRate, editDefaultListingRate, editMaxRange, editSpecifiedListingRate, editManualNotif };
