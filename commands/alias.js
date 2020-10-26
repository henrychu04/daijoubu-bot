const fetch = require('node-fetch');
const Discord = require('discord.js');
const encryption = require('../scripts/encryption');
const refresh = require('../scripts/refresh');

const Users = require('../models/users');
const Listings = require('../models/listings');

const response = {
  SUCCESS: 'success',
  NO_ITEMS: 'no_items',
  NO_CHANGE: 'no_change',
  EXIT: 'exit',
  TIMEDOUT: 'timedout',
};

exports.run = async (client, message, args) => {
  try {
    const query = message.content.slice(6);
    const command = args[0];
    let loginToken = '';
    const id = message.author.id;
    let user = null;

    if (args.length == 0) {
      throw new Error('Empty command');
    }

    if (
      command == 'check' ||
      command == 'update' ||
      command == 'listings' ||
      command == 'delete' ||
      command == 'edit' ||
      command == 'orders' ||
      command == 'confirm' ||
      command == 'settings' ||
      command == 'list' ||
      command == 'me'
    ) {
      user = await Users.find({ d_id: id });

      if (user.length == 0) {
        throw new Error('Not logged in');
      }

      user = user[0];
      loginToken = user.login;
    }

    let toReturn = '';
    let returnedEnum = null;

    switch (command) {
      case 'check':
        let checkListingObj = [];

        if (args.length < 2) {
          [toReturn, returnedEnum, checkListingObj] = await check(client, loginToken);
        } else {
          throw new Error('Too many parameters');
        }

        if (returnedEnum == response.SUCCESS) {
          toReturn = '```' + toReturn + '```';
        } else if (returnedEnum == response.NO_CHANGE) {
          toReturn = '```All Listing(s) Match Their Lowest Asks```';
        } else if (returnedEnum == response.NO_ITEMS) {
          toReturn = '```Account Currently Has No Items Listed```';
        }
        break;
      case 'update':
        let updateAll = false;
        let updateMsg = null;

        if (args.length > 1) {
          throw new Error('Too many parameters');
        }

        [returnedEnum, updateAll, updateMsg] = await update(client, loginToken, message);

        if (returnedEnum == response.SUCCESS) {
          if (updateAll) {
            await updateMsg
              .edit('```All Listing(s) Updated Successfully```')
              .then(console.log(`${message} completed\n`));
          } else {
            await updateMsg
              .edit('```Specified Listing(s) Updated Successfully```')
              .then(console.log(`${message} completed\n`));
          }
          await refresh(client, loginToken, user);
        } else if (returnedEnum == response.NO_CHANGE) {
          toReturn = '```All Listing(s) Already Match Their Lowest Asks```';
        } else if (returnedEnum == response.NO_ITEMS) {
          toReturn = '```Account Currently Has No Items Listed```';
        } else if (returnedEnum == response.EXIT) {
          toReturn = '```Canceled```';
        } else if (returnedEnum == response.TIMEDOUT) {
          toReturn = '```Command timed out```';
        }
        break;
      case 'listings':
        if (args.length > 1) {
          throw new Error('Too many parameters');
        }

        let listingsListingObj = [];

        [toReturn, returnedEnum, listingsListingObj] = await allListings(user);

        if (returnedEnum == response.SUCCESS) {
          toReturn = '```' + toReturn + '```';
        } else if (returnedEnum == response.NO_ITEMS) {
          toReturn = '```Account Currently Has No Items Listed```';
        }
        break;
      case 'delete':
        if (args.length > 1) {
          throw new Error('Too many parameters');
        }

        let deleteAll = false;
        let deleteMsg = null;

        [returnedEnum, deleteAll, deleteMsg] = await deleteSearch(client, loginToken, message, user);

        if (returnedEnum == response.SUCCESS) {
          if (deleteAll) {
            await deleteMsg
              .edit('```All Listing(s) Deleted Successfully```')
              .then(console.log(`${message} completed\n`));
          } else {
            await deleteMsg
              .edit('```Specified Listing(s) Deleted Successfully```')
              .then(console.log(`${message} completed\n`));
          }
          await refresh(client, loginToken, user);
        } else if (returnedEnum == response.NO_ITEMS) {
          toReturn = '```Account Currently Has No Items Listed```';
        } else if (returnedEnum == response.EXIT) {
          toReturn = '```Canceled```';
        } else if (returnedEnum == response.TIMEDOUT) {
          toReturn = '```Command timed out```';
        }
        break;
      case 'edit':
        let editMsg = null;

        if (args.length > 1) {
          throw new Error('Too many parameters');
        }

        [returnedEnum, editMsg] = await editListing(client, loginToken, user, message);

        if (returnedEnum == response.SUCCESS) {
          await editMsg.edit('```Listing Edited Successfully```').then(console.log(`${message} completed\n`));
          await refresh(client, loginToken, user);
        } else if (returnedEnum == response.EXIT) {
          toReturn = '```Canceled```';
        } else if (returnedEnum == response.TIMEDOUT) {
          toReturn = '```Command timed out```';
        }
        break;
      case 'orders':
        if (args.length > 1) {
          throw new Error('Too many parameters');
        }

        [toReturn, returnedEnum] = await getOrders(client, loginToken);

        if (returnedEnum == response.SUCCESS) {
          toReturn = '```' + toReturn + '```';
        } else if (returnedEnum == response.NO_ITEMS) {
          toReturn = '```Account Currently Has No Open Orders```';
        }
        break;
      case 'confirm':
        let confirmAll = false;
        let confirmMsg = null;

        [returnedEnum, confirmAll, confirmMsg] = await confirm(client, loginToken, message);

        if (returnedEnum == response.SUCCESS) {
          if (confirmAll) {
            await confirmMsg
              .edit('```All Orders(s) Confirmed Successfully```')
              .then(console.log(`${message} completed\n`));
          } else {
            await confirmMsg
              .edit('```Specified Orders(s) Confirmed Successfully```')
              .then(console.log(`${message} completed\n`));
          }
        } else if (returnedEnum == response.NO_ITEMS) {
          toReturn = '```No Open Order(s) Currently On Account```';
        } else if (returnedEnum == response.NO_CHANGE) {
          toReturn = '```Currently All Open Order(s) Are Confirmed```';
        } else if (returnedEnum == response.EXIT) {
          toReturn = '```Canceled```';
        } else if (returnedEnum == response.TIMEDOUT) {
          toReturn = '```Command timed out```';
        }
        break;
      case 'settings':
        let edit = false;

        if (args.length > 2) {
          throw new Error('Too many parameters');
        } else if (args[1] == 'edit') {
          edit = true;
        } else if (args[1] && args[1] != 'edit') {
          throw new Error('Incorrect format');
        }

        [toReturn, returnedEnum] = await settings(client, message, user, edit);

        if (returnedEnum == response.SUCCESS) {
          toReturn = toReturn;
        } else if (returnedEnum == response.EXIT) {
          toReturn = '```Canceled```';
        } else if (returnedEnum == response.TIMEDOUT) {
          toReturn = '```Command timed out```';
        } else if (returnedEnum == response.NO_ITEMS) {
          toReturn = '```Account Currently Has No Items Listed```';
        }
        break;
      case 'list':
        let params = message.content.slice(11).split(' ');

        let valid = false;
        let sizingArray = [];
        let searchParams = '';
        let listString = '';
        let listMsg = null;

        [valid, returnedEnum, sizingArray, searchParams] = await checkListParams(params);

        if (!valid && returnedEnum == response.NO_CHANGE) {
          throw new Error('Invalid list command');
        } else if (valid) {
          [returnedEnum, listString, listMsg] = await list(client, message, loginToken, sizingArray, searchParams);
        }

        if (returnedEnum == response.SUCCESS) {
          await listMsg.edit('```' + listString + '```').then(console.log(`${message} completed\n`));
          await refresh(client, loginToken, user);
        } else if (returnedEnum == response.EXIT) {
          toReturn = '```Canceled```';
        } else if (returnedEnum == response.NO_CHANGE) {
          toReturn = '```No New Item(s) Listed```';
        } else if (returnedEnum == response.TIMEDOUT) {
          toReturn = '```Command timed out```';
        }
        break;
      case 'me':
        toReturn = await me(client, loginToken);
        break;
      case 'help':
        if (args.length > 1) {
          throw new Error('Too many parameters');
        } else {
          toReturn = help();
        }
        break;
      default:
        toReturn = await aliasSearch(client, query);
        break;
    }

    if (toReturn != '') {
      await message.channel
        .send(toReturn)
        .then(console.log(`${message} completed\n`))
        .catch((err) => {
          throw new Error(err);
        });
    }
  } catch (err) {
    console.log(err);

    switch (err.message) {
      case 'No hits':
        message.channel.send('```No products found matching search parameters```');
        break;
      case 'Empty command':
        message.channel.send('```Command is missing parameters```');
        break;
      case 'Not exist':
        message.channel.send('```Command has one or more non-existing listing ids```');
        break;
      case 'Error updating':
        message.channel.send('```Error updating listing(s)```');
        break;
      case 'Too many parameters':
        message.channel.send('```Command has too many parameters```');
        break;
      case 'Too little parameters':
        message.channel.send('```Command has too little parameters```');
        break;
      case 'Incorrect format':
        message.channel.send('```Incorrect format```');
        break;
      case 'Error deleting':
        message.channel.send('```Error deleting listing(s)```');
        break;
      case 'Login expired':
        message.channel.send('```Login expired```');
        break;
      case 'Error editing':
        message.channel.send('```Error editing listing```');
        break;
      case 'No data':
        message.channel.send('```Matched product has no data```');
        break;
      case 'Not logged in':
        message.channel.send(
          '```Command not available\nPlease login via daijoubu DMS with the format:\n\t!login <email> <password>```'
        );
        break;
      case 'Error confirming':
        message.channel.send('```Error confirming order(s)```');
        break;
      case 'Order not exist':
        message.channel.send('```Command has one or more non-existing order numbers```');
        break;
      case 'Invalid list command':
        message.channel.send(
          '```' +
            `Incorrect format\nCorrect format is:\n\n!alias list <search parameters> [<size (num)>,<price (num, 'lowest')>,<amount (num) - optional>] [] ...` +
            '```'
        );
        break;
      case 'No lowest ask':
        message.channel.send(
          '```' +
            'One or more listing sizes does not have a lowest asking price\nPlease check prices again and adjust accordingly' +
            '```'
        );
        break;
      case 'Error listing':
        message.channel.send('```Error listing item(s)```');
        break;
      default:
        message.channel.send('```Unexpected Error```');
        break;
    }
  }
};

async function aliasSearch(client, query) {
  let res = await fetch('https://2fwotdvm2o-dsn.algolia.net/1/indexes/product_variants_v2/query', {
    method: 'POST',
    headers: client.config.goatHeader,
    body: `{"params":"query=${encodeURIComponent(query)}"}`,
  })
    .then((res, err) => {
      if (res.status == 200) {
        return res.json();
      } else {
        console.log('Res is', res.status);

        if (err) {
          throw new Error(err.message);
        }
      }
    })
    .then((json) => {
      if (json.hits.length != 0) {
        return json.hits[0];
      } else {
        throw new Error('No hits');
      }
    });

  let category = res.product_category;
  let name = res.name;
  let productURL = 'https://www.goat.com/sneakers/' + res.slug;
  let description = '';
  if (res.story_html != null) {
    description = res.story_html;
    description = description.replace('<p>', '');
    description = description.replace('</p>', '');
  }
  let image = res.main_glow_picture_url;
  let colorway = res.details;
  let retail = res.retail_price_cents;
  let SKU = res.sku;
  let date = res.release_date;
  let parsedDate = null;

  if (date != null) {
    let [month, day, year] = new Date(date).toLocaleDateString().split('/');
    parsedDate = `${month.length == 1 ? '0' + month : month}/${day.length == 1 ? '0' + day : day}/${year}`;
  } else if (res.brand_name == 'Supreme' && category == 'clothing') {
    parsedDate = SKU.substring(0, 4);
  } else {
    parsedDate = 'N/A';
  }

  if (!category) {
    category = 'N/A';
  }

  if (!image) {
    image = null;
  }

  if (!colorway) {
    colorway = 'N/A';
  }

  if (!retail) {
    retail = 'N/A';
  } else {
    retail = '$' + retail / 100;
  }

  if (!SKU) {
    SKU = 'N/A';
  }

  let pageData = await fetch(
    `https://sell-api.goat.com/api/v1/analytics/products/${res.slug}/availability?box_condition=1&shoe_condition=1`,
    {
      headers: client.config.headers,
    }
  ).then((res, err) => {
    if (res.status == 200) {
      return res.json();
    } else {
      console.log('Res is', res.status);

      if (err) {
        throw new Error(err.message);
      }
    }
  });

  if (Object.keys(pageData).length == 0) {
    throw new Error('No data');
  }

  let lowestPrice = '';
  let highestBid = '';
  let lastSold = '';
  let averageLowestPrice = 0;
  let averageHighestBid = 0;
  let averageLastSold = 0;
  let lowest = 0;
  let highest = 0;
  let last = 0;

  let array = [];

  for (variant of pageData.availability) {
    if (
      variant.lowest_price_cents == undefined &&
      variant.highest_offer_cents == undefined &&
      variant.last_sold_price_cents == undefined
    ) {
      continue;
    }

    let obj = {
      size: variant.size,
      lowest_price_cents: 0,
      highest_offer_cents: 0,
      last_sold_price_cents: 0,
    };

    if (variant.lowest_price_cents != undefined) {
      obj.lowest_price_cents = variant.lowest_price_cents / 100;
    }

    if (variant.highest_offer_cents != undefined) {
      obj.highest_offer_cents = variant.highest_offer_cents / 100;
    }

    if (variant.last_sold_price_cents != undefined) {
      obj.last_sold_price_cents = variant.last_sold_price_cents / 100;
    }

    let exist = false;

    for (temp of array) {
      if (temp.size == obj.size) {
        exist = true;

        if (temp.lowest_price_cents < obj.lowest_price_cents) {
          temp = obj;
        }

        break;
      }
    }

    if (!exist) {
      array.push(obj);
    }
  }

  for (obj of array) {
    if (obj.lowest_price_cents != 0) {
      lowestPrice += `${obj.size} - $${obj.lowest_price_cents}\n`;
      averageLowestPrice += obj.lowest_price_cents;
      lowest++;
    } else {
      lowestPrice += `${obj.size} - N/A\n`;
    }

    if (obj.highest_offer_cents != 0) {
      highestBid += `${obj.size} - $${obj.highest_offer_cents}\n`;
      averageHighestBid += obj.highest_offer_cents;
      highest++;
    } else {
      highestBid += `${obj.size} - N/A\n`;
    }

    if (obj.last_sold_price_cents != 0) {
      lastSold += `${obj.size} - $${obj.last_sold_price_cents}\n`;
      averageLastSold += obj.last_sold_price_cents;
      last++;
    } else {
      lastSold += `${obj.size} - N/A\n`;
    }
  }

  averageLowestPrice = Math.round(averageLowestPrice / lowest);
  averageHighestBid = Math.round(averageHighestBid / highest);
  averageLastSold = Math.round(averageLastSold / last);

  if (isNaN(averageLowestPrice)) {
    averageLowestPrice = 'N/A';
  }

  if (isNaN(averageHighestBid)) {
    averageHighestBid = 'N/A';
  }

  if (isNaN(averageLastSold)) {
    averageLastSold = 'N/A';
  }

  let lowestPriceString = `Average: $${averageLowestPrice}` + '```' + lowestPrice + '```';
  let highestBidString = `Average: $${averageHighestBid}` + '```' + highestBid + '```';
  let lastSoldString = `Average: $${averageLastSold}` + '```' + lastSold + '```';

  if (lowestPrice == '') {
    lowestPriceString = 'N/A';
  }

  if (highestBid == '') {
    highestBidString = 'N/A';
  }

  if (lastSold == '') {
    lastSoldString = 'N/A';
  }

  const embed = new Discord.MessageEmbed()
    .setColor('#7756fe')
    .setTitle(name)
    .setURL(productURL)
    .setThumbnail(image)
    .setDescription(description)
    .addFields(
      { name: 'SKU', value: SKU, inline: true },
      { name: 'Colorway', value: `${colorway ? colorway : 'N/A'}`, inline: true },
      { name: 'Price', value: retail, inline: true },
      { name: 'Release Date', value: parsedDate, inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
      { name: 'Lowest Asks', value: lowestPriceString, inline: true },
      {
        name: 'Highest Bids',
        value: highestBidString,
        inline: true,
      },
      { name: 'Last Sold', value: lastSoldString, inline: true }
    );

  return embed;
}

async function check(client, loginToken) {
  let listings = await getListings(client, loginToken);

  if (!listings.listing) {
    return ['', response.NO_ITEMS, null];
  } else {
    let listingObj = [];

    for (let i = 0; i < listings.listing.length; i++) {
      listingObj = await checkListings(listings.listing[i], listingObj);
    }

    if (listingObj.length == 0) {
      return ['', response.NO_CHANGE, null];
    } else {
      let newLowestAsksString = 'Current listings with a lower ask:';

      listingObj.forEach((obj, i) => {
        newLowestAsksString += `\n\t${i}. ${obj.product.name}\n\t\tsize: ${obj.size_option.name.toUpperCase()} $${
          obj.price_cents / 100
        } => $${obj.product.lowest_price_cents / 100}\n`;
      });

      tempRes = 200;
      return [newLowestAsksString, response.SUCCESS, listingObj];
    }
  }
}

async function update(client, loginToken, message) {
  let nums = [];
  let all = false;
  let valid = false;
  let exit = false;
  let timedOut = false;

  let [listingString, listingEnum, listingObj] = await check(client, loginToken);

  if (listingEnum == response.SUCCESS) {
    await message.channel.send('```' + listingString + '```');
  } else if (listingEnum == response.NO_CHANGE) {
    return [response.NO_CHANGE, all, null];
  } else if (listingEnum == response.NO_ITEMS) {
    return [response.NO_ITEMS, all, null];
  }

  await message.channel.send('```' + `Enter 'all' or listing number(s) to update\nEnter 'n' to cancel` + '```');

  const collector = message.channel.createMessageCollector((msg) => msg.author.id == message.author.id, {
    time: 30000,
  });

  for await (const message of collector) {
    nums = message.content.split(' ');

    if (message.content.toLowerCase() == 'n') {
      collector.stop();
      exit = true;
      console.log('Canceled\n');
    } else if (checkNumParams(nums)) {
      if (nums[0].toLowerCase() == 'all') {
        all = true;
        collector.stop();
      } else {
        valid = true;

        for (let i = 0; i < nums.length; i++) {
          if (parseInt(nums[i]) >= listingObj.length) {
            valid = false;
            message.channel.send('```' + 'One or more entered listing number(s) do not exist' + '```');
            break;
          }
        }

        if (valid) {
          collector.stop();
        }
      }
    } else {
      message.channel.send('```' + `Invalid format\nEnter 'all' or listing number(s)` + '```');
    }
  }

  collector.on('end', async (collected) => {
    console.log('Timed out\n');
    timedOut = true;
  });

  if (exit) {
    return [response.EXIT, null, null];
  } else if (timedOut) {
    return [response.TIMEDOUT, null, null];
  }

  const msg = await message.channel.send('```' + `Updating...` + '```');

  let updateRes = 0;

  if (all) {
    for (let i = 0; i < listingObj.length; i++) {
      if (listingObj[i].price_cents > listingObj[i].product.lowest_price_cents) {
        updateRes = await updateListing(client, loginToken, listingObj[i]);
      }
    }
  } else {
    if (valid) {
      for (let i = 0; i < nums.length; i++) {
        updateRes = await updateListing(client, loginToken, listingObj[nums[i]]);
      }
    }
  }

  if (updateRes == 200) {
    return [response.SUCCESS, all, msg];
  }
}

async function getListings(client, loginToken) {
  let listings = await fetch('https://sell-api.goat.com/api/v1/listings?filter=1&includeMetadata=1&page=1', {
    headers: {
      'user-agent': client.config.aliasHeader,
      authorization: `Bearer ${encryption.decrypt(loginToken)}`,
    },
  }).then((res, err) => {
    if (res.status == 200) {
      return res.json();
    } else if (res.status == 401) {
      throw new Error('Login expired');
    } else {
      console.log('Res is', res.status);

      if (err) {
        throw new Error(err.message);
      }
    }
  });

  return listings;
}

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

async function updateListing(client, loginToken, obj) {
  obj.price_cents = obj.product.lowest_price_cents;

  let updateRes = await fetch(`https://sell-api.goat.com/api/v1/listings/${obj.id}`, {
    method: 'PUT',
    headers: {
      'user-agent': client.config.aliasHeader,
      authorization: `Bearer ${encryption.decrypt(loginToken)}`,
    },
    body: `{"listing":${JSON.stringify(obj)}}`,
  }).then((res, err) => {
    if (res.status == 200) {
      return res.status;
    } else if (res.status == 401) {
      throw new Error('Login expired');
    } else if (res.status == 404) {
      throw new Error('Not exist');
    } else {
      console.log('Res is', res.status);

      if (err) {
        throw new Error(err.message);
      }
    }
  });

  if (updateRes != 200) {
    throw new Error('Error Updating');
  }

  return updateRes;
}

async function allListings(user) {
  const userListings = await Listings.find({ d_id: user.d_id });
  const userListingsArray = userListings[0].listings;
  let listingString = 'Current Listings:';

  if (userListingsArray.length == 0) {
    return ['', response.NO_ITEMS, null];
  }

  let listingIds = [];

  userListingsArray.forEach((obj, i) => {
    listingIds.push(obj.id);
    listingString += `\n\t${i}. ${obj.name}\n\t\tsize: ${obj.size} - $${obj.price / 100}\n`;
  });

  return [listingString, response.SUCCESS, listingIds];
}

async function deleteSearch(client, loginToken, message, user) {
  const userListings = await Listings.find({ d_id: user.d_id });
  const userListingsArray = userListings[0].listings;
  let all = false;
  let valid = true;
  let nums = [];
  let exit = false;
  let timedOut = false;

  let [listings, returnedEnum, []] = await allListings(user);

  if (returnedEnum == response.SUCCESS) {
    listings = '```' + listings + '```';
  } else if (returnedEnum == response.NO_ITEMS) {
    return [response.NO_ITEMS, all, null];
  }

  await message.channel.send(listings).catch((err) => {
    throw new Error(err);
  });

  await message.channel.send('```' + `Enter 'all' or listing number(s) to delete\nEnter 'n' to cancel` + '```');

  const collector = message.channel.createMessageCollector((msg) => msg.author.id == message.author.id, {
    time: 30000,
  });

  for await (const message of collector) {
    nums = message.content.split(' ');

    if (message.content.toLowerCase() == 'n') {
      collector.stop();
      exit = true;
      console.log('Canceled\n');
    } else if (checkNumParams(nums)) {
      if (nums[0].toLowerCase() == 'all') {
        collector.stop();
        all = true;
      } else {
        valid = true;

        for (let i = 0; i < nums.length; i++) {
          if (parseInt(nums[i]) >= userListingsArray.length) {
            valid = false;
            message.channel.send('```' + 'One or more entered listing numbers do not exist' + '```');
            break;
          }
        }

        if (valid) {
          collector.stop();
        }
      }
    } else {
      message.channel.send('```' + `Invalid format\nEnter 'all' or listing number(s)` + '```');
    }
  }

  collector.on('end', async (collected) => {
    console.log('Timed out\n');
    timedOut = true;
  });

  if (exit) {
    return [response.EXIT, null, null];
  } else if (timedOut) {
    return [response.TIMEDOUT, null, null];
  }

  const msg = await message.channel.send('```' + `Deleting...` + '```');

  let deleteRes = 0;

  if (all) {
    for (let i = 0; i < userListingsArray.length; i++) {
      deleteRes = await deletion(client, loginToken, userListingsArray[i].id);
    }
  } else {
    if (valid) {
      for (let i = 0; i < nums.length; i++) {
        deleteRes = await deletion(client, loginToken, userListingsArray[parseInt(nums[i])].id);
      }
    }
  }

  if (deleteRes == 200) {
    return [response.SUCCESS, all, msg];
  }
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

  for (let i = 0; i < nums.length; i++) {
    if (isNaN(nums[i])) {
      return false;
    }
  }

  return true;
}

async function deletion(client, loginToken, listingId) {
  let deactivateRes = 0;
  let cancelRes = 0;

  deactivateRes = await fetch(`https://sell-api.goat.com/api/v1/listings/${listingId}/deactivate`, {
    method: 'PUT',
    headers: {
      'user-agent': client.config.aliasHeader,
      authorization: `Bearer ${encryption.decrypt(loginToken)}`,
    },
    body: `{"id":"${listingId}"}`,
  }).then((res, err) => {
    if (res.status == 200) {
      return res.status;
    } else if (res.status == 401) {
      throw new Error('Login expired');
    } else if (res.status == 404) {
      throw new Error('Not exist');
    } else {
      console.log('Res is', res.status);

      if (err) {
        throw new Error(err.message);
      }
    }
  });

  if (deactivateRes == 200) {
    cancelRes = await fetch(` https://sell-api.goat.com/api/v1/listings/${listingId}/cancel`, {
      method: 'PUT',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${encryption.decrypt(loginToken)}`,
      },
      body: `{"id":"${listingId}"}`,
    }).then((res, err) => {
      if (res.status == 200) {
        return res.status;
      } else if (res.status == 401) {
        throw new Error('Login expired');
      } else if (res.status == 404) {
        throw new Error('Not exist');
      } else {
        console.log('Res is', res.status);

        if (err) {
          throw new Error(err.message);
        }
      }
    });
  }

  if (deactivateRes != 200 && cancelRes != 200) {
    throw new Error('Error deleting');
  } else if (deactivateRes == 200 && cancelRes == 200) {
    return 200;
  }
}

async function editListing(client, loginToken, user, message) {
  let [listingString, listingEnum, listingIds] = await allListings(user);

  if (listingEnum == response.SUCCESS) {
    await message.channel.send('```' + listingString + '```');
  } else {
    return response.NO_ITEMS;
  }

  let exit = false;
  let timedOut = false;

  await message.channel.send('```' + `Enter listing number to edit\nEnter 'n' to cancel` + '```');

  const collector1 = message.channel.createMessageCollector((msg) => msg.author.id == message.author.id, {
    time: 30000,
  });

  for await (const message of collector1) {
    let input = message.content.toLowerCase();

    if (input == 'n') {
      collector1.stop();
      exit = true;
      console.log('Canceled');
    } else if (!isNaN(input)) {
      if (parseInt(input) >= listingIds.length) {
        message.channel.send('```' + 'Entered listing number does not exist' + '```');
      } else {
        collector1.stop();
      }
    } else {
      message.channel.send('```' + `Invalid format\nEnter a valid number` + '```');
    }
  }

  collector1.on('end', async (collected) => {
    console.log('Timed out\n');
    timedOut = true;
  });

  if (exit) {
    return [response.EXIT, null];
  } else if (timedOut) {
    return [response.TIMEDOUT, null];
  }

  await message.channel.send('```' + `Enter new price or 'lowest'\nEnter 'n' to cancel` + '```');

  let getJSON = await fetch(`https://sell-api.goat.com/api/v1/listings/${listingIds[input]}`, {
    headers: {
      'user-agent': client.config.aliasHeader,
      authorization: `Bearer ${encryption.decrypt(loginToken)}`,
    },
  }).then((res, err) => {
    if (res.status == 200) {
      return res.json();
    } else if (res.status == 401) {
      throw new Error('Login expired');
    } else if (res.status == 404) {
      throw new Error('Not exist');
    } else {
      console.log('Res is', res.status);

      if (err) {
        throw new Error(err.message);
      }
    }
  });

  let lowest = getJSON.listing.product.lowest_price_cents / 100;
  let price = 0;

  const collector2 = message.channel.createMessageCollector((msg) => msg.author.id == message.author.id, {
    time: 30000,
  });

  for await (const message of collector2) {
    price = message.content;

    if (message.content.toLowerCase() == 'lowest') {
      collector2.stop();
      price = lowest;
    } else if (message.content.toLowerCase() == 'n') {
      collector2.stop();
      exit = true;
      console.log('Canceled');
    } else if (!isNaN(price)) {
      collector2.stop();

      let confirm = false;

      while (!confirm && parseInt(price) < lowest) {
        [confirm, price] = await confirmEdit(lowest, price, message);

        if (price == -1) {
          exit = true;
        } else if (price == -2) {
          timedOut = true;
        }
      }
    } else {
      await message.channel.send('```Incorrect format\nEnter lowest or a valid number```');
    }
  }

  collector2.on('end', async (collected) => {
    console.log('Timed out');
    timedOut = true;
  });

  if (exit) {
    return [response.EXIT, null];
  } else if (timedOut) {
    return [response.TIMEDOUT, null];
  }

  const msg = await message.channel.send('```Editing...```');

  getJSON.listing.price_cents = (parseInt(price) * 100).toString();

  let editRes = await fetch(`https://sell-api.goat.com/api/v1/listings/${listingIds[input].id}`, {
    method: 'PUT',
    headers: {
      'user-agent': client.config.aliasHeader,
      authorization: `Bearer ${encryption.decrypt(loginToken)}`,
    },
    body: `${JSON.stringify(getJSON)}`,
  }).then((res) => {
    if (res.status == 200) {
      return res.status;
    } else if (res.status == 401) {
      throw new Error('Login expired');
    } else if (res.status == 404) {
      throw new Error('Not exist');
    } else {
      console.log('Res is', res.status);

      if (err) {
        throw new Error(err.message);
      }
    }
  });

  if (editRes != 200) {
    throw new Error('Error editing');
  }

  return [response.SUCCESS, msg];
}

async function confirmEdit(lowest, price, message) {
  let confirm = false;

  await message.channel.send(
    '```' +
      `Current lowest ask: $${lowest}\nYou entered $${price}, a lower asking price than the current lowest asking price of $${lowest}\nEnter a new price, 'y' to confirm, or 'n' to cancel` +
      '```'
  );

  const collector = new Discord.MessageCollector(message.channel, (m) => m.author.id === message.author.id, {
    time: 10000,
  });

  for await (const message of collector) {
    let input = message.content.toLowerCase();

    if (input == 'y') {
      collector.stop();
      confirm = true;
    } else if (input == 'n') {
      collector.stop();
      price = -1;
      confirm = true;
      console.log('Canceled\n');
    } else if (!isNaN(input)) {
      collector.stop();
      price = input;
      confirm = false;
    } else {
      message.channel.send('Incorrect format\nEnter a valid input');
    }
  }

  collector.on('end', async (collected) => {
    console.log('Timed out\n');
    confirm = true;
    price = -2;
  });

  if (confirm) {
    return [confirm, price];
  } else {
    return [confirm, price];
  }
}

async function getOrders(client, loginToken) {
  let returnString = 'Current open orders:\n';

  let purchaseOrders = await fetch(
    'https://sell-api.goat.com/api/v1/purchase-orders?filter=10&includeMetadata=1&page=1',
    {
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${encryption.decrypt(loginToken)}`,
      },
    }
  )
    .then((res) => {
      return res.json();
    })
    .catch((err) => {
      throw new Error(err);
    });

  let reviewString = '\tIn Review:\n';
  let reviewNum = 0;
  let confirmString = '\tNeeds Confirmation:\n';
  let confirmNum = 0;
  let needShipString = '\tNeeds Shipping:\n';
  let needShipNum = 0;
  let shippedString = '\tShipped:\n';
  let shippedNum = 0;
  let receivedString = '\tReceived:\n';
  let receivedNum = 0;
  let droppedString = '\tDropped Off:\n';
  let droppedNum = 0;
  let newString = '';
  let i = 0;

  if (purchaseOrders.purchase_orders) {
    purchaseOrders.purchase_orders.forEach((order) => {
      let date = new Date(order.take_action_by);

      if (order.status == 'IN_REVIEW') {
        reviewString += `\t\t${reviewNum}. ${order.listing.product.name} - ${order.listing.size_option.name} $${
          order.listing.price_cents / 100
        }\n\t\t\tOrder number: ${order.number}\n`;
        reviewNum++;
      } else if (order.status == 'NEEDS_CONFIRMATION') {
        confirmString += `\t\t${confirmNum}. ${order.listing.product.name} - ${order.listing.size_option.name} $${
          order.listing.price_cents / 100
        }\n\t\t\tOrder number: ${order.number}\n\t\t\tConfirm by: ${date.getMonth() + 1}/${date.getDate()}\n`;
        confirmNum++;
      } else if (order.status == 'NEEDS_SHIPPING') {
        needShipString += `\t\t${needShipNum}. ${order.listing.product.name} - ${order.listing.size_option.name} $${
          order.listing.price_cents / 100
        }\n\t\t\tOrder number: ${order.number}\n\t\t\tShip by: ${date.getMonth() + 1}/${date.getDate()}\n`;
        needShipNum++;
      } else if (order.status == 'SHIPPED') {
        shippedString += `\t\t${shippedNum}. ${order.listing.product.name} - ${order.listing.size_option.name} $${
          order.listing.price_cents / 100
        }\n\t\t\tOrder number: ${order.number}\n\t\t\tUPS Tracking Number: ${order.shipping_info.tracking_code}\n`;
        shippedNum++;
      } else if (order.status == 'DROPPED_OFF') {
        droppedString += `\t\t${droppedNum}. ${order.listing.product.name} - ${order.listing.size_option.name} $${
          order.listing.price_cents / 100
        }\n\t\t\tOrder number: ${order.number}\n`;
        droppedNum++;
      } else if (order.status == 'RECEIVED') {
        receivedString += `\t\t${receivedNum}. ${order.listing.product.name} - ${order.listing.size_option.name} $${
          order.listing.price_cents / 100
        }\n\t\t\tOrder number: ${order.number}\n`;
        receivedNum++;
      } else {
        newString += `\t${i}. ${order.listing.product.name} - ${order.listing.size_option.name} $${
          order.listing.price_cents / 100
        }\n\t\tOrder number: ${order.number}\n`;
        i++;
        console.log(`\nNew order status is '${order.status}'\n`);
      }
    });

    if (i != 0) {
      returnString += newString + '\n';
    }

    if (reviewNum != 0) {
      returnString += reviewString + '\n';
    }

    if (confirmNum != 0) {
      returnString += confirmString + '\n';
    }

    if (needShipNum != 0) {
      returnString += needShipString + '\n';
    }

    if (droppedNum != 0) {
      returnString += droppedString + '\n';
    }

    if (shippedNum != 0) {
      returnString += shippedString + '\n';
    }

    if (receivedNum != 0) {
      returnString += receivedString + '\n';
    }

    return [returnString, response.SUCCESS, purchaseOrders];
  } else {
    return ['', response.NO_ITEMS, {}];
  }
}

async function confirm(client, loginToken, message) {
  let exit = false;
  let all = false;
  let valid = false;
  let nums = [];
  let orders = [];

  let purchaseOrders = await fetch(
    'https://sell-api.goat.com/api/v1/purchase-orders?filter=10&includeMetadata=1&page=1',
    {
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${encryption.decrypt(loginToken)}`,
      },
    }
  )
    .then((res) => {
      return res.json();
    })
    .catch((err) => {
      throw new Error(err);
    });

  let confirmString = '\tNeeds Confirmation:\n';
  let confirmNum = 0;

  if (purchaseOrders.purchase_orders) {
    purchaseOrders.purchase_orders.forEach((order) => {
      let date = new Date(order.take_action_by);

      if (order.status == 'NEEDS_CONFIRMATION') {
        confirmString += `\t\t${confirmNum}. ${order.listing.product.name} - ${order.listing.size_option.name} $${
          order.listing.price_cents / 100
        }\n\t\t\tOrder number: ${order.number}\n\t\t\tConfirm by: ${date.getMonth() + 1}/${date.getDate()}\n`;

        orders.push(order.number);
      }
    });
  }

  if (orders.length == 0) {
    return [response.NO_ITEMS, null, null];
  }

  await message.channel.send('```' + confirmString + '```');

  await message.channel.send('```' + `Enter 'all' or order number(s) to confirm\nEnter 'n' to cancel` + '```');

  const collector = message.channel.createMessageCollector((msg) => msg.author.id == message.author.id, {
    time: 30000,
  });

  for await (const message of collector) {
    nums = message.content.split(' ');

    if (message.content.toLowerCase() == 'n') {
      collector.stop();
      exit = true;
      console.log('Canceled\n');
    } else if (checkNumParams(nums)) {
      if (nums[0].toLowerCase() == 'all') {
        all = true;
        collector.stop();
      } else {
        valid = true;

        for (let i = 0; i < nums.length; i++) {
          if (parseInt(nums[i]) >= orders.length) {
            valid = false;
            message.channel.send('```' + 'One or more entered order number(s) do not exist' + '```');
            break;
          }
        }

        if (valid) {
          collector.stop();
        }
      }
    } else {
      message.channel.send('```' + `Invalid format\nEnter 'all' or listing number(s)` + '```');
    }
  }

  collector.on('end', async (collected) => {
    console.log('Timed out\n');
    timedOut = true;
  });

  if (exit) {
    return [response.EXIT, null, null];
  } else if (timedOut) {
    return [response.TIMEDOUT, null, null];
  }

  let msg = await message.channel.send('```Confirming ... ```');

  if (all) {
    for (let i = 0; i < orders.length; i++) {
      await confirmation(client, loginToken, orders[i].number);
    }
  } else {
    if (valid) {
      for (let i = 0; i < nums.length; i++) {
        await confirmation(client, loginToken, orders[nums[i]].number);
      }
    }
  }

  return [response.SUCCESS, all, msg];
}

async function confirmation(client, loginToken, number) {
  let confirmation = await fetch(`https://sell-api.goat.com/api/v1/purchase-orders/${number}/confirm`, {
    method: 'PUT',
    headers: {
      'user-agent': client.config.aliasHeader,
      authorization: `Bearer ${encryption.decrypt(loginToken)}`,
    },
    body: `{"number":"${number}"}`,
  })
    .then((res) => {
      return res.status;
    })
    .catch((err) => {
      throw new Error(err);
    });

  let shipping = await fetch(`https://sell-api.goat.com/api/v1/purchase-orders/${number}/generate-shipping-label`, {
    method: 'PUT',
    headers: {
      'user-agent': client.config.aliasHeader,
      authorization: `Bearer ${encryption.decrypt(loginToken)}`,
    },
    body: `{"number":"${number}"}`,
  })
    .then((res) => {
      return res.status;
    })
    .catch((err) => {
      throw new Error(err);
    });

  if (confirmation != 200 || shipping != 200) {
    throw new Error('Error confirming');
  }
}

async function settings(client, message, user, edit) {
  const userSettings = new Discord.MessageEmbed()
    .setColor('#7756fe')
    .setTitle('alias Settings')
    .addFields(
      {
        name: 'Order Confirmation Refresh Rate:',
        value: user.settings.orderRefresh == 'live' ? 'Live' : 'Daily',
      },
      {
        name: 'Default Listing Update Rate:',
        value: user.settings.adjustListing == 'live' ? 'Live' : 'Manual',
      }
    );

  if (!edit) {
    return [userSettings, response.SUCCESS];
  } else {
    let returnedEnum = null;

    await message.channel.send(userSettings).catch((err) => {
      throw new Error(err);
    });

    await message.channel.send(
      '```' +
        `0. Order Confirmation Refresh Rate\n1. Default Listing Update Rate\n2. Specified Listing Update Rate\nEnter '0', '1', or '2' to edit\nEnter 'n' to cancel` +
        '```'
    );

    const collector = new Discord.MessageCollector(message.channel, (m) => m.author.id === message.author.id, {
      time: 30000,
    });

    collector.on('collect', async (message) => {
      let input = message.content.toLowerCase();

      if (input == 0) {
        collector.stop();
        returnedEnum = await editOrderRate(client, message, user);
      } else if (input == 1) {
        collector.stop();
        returnedEnum = await editDefaultListingRate(client, message, user);
      } else if (input == 2) {
        collector.stop();
        returnedEnum = await editSpecifiedListingRate(client, message, user);
      } else if (message.content.toLowerCase() == 'n') {
        collector.stop();
        exit = true;
        returnedEnum = response.EXIT;
      } else {
        await message.channel.send('```' + `Enter either '0' or '1'` + '```');
      }
    });

    collector.on('end', async (collected) => {
      timedOut = true;
      console.log('Timed out\n');
      returnedEnum = response.TIMEDOUT;
    });

    return ['', returnedEnum];
  }
}

async function editOrderRate(client, message, user) {
  await message.channel.send(
    '```' + `Editing Order Confirmation Refresh Rate\n\tEnter 'live' or 'daily'\n\tEnter 'n' to cancel` + '```'
  );

  const collector = new Discord.MessageCollector(message.channel, (m) => m.author.id === message.author.id, {
    time: 30000,
  });

  collector.on('collect', async (message) => {
    let input = message.content.toLowerCase();

    if (input.toLowerCase() == 'live' || input.toLowerCase() == 'daily') {
      await Users.updateOne({ _id: user._id }, { $set: { 'settings.orderRefresh': input } }, async (err) => {
        if (!err) {
          await message.channel.send('```Order confirmation refresh rate edited successfully```');
          collector.stop();
          console.log('!alias settings edit completed\n');
        }
      }).catch((err) => {
        throw new Error(err);
      });
    } else if (message.content.toLowerCase() == 'n') {
      collector.stop();
      exit = true;
    } else {
      await message.channel.send('```' + `Enter either 'live' or 'daily'` + '```');
    }
  });

  collector.on('end', async (collected) => {
    timedOut = true;
    console.log('Timed out\n');
  });

  if (exit) {
    return response.EXIT;
  } else if (timedOut) {
    return response.TIMEDOUT;
  } else {
    return response.SUCCESS;
  }
}

async function editDefaultListingRate(client, message, user) {
  await message.channel.send(
    '```' + `Editing Default Listing Update Rate\n\tEnter 'live' or 'manual'\n\tEnter 'n' to cancel` + '```'
  );

  const collector = new Discord.MessageCollector(message.channel, (m) => m.author.id === message.author.id, {
    time: 30000,
  });

  collector.on('collect', async (message) => {
    let input = message.content.toLowerCase();

    if (input.toLowerCase() == 'live' || input.toLowerCase() == 'manual') {
      await Users.updateOne({ _id: user._id }, { $set: { 'settings.adjustListing': input } }, async (err) => {
        if (!err) {
          await message.channel.send('```Listing update refresh rate edited successfully```');
          collector.stop();
          console.log('!alias settings edit completed\n');
        }
      }).catch((err) => {
        throw new Error(err);
      });
    } else if (message.content.toLowerCase() == 'n') {
      collector.stop();
      exit = true;
    } else {
      await message.channel.send('```' + `Enter either 'live' or 'manual'` + '```');
    }
  });

  collector.on('end', async (collected) => {
    timedOut = true;
    console.log('Timed out\n');
  });

  if (exit) {
    return response.EXIT;
  } else if (timedOut) {
    return response.TIMEDOUT;
  } else {
    return response.SUCCESS;
  }
}

async function editSpecifiedListingRate(client, message, user) {
  let [listingString, listingEnum, listingIds] = await allListings(user);

  if (listingEnum == response.SUCCESS) {
    await message.channel.send('```' + listingString + '```');
  } else {
    return response.NO_ITEMS;
  }

  await message.channel.send('```' + `Enter listing number to edit\nEnter 'n' to cancel` + '```');

  const collector1 = message.channel.createMessageCollector((msg) => msg.author.id == message.author.id, {
    time: 30000,
  });

  for await (const message of collector1) {
    let input = message.content.toLowerCase();

    if (input == 'n') {
      collector1.stop();
      exit = true;
      console.log('Canceled');
    } else if (!isNaN(input)) {
      if (parseInt(input) >= listingIds.length) {
        message.channel.send('```' + 'Entered listing number does not exist' + '```');
      } else {
        collector1.stop();
      }
    } else {
      message.channel.send('```' + `Invalid format\nEnter a valid number` + '```');
    }
  }

  collector1.on('end', async (collected) => {
    console.log('Timed out\n');
    timedOut = true;
  });

  if (exit) {
    return [response.EXIT, null];
  } else if (timedOut) {
    return [response.TIMEDOUT, null];
  }

  let input = '';

  await message.channel.send('```' + `Enter 'live' or 'manual'\nEnter 'n' to cancel` + '```');
  let userListings = await Listings.find();

  const collector2 = message.channel.createMessageCollector((msg) => msg.author.id == message.author.id, {
    time: 30000,
  });

  for await (const message of collector2) {
    input = message.content.toLowerCase();

    if (input == 'n') {
      collector1.stop();
      exit = true;
      console.log('Canceled');
    } else if (input == 'live' || input == 'manual') {
      collector.stop();
    } else {
      message.channel.send('```' + `Invalid format\nEnter a valid number` + '```');
    }
  }

  collector2.on('end', async (collected) => {
    console.log('Timed out\n');
    timedOut = true;
  });

  if (exit) {
    return [response.EXIT, null];
  } else if (timedOut) {
    return [response.TIMEDOUT, null];
  }
}

async function checkListParams(params) {
  let bracketCount = 0;
  let sizingArray = [];
  let query = '';

  for (let i = 0; i < params.length; i++) {
    if (!params[i].includes('[') && !params[i].includes(']')) {
      query += params[i] + ' ';
    } else {
      bracketCount++;
      let crnt = params[i];

      if (!crnt.includes('[') && !crnt.includes(']')) {
        return [false, response.NO_CHANGE, ''];
      }

      if (!crnt.includes(',')) {
        return [false, response.NO_CHANGE, ''];
      }

      crnt = crnt.substring(1, crnt.length - 1);
      let crntArray = crnt.split(',');

      if (crntArray.length < 1 || crntArray.length > 4) {
        return [false, response.NO_CHANGE, [], ''];
      }

      if (isNaN(crntArray[0])) {
        return [false, response.NO_CHANGE, [], ''];
      }

      if (isNaN(crntArray[1]) && crntArray[1] != 'lowest') {
        return [false, response.NO_CHANGE, [], ''];
      }

      if (crntArray[2] && isNaN(crntArray[2])) {
        return [false, response.NO_CHANGE, [], ''];
      }

      sizingArray.push(params[i]);
    }
  }

  query = query.substring(0, query.length);

  if (bracketCount == 0) {
    return [false, response.NO_CHANGE, [], ''];
  }

  return [true, response.SUCCESS, sizingArray, query];
}

async function list(client, message, loginToken, sizingArray, query) {
  let searchProduct = await aliasSearch(client, query).catch((err) => {
    throw new Error(err.message);
  });

  await message.channel.send(searchProduct);

  await message.channel.send(
    '```' + `Is this the product that you want to list?\nEnter 'y' to confirm, enter 'n' to cancel` + '```'
  );

  let returnString = '';
  let msg = null;
  let exit = false;
  let timedOut = false;

  const collector = message.channel.createMessageCollector((msg) => msg.author.id == message.author.id, {
    time: 30000,
  });

  for await (const message of collector) {
    let input = message.content.toLowerCase();

    if (input == 'y' || input == 'n') {
      if (input == 'n') {
        collector.stop();
        console.log('Canceled\n');
        exit = true;
      } else {
        collector.stop();
        msg = await message.channel.send('```Listing...```');
        [returnedEnum, returnString] = await doList(client, loginToken, message, searchProduct, sizingArray);
      }
    } else {
      await message.channel.send('```' + `Enter either 'y' or 'n'` + '```');
    }
  }

  collector.on('end', async (collected) => {
    console.log('Timed out\n');
    timedOut = true;
  });

  if (exit) {
    return [response.EXIT, returnString, msg];
  } else if (timedOut) {
    return [response.TIMEDOUT, returnString, msg];
  } else {
    return [response.SUCCESS, returnString, msg];
  }
}

async function doList(client, loginToken, message, searchProduct, sizingArray) {
  let returnString = 'Successfully listed:\n\t' + searchProduct.title + '\n';
  let returnedEnum = null;
  let url = searchProduct.url.split('/');
  let slug = url[url.length - 1];

  let pageData = await fetch(
    `https://sell-api.goat.com/api/v1/analytics/products/${slug}/availability?box_condition=1&shoe_condition=1`,
    {
      headers: client.config.headers,
    }
  ).then((res, err) => {
    if (res.status == 200) {
      return res.json();
    } else {
      console.log('Res is', res.status);

      if (err) {
        throw new Error(err.message);
      }
    }
  });

  let product = await fetch('https://sell-api.goat.com/api/v1/listings/get-product', {
    method: 'POST',
    headers: {
      'user-agent': client.config.aliasHeader,
      authorization: `Bearer ${encryption.decrypt(loginToken)}`,
    },
    body: `{"id":"${slug}"}`,
  }).then((res, err) => {
    if (res.status == 200) {
      return res.json();
    } else {
      throw new Error(err);
    }
  });

  let listing = {
    listing: {
      productId: slug,
      priceCents: 1,
      productCondition: 1,
      packagingCondition: 1,
      sizeOption: {
        name: '',
        value: 1,
      },
      sizeUnit: 'us',
      product: product.product,
    },
  };

  let i = 0;

  for (i = 0; i < sizingArray.length; i++) {
    let crnt = sizingArray[i].substring(1, sizingArray[i].length - 1).split(',');

    let size = crnt[0];
    let price = crnt[1];
    let amount = crnt[2];

    if (!amount) {
      amount = 1;
    }

    listing.listing.sizeOption.name = size;
    listing.listing.sizeOption.value = parseFloat(size);

    if (price == 'lowest') {
      for (let k = 0; k < pageData.availability.length; k++) {
        if (pageData.availability[k].size == parseFloat(size)) {
          if (!pageData.availability[k].lowest_price_cents) {
            throw new Error('No lowest ask');
          }

          price = pageData.availability[k].lowest_price_cents;
          listing.listing.priceCents = parseInt(price);
          break;
        }
      }
    } else {
      listing.listing.priceCents = parseInt(price) * 100;
    }

    let lower = false;
    let lowest = 0;

    for (variant of pageData.availability) {
      if (variant.size == size) {
        if (variant.lowest_price_cents > listing.listing.priceCents) {
          lowest = variant.lowest_price_cents / 100;
          lower = true;
          break;
        }
      }
    }

    async function whileRequest(client, loginToken, listing, amount, returnString) {
      let j = 0;

      while (j < parseInt(amount)) {
        await listRes(client, loginToken, listing);
        returnString += `\t\t${j}. size: ${listing.listing.sizeOption.name} - $${listing.listing.priceCents / 100}\n`;
        j++;
      }

      returnString += '\n';

      return returnString;
    }

    if (lower) {
      let skip = false;

      await message.channel.send(
        '```' +
          `Current lowest ask for size ${size}: $${lowest}\nYou entered $${price}, a lower asking price than the current lowest asking price of $${lowest}\nEnter 'y to confirm, 'n' to skip` +
          '```'
      );

      const collector = new Discord.MessageCollector(message.channel, (m) => m.author.id === message.author.id, {
        time: 30000,
      });

      for await (const message of collector) {
        let input = message.content.toLowerCase();

        if (input == 'y' || input == 'n') {
          if (input == 'n') {
            collector.stop();
            await message.channel.send('```' + `Skipped size ${size}` + '```');
            skip = true;
          } else {
            collector.stop();
            returnString = await whileRequest(client, loginToken, listing, amount, returnString);
            returnedEnum = response.SUCCESS;
          }
        } else {
          await message.channel.send('```' + `Enter either 'y' or 'n'` + '```');
        }
      }

      collector.on('end', async (collected) => {
        console.log('Timed out\n');
        returnedEnum = response.TIMEDOUT;
      });

      if (skip) {
        continue;
      }
    } else {
      returnString = await whileRequest(client, loginToken, listing, amount, returnString);
      returnedEnum = response.SUCCESS;
    }
  }

  if (i == sizingArray.length) {
    if (returnedEnum == null) {
      returnedEnum = response.NO_CHANGE;
    }

    return [returnedEnum, returnString];
  } else {
    throw new Error('Error listing');
  }
}

async function listRes(client, loginToken, listing) {
  let listStatus = 0;
  let activateStatus = 0;

  let list = await fetch(`https://sell-api.goat.com/api/v1/listings`, {
    method: 'POST',
    headers: {
      'user-agent': client.config.aliasHeader,
      authorization: `Bearer ${encryption.decrypt(loginToken)}`,
    },
    body: JSON.stringify(listing),
  }).then((res, err) => {
    if (res.status == 200) {
      listStatus = res.status;
      return res.json();
    } else {
      console.log('Res is', res.status);
      throw new Error(err);
    }
  });

  let activate = await fetch(`https://sell-api.goat.com/api/v1/listings/${list.listing.id}/activate`, {
    method: 'PUT',
    headers: {
      'user-agent': client.config.aliasHeader,
      authorization: `Bearer ${encryption.decrypt(loginToken)}`,
    },
    body: `{"id":"${list.listing.id}"}`,
  }).then((res, err) => {
    if (res.status == 200) {
      activateStatus = res.status;
      return res.json();
    } else {
      console.log('Res is', res.status);
      throw new Error(err);
    }
  });

  if (listStatus != 200 || activateStatus != 200) {
    throw new Error('Error listing');
  }
}

async function me(client, loginToken) {
  let me = await fetch('https://sell-api.goat.com/api/v1/unstable/users/me', {
    method: 'POST',
    headers: {
      'user-agent': client.config.aliasHeader,
      authorization: `Bearer ${encryption.decrypt(loginToken)}`,
    },
    body: '{}',
  }).then((res, err) => {
    if (res.status == 200) {
      listStatus = res.status;
      return res.json();
    } else {
      console.log('Res is', res.status);
      throw new Error(err);
    }
  });

  let purchaseOrdersCount = await fetch('https://sell-api.goat.com/api/v1/purchase-orders-count', {
    method: 'GET',
    headers: {
      'user-agent': client.config.aliasHeader,
      authorization: `Bearer ${encryption.decrypt(loginToken)}`,
    },
  }).then((res, err) => {
    if (res.status == 200) {
      listStatus = res.status;
      return res.json();
    } else {
      console.log('Res is', res.status);
      throw new Error(err);
    }
  });

  let listingValues = await fetch('https://sell-api.goat.com/api/v1/listings-values', {
    method: 'GET',
    headers: {
      'user-agent': client.config.aliasHeader,
      authorization: `Bearer ${encryption.decrypt(loginToken)}`,
    },
  }).then((res, err) => {
    if (res.status == 200) {
      listStatus = res.status;
      return res.json();
    } else {
      console.log('Res is', res.status);
      throw new Error(err);
    }
  });

  let purchaseOrders = await fetch('https://sell-api.goat.com/api/v1/total-sales/purchase-orders', {
    method: 'GET',
    headers: {
      'user-agent': client.config.aliasHeader,
      authorization: `Bearer ${encryption.decrypt(loginToken)}`,
    },
  }).then((res, err) => {
    if (res.status == 200) {
      listStatus = res.status;
      return res.json();
    } else {
      console.log('Res is', res.status);
      throw new Error(err);
    }
  });

  let earnings = await fetch('https://sell-api.goat.com/api/v1/users/earnings', {
    method: 'GET',
    headers: {
      'user-agent': client.config.aliasHeader,
      authorization: `Bearer ${encryption.decrypt(loginToken)}`,
    },
  }).then((res, err) => {
    if (res.status == 200) {
      listStatus = res.status;
      return res.json();
    } else {
      console.log('Res is', res.status);
      throw new Error(err);
    }
  });

  console.log('earnings is', earnings);

  const meEmbed = new Discord.MessageEmbed()
    .setColor('#7756fe')
    .setTitle(`${me.user.name} alias Account Information`)
    .addFields(
      { name: 'Username', value: me.user.username, inline: true },
      { name: `Email`, value: me.user.email, inline: true },
      { name: 'Seller Score', value: me.user.seller_score, inline: true },
      {
        name: 'Total Number of Completed Orders',
        value: purchaseOrdersCount.canceled_or_completed_count,
        inline: true,
      },
      { name: 'Completed', value: purchaseOrdersCount.completed, inline: true },
      { name: 'Canceled', value: purchaseOrdersCount.canceled, inline: true },
      { name: 'Current Open Orders', value: purchaseOrdersCount.open_count, inline: true },
      { name: 'Orders to Ship Out', value: purchaseOrdersCount.need_to_ship_count, inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
      {
        name: 'Current Listings Value',
        value: listingValues.active.cents ? '$' + listingValues.active.cents / 100 : '$0',
        inline: true,
      },
      { name: 'Total Sales Value', value: '$' + purchaseOrders.total_sales_cents / 100, inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
      {
        name: 'Current Available Earnings:',
        value: earnings.amount_cents ? '$' + earnings.amount_cents / 100 : '$0',
        inline: true,
      },
      { name: '\u200b', value: '\u200b', inline: true },
      { name: '\u200b', value: '\u200b', inline: true }
    );

  return meEmbed;
}

function help() {
  const helpEmbed = new Discord.MessageEmbed()
    .setColor('#7756fe')
    .setTitle('alias Help')
    .setDescription(
      'All the alias account commands\n\nAn alias account is required to use the commands. To gain access to an alias account, you must have a GOAT account with a seller score of 150 or greater. Each command will only work for the bound alias account. It is not possible to control the listings for another alias account.\n\n[Click here for more info](https://apps.apple.com/us/app/alias-sell-sneakers-apparel/id1467090341)\n\nIf no alias account is bound to the Discord account, DM \n``!login <email> <password>`` to the daijoubu bot to login.'
    )
    .addFields(
      { name: `!alias list`, value: `Lists an item` },
      { name: '!alias listings', value: 'Returns all current listings' },
      { name: '!alias check', value: 'Checks if all listings match their current lowest ask' },
      { name: '!alias update', value: 'Updates specified listings to their current lowest ask' },
      { name: '!alias edit', value: 'Edits the asking price for specified listings' },
      { name: '!alias delete', value: 'Deletes specified listings' },
      { name: '!alias orders', value: 'Returns all current orders' },
      { name: '!alias confirm', value: 'Confirms specified orders' }
    );

  return helpEmbed;
}
