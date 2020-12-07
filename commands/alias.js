const fetch = require('node-fetch');
const Discord = require('discord.js');
const Money = require('js-money');
const Sentry = require('@sentry/node');
const encryption = require('../scripts/encryption');
const refresh = require('../scripts/refresh');

const Users = require('../models/users');
const Listings = require('../models/listings');
const Orders = require('../models/orders');

const response = {
  SUCCESS: 'success',
  NO_ITEMS: 'no_items',
  NO_CHANGE: 'no_change',
  EXIT: 'exit',
  TIMEOUT: 'timeout',
  ERROR: 'error',
};

const maxRetries = 3;

exports.run = async (client, message, args) => {
  try {
    if (args.length == 0) {
      throw new Error('Empty command');
    }

    const query = message.content.slice(7);
    const command = args[0].toLowerCase();
    let loginToken = '';
    const id = message.author.id;
    let user = null;

    try {
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
        command == 'me' ||
        command == 'earnings' ||
        command == 'cashout'
      ) {
        user = await Users.find({ d_id: id });

        if (user.length == 0) {
          throw new Error('Not logged in');
        }

        user = user[0];
        loginToken = encryption.decrypt(user.login);
      }

      let toReturn = '';
      let returnedEnum = null;

      switch (command) {
        case 'check':
          let userListingsCheckArray = [];
          let checkArray = [];

          if (args.length < 2) {
            [checkArray, returnedEnum, userListingsCheckArray] = await check(user);
          } else {
            throw new Error('Too many parameters');
          }

          if (returnedEnum == response.SUCCESS) {
            for (let i = 0; i < checkArray.length; i++) {
              if (i == 0) {
                let initialString = 'Current Listings With a Lower Ask:';
                initialString += checkArray[i];
                await message.channel.send('```' + initialString + '```');
              } else {
                await message.channel.send('```' + checkArray[i] + '```');
              }
            }
            console.log('!alias check completed\n');
          } else if (returnedEnum == response.NO_CHANGE) {
            toReturn = '```All listing(s) match their lowest asks```';
          } else if (returnedEnum == response.NO_ITEMS) {
            toReturn = '```Account currently has no items listed```';
          }
          break;
        case 'update':
          let updateAll = false;
          let updateMsg = null;

          if (args.length > 1) {
            throw new Error('Too many parameters');
          }

          [returnedEnum, updateAll, updateMsg] = await update(client, loginToken, message, user);

          if (returnedEnum == response.SUCCESS) {
            if (updateAll) {
              await updateMsg
                .edit('```All listing(s) updated successfully```')
                .then(console.log(`${message} completed\n`));
            } else {
              await updateMsg
                .edit('```Specified listing(s) updated successfully```')
                .then(console.log(`${message} completed\n`));
            }
            await refresh(client, loginToken, user);
          } else if (returnedEnum == response.NO_CHANGE) {
            toReturn = '```All listing(s) already match their lowest asks```';
          } else if (returnedEnum == response.NO_ITEMS) {
            toReturn = '```Account currently has no Items listed```';
          } else if (returnedEnum == response.EXIT) {
            toReturn = '```Canceled```';
          } else if (returnedEnum == response.TIMEOUT) {
            toReturn = '```Command timed out```';
          }
          break;
        case 'listings':
          if (args.length > 1) {
            throw new Error('Too many parameters');
          }

          let placeholder = [];
          let listingArray = [];

          [listingArray, returnedEnum, placeholder] = await allListings(user);

          if (returnedEnum == response.SUCCESS) {
            for (let i = 0; i < listingArray.length; i++) {
              if (i == 0) {
                let initialString = 'Current Listings:';
                initialString += listingArray[i];
                await message.channel.send('```' + initialString + '```');
              } else {
                await message.channel.send('```' + listingArray[i] + '```');
              }
            }
            console.log('!alias listings completed\n');
          } else if (returnedEnum == response.NO_ITEMS) {
            toReturn = '```Account currently has no items listed```';
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
                .edit('```All listing(s) deleted successfully```')
                .then(console.log(`${message} completed\n`));
            } else {
              await deleteMsg
                .edit('```Specified listing(s) deleted successfully```')
                .then(console.log(`${message} completed\n`));
            }
          } else if (returnedEnum == response.NO_ITEMS) {
            toReturn = '```Account currently has no items listed```';
          } else if (returnedEnum == response.EXIT) {
            toReturn = '```Canceled```';
          } else if (returnedEnum == response.TIMEOUT) {
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
            await editMsg.edit('```Listing edited successfully```').then(console.log(`${message} completed\n`));
            await refresh(client, loginToken, user);
          } else if (returnedEnum == response.EXIT) {
            toReturn = '```Canceled```';
          } else if (returnedEnum == response.TIMEOUT) {
            toReturn = '```Command timed out```';
          }
          break;
        case 'orders':
          if (args.length > 1) {
            throw new Error('Too many parameters');
          }

          let tempOrders = {};

          [toReturn, returnedEnum, tempOrders] = await getOrders(user);

          if (returnedEnum == response.SUCCESS) {
            toReturn = '```' + toReturn + '```';
          } else if (returnedEnum == response.NO_ITEMS) {
            toReturn = '```Account currently has no open orders```';
          }
          break;
        case 'confirm':
          let confirmAll = false;
          let confirmMsg = null;

          [returnedEnum, confirmAll, confirmMsg] = await confirm(client, loginToken, message, user);

          if (returnedEnum == response.SUCCESS) {
            if (confirmAll) {
              await confirmMsg
                .edit('```All orders(s) confirmed successfully```')
                .then(console.log(`${message} completed\n`));
            } else {
              await confirmMsg
                .edit('```Specified orders(s) confirmed successfully```')
                .then(console.log(`${message} completed\n`));
            }
          } else if (returnedEnum == response.NO_ITEMS) {
            toReturn = '```Currently no order(s) to confirm on account```';
          } else if (returnedEnum == response.NO_CHANGE) {
            toReturn = '```Currently all open order(s) are confirmed```';
          } else if (returnedEnum == response.EXIT) {
            toReturn = '```Canceled```';
          } else if (returnedEnum == response.TIMEOUT) {
            toReturn = '```Command timed out```';
          }
          break;
        case 'settings':
          let edit = false;

          if (args.length > 2) {
            throw new Error('Too many parameters');
          } else if (args[1] && args[1].toLowerCase() == 'edit') {
            edit = true;
          } else {
            throw new Error('Incorrect format');
          }

          [toReturn, returnedEnum] = await settings(message, user, edit);

          if (returnedEnum == response.SUCCESS) {
            toReturn = toReturn;
          } else if (returnedEnum == response.EXIT) {
            toReturn = '```Canceled```';
          } else if (returnedEnum == response.TIMEOUT) {
            toReturn = '```Command timed out```';
          } else if (returnedEnum == response.NO_ITEMS) {
            toReturn = '```Account currently has no items listed```';
          }
          break;
        case 'list':
          let params = message.content.slice(12).toLowerCase().split(' ');

          let valid = false;
          let sizingArray = [];
          let searchParams = '';
          let listString = '';
          let listMsg = null;
          let lower = false;

          [valid, returnedEnum, sizingArray, searchParams] = await checkListParams(params);

          if (!valid && returnedEnum == response.NO_CHANGE) {
            throw new Error('Invalid list command');
          } else if (valid) {
            [returnedEnum, listString, listMsg, lower] = await list(
              client,
              user,
              message,
              loginToken,
              sizingArray,
              searchParams
            );
          }

          if (returnedEnum == response.SUCCESS) {
            if (!lower) {
              await listMsg.edit('```' + listString + '```').then(console.log(`${message} completed\n`));
            } else {
              toReturn = '```' + listString + '```';
            }
          } else if (returnedEnum == response.EXIT) {
            toReturn = '```Canceled```';
          } else if (returnedEnum == response.NO_CHANGE) {
            toReturn = '```No new item(s) listed```';
          } else if (returnedEnum == response.TIMEOUT) {
            toReturn = '```Command timed out```';
          }
          break;
        case 'me':
          toReturn = await me(client, loginToken);
          break;
        case 'consign':
          let searchQuery = query.slice(9);

          if (searchQuery.length == 0) {
            throw new Error('Empty command');
          }

          toReturn = await consign(client, searchQuery);
          break;
        case 'earnings':
          let amount = 0;

          [toReturn, amount] = await earnings(user);

          toReturn = '```' + toReturn + '```';
          break;
        case 'cashout':
          if (args.length > 1) {
            throw new Error('Too many parameters');
          }

          let newAmount = 0;
          let cashOutMsg = null;

          [returnedEnum, newAmount, cashOutMsg] = await cashOut(client, loginToken, user, message);

          if (returnedEnum == response.SUCCESS) {
            await cashOutMsg.edit('```' + 'Cash out successful' + '```');
            toReturn =
              '```' + `Current Available Earnings: $${Money.fromDecimal(parseInt(newAmount / 100), 'USD')}` + '```';
          } else if (returnedEnum == response.EXIT) {
            toReturn = '```Canceled```';
          } else if (returnedEnum == response.TIMEOUT) {
            toReturn = '```Command timed out```';
          } else if (returnedEnum == response.NO_CHANGE) {
            toReturn = '```No earnings available for cash out```';
          }
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
      Sentry.captureException(err);

      switch (err.message) {
        case 'No hits':
          message.channel.send('```No products found matching search parameters```');
          break;
        case 'Not exist':
          message.channel.send('```Fetch error - Page does not exist```');
          break;
        case 'Login expired':
          message.channel.send('```Login expired```');
          break;
        case 'No data':
          message.channel.send('```Matched product has no data```');
          break;
        case 'Not logged in':
          message.channel.send(
            '```Command not available\nPlease login via daijoubu DMS with the format:\n\t!login <email> <password>```'
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
        case 'Error editing listing update rate':
          message.channel.send('```Error editing listing update rate```');
          break;
        case 'Max retries':
          message.channel.send('```Request error - Max retries reached```');
          break;
        case 'Missing phone number':
          message.channel.send('```Account is missing phone number\nCommand not available until one is added```');
          break;
        case 'Invalid size':
          message.channel.send('```Listing parameters has one or more non-existing sizes```');
          break;
        case 'Too many parameters':
          message.channel.send('```Command has too many parameters```');
          break;
        case 'Incorrect format':
          message.channel.send('```Incorrect format```');
          break;
        case 'Invalid list command':
          message.channel.send(
            '```' +
              `Incorrect format\nCorrect format is:\n\n!alias list <search parameters> [<size (num)> REQUIRED,<price (num, 'lowest')> REQUIRED,<amount (num)> OR <listing update rate ('live', 'manual')> OPTIONAL,<listing update rate ('live', 'manual')> OPTIONAL] [] ...\n\nExamples:\n\t[10,lowest]\t[10,500]\t[10,500,live]\t[10,500,manual]\t[10,500,4,live]` +
              '```'
          );
          break;
        default:
          message.channel.send('```Unexpected Error```');
          break;
      }
    }
  } catch (err) {
    console.log(err);

    switch (err.message) {
      case 'Empty command':
        message.channel.send('```Command is missing parameters```');
        break;
      default:
        message.channel.send('```Unexpected Error```');
        break;
    }
  }
};

async function aliasSearch(client, query) {
  let searchRes = 0;
  let res = null;
  let count = 0;

  while (searchRes != 200) {
    res = await fetch('https://2fwotdvm2o-dsn.algolia.net/1/indexes/product_variants_v2/query', {
      method: 'POST',
      headers: client.config.goatHeader,
      body: `{"params":"query=${encodeURIComponent(query)}"}`,
    })
      .then((res, err) => {
        searchRes = res.status;

        if (res.status == 200) {
          return res.json();
        } else {
          console.log('Res is', res.status);
          console.trace();

          if (err) {
            throw new Error(err);
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

    count++;

    if (count == maxRetries) {
      throw new Error('Max retries');
    }
  }

  let category = res.product_category ? res.product_category : 'N/A';
  let name = res.name;
  let productURL = 'https://www.goat.com/sneakers/' + res.slug;
  let description = '';
  if (res.story_html != null) {
    description = res.story_html;
    description = description.replace('<p>', '');
    description = description.replace('</p>', '');
  }
  let image = res.main_glow_picture_url ? res.main_glow_picture_url : null;
  let colorway = res.details ? res.details : 'N/A';
  let retail = res.retail_price_cents ? '$' + res.retail_price_cents / 100 : 'N/A';
  let SKU = res.sku ? res.sku : 'N/A';
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

  let pageDataRes = 0;
  count = 0;

  while (pageDataRes != 200) {
    pageData = await fetch(
      `https://sell-api.goat.com/api/v1/analytics/products/${res.slug}/availability?box_condition=1&shoe_condition=1`,
      {
        headers: client.config.headers,
      }
    ).then((res, err) => {
      pageDataRes = res.status;

      if (res.status == 200) {
        return res.json();
      } else {
        console.log('Res is', res.status);
        console.trace();

        if (err) {
          throw new Error(err);
        }
      }
    });

    count++;

    if (count == maxRetries) {
      throw new Error('Max retries');
    }
  }

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

  for (variant of pageData.availability) {
    if (variant.lowest_price_cents || variant.highest_offer_cents || variant.last_sold_price_cents) {
      if (variant.lowest_price_cents) {
        lowestPrice += `${variant.size} - $${variant.lowest_price_cents / 100}\n`;
        averageLowestPrice += variant.lowest_price_cents / 100;
        lowest++;
      } else {
        lowestPrice += `${variant.size} - N/A\n`;
      }

      if (variant.highest_offer_cents) {
        highestBid += `${variant.size} - $${variant.highest_offer_cents / 100}\n`;
        averageHighestBid += variant.highest_offer_cents / 100;
        highest++;
      } else {
        highestBid += `${variant.size} - N/A\n`;
      }

      if (variant.last_sold_price_cents) {
        lastSold += `${variant.size} - $${variant.last_sold_price_cents / 100}\n`;
        averageLastSold += variant.last_sold_price_cents / 100;
        last++;
      } else {
        lastSold += `${variant.size} - N/A\n`;
      }
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
      { name: 'Colorway', value: colorway, inline: true },
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

async function check(user) {
  const userListings = await Listings.find({ d_id: user.d_id });
  const userListingsArray = userListings[0].listings;

  if (userListingsArray.length == 0) {
    return ['', response.NO_ITEMS, null];
  }

  let newLowestAsksArray = [];
  let j = 0;
  let userListingsCheckArray = [];
  let num = 0;

  for (let i = 0; i < userListingsArray.length; i++) {
    if (i % 15 == 0 && i != 0) {
      j++;
    }

    let obj = userListingsArray[i];

    if (obj.price > obj.lowest) {
      userListingsCheckArray.push(obj);

      if (newLowestAsksArray[j] == undefined) {
        newLowestAsksArray[j] = `\n\t${num}. ${obj.name}\n\t\tsize: ${obj.size} $${obj.price / 100} => $${
          obj.lowest / 100
        }\n`;
      } else {
        newLowestAsksArray[j] += `\n\t${num}. ${obj.name}\n\t\tsize: ${obj.size} $${obj.price / 100} => $${
          obj.lowest / 100
        }\n`;
      }

      num++;
    }
  }

  if (userListingsCheckArray.length != 0) {
    return [newLowestAsksArray, response.SUCCESS, userListingsCheckArray];
  } else {
    return ['', response.NO_CHANGE, null];
  }
}

async function update(client, loginToken, message, user) {
  let nums = [];
  let all = false;
  let valid = false;
  let exit = false;
  let stopped = false;
  let listings = await getListings(client, loginToken);

  let listingObj = [];

  for (let i = 0; i < listings.listing.length; i++) {
    listingObj = await checkListings(listings.listing[i], listingObj);
  }

  let [checkArray, listingEnum, userListingsCheckArray] = await check(user);

  if (listingEnum == response.SUCCESS) {
    for (let i = 0; i < checkArray.length; i++) {
      if (i == 0) {
        let initialString = 'Current Listings With a Lower Ask:';
        initialString += checkArray[i];
        await message.channel.send('```' + initialString + '```');
      } else {
        await message.channel.send('```' + checkArray[i] + '```');
      }
    }
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
      stopped = true;
      exit = true;
      console.log('Canceled\n');
    } else if (checkNumParams(nums)) {
      if (nums[0].toLowerCase() == 'all') {
        all = true;
        collector.stop();
        stopped = true;
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
          stopped = true;
        }
      }
    } else {
      message.channel.send('```' + `Invalid format\nEnter 'all' or listing number(s)` + '```');
    }
  }

  if (exit) {
    return [response.EXIT, null, null];
  } else if (!stopped) {
    return [response.TIMEOUT, null, null];
  }

  const msg = await message.channel.send('```' + `Updating ...` + '```');

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
        for (let j = 0; j < listingObj.length; j++) {
          if (listingObj[j].id == userListingsCheckArray[i].id) {
            updateRes = await updateListing(client, loginToken, listingObj[j]);
            break;
          }
        }
      }
    }
  }

  if (updateRes == 200) {
    return [response.SUCCESS, all, msg];
  }
}

async function getListings(client, loginToken) {
  let getStatus = 0;
  let listings = {};
  let count = 0;

  while (getStatus != 200) {
    listings = await fetch(`https://sell-api.goat.com/api/v1/listings?filter=1&includeMetadata=1&page=1`, {
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
    }).then((res, err) => {
      getStatus = res.status;

      if (res.status == 200) {
        return res.json();
      } else if (res.status == 401) {
        throw new Error('Login expired');
      } else {
        console.log('Res is', res.status);
        console.trace();

        if (err) {
          console.log(err);
        }
      }
    });

    count++;

    if (count == maxRetries) {
      throw new Error('Max retries');
    }
  }

  for (let i = 1; i < listings.metadata.total_pages; i++) {
    let temp = {};
    getStatus = 0;
    count = 0;

    while (getStatus != 200) {
      temp = await fetch(`https://sell-api.goat.com/api/v1/listings?filter=1&includeMetadata=1&page=${i + 1}`, {
        headers: {
          'user-agent': client.config.aliasHeader,
          authorization: `Bearer ${loginToken}`,
        },
      }).then((res, err) => {
        getStatus = res.status;

        if (res.status == 200) {
          return res.json();
        } else if (res.status == 401) {
          throw new Error('Login expired');
        } else {
          console.log('Res is', res.status);
          console.trace();

          if (err) {
            console.log(err);
          }
        }
      });

      count++;

      if (count == maxRetries) {
        throw new Error('Max retries');
      }
    }

    for (let j = 0; j < temp.listing.length; j++) {
      listings.listing.push(temp.listing[j]);
    }
  }

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
  let updateRes = 0;
  let count = 0;

  while (updateRes != 200) {
    updateRes = await fetch(`https://sell-api.goat.com/api/v1/listings/${obj.id}`, {
      method: 'PUT',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
      body: `{"listing":${JSON.stringify(obj)}}`,
    }).then((res, err) => {
      if (res.status == 401) {
        throw new Error('Login expired');
      } else if (res.status == 404) {
        throw new Error('Not exist');
      } else if (res.status != 200) {
        console.log('Res is', res.status);
        console.trace();

        if (err) {
          throw new Error(err);
        }
      }

      return res.status;
    });

    count++;

    if (count == maxRetries) {
      throw new Error('Max retries');
    }
  }

  return updateRes;
}

async function allListings(user) {
  const userListings = await Listings.find({ d_id: user.d_id });
  const userListingsArray = userListings[0].listings;
  let listingArray = [];

  if (userListingsArray.length == 0) {
    return ['', response.NO_ITEMS, null];
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

  return [listingArray, response.SUCCESS, listingIds];
}

async function deleteSearch(client, loginToken, message, user) {
  const userListings = await Listings.find({ d_id: user.d_id });
  const userListingsArray = userListings[0].listings;

  let all = false;
  let valid = true;
  let nums = [];
  let exit = false;
  let stopped = false;

  let [listings, returnedEnum, []] = await allListings(user);

  if (returnedEnum == response.SUCCESS) {
    for (let i = 0; i < listings.length; i++) {
      if (i == 0) {
        let initialString = 'Current Listings:';
        initialString += listings[i];
        await message.channel.send('```' + initialString + '```');
      } else {
        await message.channel.send('```' + listings[i] + '```');
      }
    }
  } else if (returnedEnum == response.NO_ITEMS) {
    return [response.NO_ITEMS, all, null];
  }

  await message.channel.send('```' + `Enter 'all' or listing number(s) to delete\nEnter 'n' to cancel` + '```');

  const collector = message.channel.createMessageCollector((msg) => msg.author.id == message.author.id, {
    time: 30000,
  });

  for await (const message of collector) {
    nums = message.content.split(' ');

    if (message.content.toLowerCase() == 'n') {
      collector.stop();
      stopped = true;
      exit = true;
      console.log('Canceled\n');
    } else if (checkNumParams(nums)) {
      if (nums[0].toLowerCase() == 'all') {
        collector.stop();
        stopped = true;
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
          stopped = true;
        }
      }
    } else {
      message.channel.send('```' + `Invalid format\nEnter 'all' or listing number(s)` + '```');
    }
  }

  if (exit) {
    return [response.EXIT, null, null];
  } else if (!stopped) {
    return [response.TIMEOUT, null, null];
  }

  const msg = await message.channel.send('```' + `Deleting ...` + '```');

  let deleteRes = null;

  if (all) {
    for (let i = 0; i < userListingsArray.length; i++) {
      deleteRes = await deletion(client, loginToken, user, userListingsArray[i].id);
    }
  } else {
    if (valid) {
      for (let i = 0; i < nums.length; i++) {
        deleteRes = await deletion(client, loginToken, user, userListingsArray[parseInt(nums[i])].id);
      }
    }
  }

  if (deleteRes == response.SUCCESS) {
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

async function deletion(client, loginToken, user, listingId) {
  let deactivateRes = 0;
  let cancelRes = 0;
  let count = 0;

  while (deactivateRes != 200) {
    deactivateRes = await fetch(`https://sell-api.goat.com/api/v1/listings/${listingId}/deactivate`, {
      method: 'PUT',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
      body: `{"id":"${listingId}"}`,
    }).then((res, err) => {
      if (res.status == 401) {
        throw new Error('Login expired');
      } else if (res.status == 404) {
        throw new Error('Not exist');
      } else if (res.status != 200) {
        console.log('Res is', res.status);
        console.trace();

        if (err) {
          throw new Error(err);
        }
      }

      return res.status;
    });

    count++;

    if (count == maxRetries) {
      throw new Error('Max retries');
    }
  }

  count = 0;

  while (cancelRes != 200) {
    cancelRes = await fetch(` https://sell-api.goat.com/api/v1/listings/${listingId}/cancel`, {
      method: 'PUT',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
      body: `{"id":"${listingId}"}`,
    }).then((res, err) => {
      if (res.status == 401) {
        throw new Error('Login expired');
      } else if (res.status == 404) {
        throw new Error('Not exist');
      } else if (res.status != 200) {
        console.log('Res is', res.status);
        console.trace();

        if (err) {
          throw new Error(err);
        }
      }

      return res.status;
    });

    count++;

    if (count == maxRetries) {
      throw new Error('Max retries');
    }
  }

  await Listings.updateOne({ d_id: user.d_id }, { $pull: { listings: { id: listingId } } }).catch((err) =>
    console.log(err)
  );

  if (deactivateRes == 200 && cancelRes == 200) {
    return response.SUCCESS;
  }
}

async function editListing(client, loginToken, user, message) {
  let [listings, listingEnum, listingIds] = await allListings(user);

  if (listingEnum == response.SUCCESS) {
    for (let i = 0; i < listings.length; i++) {
      if (i == 0) {
        let initialString = 'Current Listings:';
        initialString += listings[i];
        await message.channel.send('```' + initialString + '```');
      } else {
        await message.channel.send('```' + listings[i] + '```');
      }
    }
  } else {
    return response.NO_ITEMS;
  }

  let exit = false;
  let stopped = false;
  let input = '';

  await message.channel.send('```' + `Enter listing number to edit\nEnter 'n' to cancel` + '```');

  const collector1 = message.channel.createMessageCollector((msg) => msg.author.id == message.author.id, {
    time: 30000,
  });

  for await (const message of collector1) {
    input = message.content.toLowerCase();

    if (input == 'n') {
      collector1.stop();
      stopped = true;
      exit = true;
      console.log('Canceled');
    } else if (!isNaN(input)) {
      if (parseInt(input) >= listingIds.length) {
        message.channel.send('```' + 'Entered listing number does not exist' + '```');
      } else {
        collector1.stop();
        stopped = true;
      }
    } else {
      message.channel.send('```' + `Invalid format\nEnter a valid number` + '```');
    }
  }

  if (exit) {
    return [response.EXIT, null];
  } else if (!stopped) {
    return [response.TIMEOUT, null];
  }

  await message.channel.send('```' + `Enter new price or 'lowest'\nEnter 'n' to cancel` + '```');

  let getJSONRes = 0;
  let getJSON = null;
  let count = 0;

  while (getJSONRes != 200) {
    getJSON = await fetch(`https://sell-api.goat.com/api/v1/listings/${listingIds[input]}`, {
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
    }).then((res, err) => {
      getJSONRes = res.status;

      if (res.status == 200) {
        return res.json();
      } else if (res.status == 401) {
        throw new Error('Login expired');
      } else if (res.status == 404) {
        throw new Error('Not exist');
      } else {
        console.log('Res is', res.status);
        console.trace();

        if (err) {
          throw new Error(err);
        }
      }
    });

    count++;

    if (count == maxRetries) {
      throw new Error('Max retries');
    }
  }

  let lowest = getJSON.listing.product.lowest_price_cents / 100;
  let price = 0;
  stopped = false;

  const collector2 = message.channel.createMessageCollector((msg) => msg.author.id == message.author.id, {
    time: 30000,
  });

  for await (const message of collector2) {
    price = message.content;

    if (message.content.toLowerCase() == 'lowest') {
      collector2.stop();
      stopped = true;
      price = lowest;
    } else if (message.content.toLowerCase() == 'n') {
      collector2.stop();
      stopped = true;
      exit = true;
      console.log('Canceled');
    } else if (!isNaN(price)) {
      collector2.stop();
      stopped = true;

      let confirm = false;

      while (!confirm && parseInt(price) < lowest) {
        [confirm, price] = await confirmEdit(lowest, price, message);

        if (price == -1) {
          exit = true;
        } else if (price == -2) {
          stopped = true;
        }
      }
    } else {
      await message.channel.send('```Incorrect format\nEnter lowest or a valid number```');
    }
  }

  if (exit) {
    return [response.EXIT, null];
  } else if (!stopped) {
    return [response.TIMEOUT, null];
  }

  const msg = await message.channel.send('```Editing ...```');

  getJSON.listing.price_cents = (parseInt(price) * 100).toString();

  let editRes = 0;
  count = 0;

  while (editRes != 200) {
    editRes = await fetch(`https://sell-api.goat.com/api/v1/listings/${listingIds[input].id}`, {
      method: 'PUT',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
      body: `${JSON.stringify(getJSON)}`,
    }).then((res) => {
      if (res.status == 401) {
        throw new Error('Login expired');
      } else if (res.status == 404) {
        throw new Error('Not exist');
      } else if (res.status != 200) {
        console.log('Res is', res.status);
        console.trace();

        if (err) {
          throw new Error(err);
        }
      }

      return res.status;
    });

    count++;

    if (count == maxRetries) {
      throw new Error('Max retries');
    }
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

async function getOrders(user) {
  const userOrders = await Orders.find({ d_id: user.d_id });
  const userOrdersArray = userOrders[0].orders;

  if (userOrdersArray.length == 0) {
    return ['', response.NO_ITEMS, null];
  }

  let returnString = 'Current Open Orders:\n';

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
  let issuesString = '\tHas Issues:\n';
  let issuesNum = 0;
  let newString = '';
  let i = 0;

  userOrdersArray.forEach((order) => {
    let date = new Date(order.take_action_by);

    if (order.status == 'IN_REVIEW') {
      reviewString += `\t\t${reviewNum}. ${order.name} - ${order.size} $${order.price / 100}\n\t\t\tOrder number: ${
        order.number
      }\n`;
      reviewNum++;
    } else if (order.status == 'NEEDS_CONFIRMATION') {
      confirmString += `\t\t${confirmNum}. ${order.name} - ${order.size} $${order.price / 100}\n\t\t\tOrder number: ${
        order.number
      }\n\t\t\tConfirm by: ${date.getMonth() + 1}/${date.getDate()}\n`;
      confirmNum++;
    } else if (order.status == 'NEEDS_SHIPPING') {
      needShipString += `\t\t${needShipNum}. ${order.name} - ${order.size} $${order.price / 100}\n\t\t\tOrder number: ${
        order.number
      }\n\t\t\tShip by: ${date.getMonth() + 1}/${date.getDate()}\n`;
      needShipNum++;
    } else if (order.status == 'SHIPPED') {
      shippedString += `\t\t${shippedNum}. ${order.name} - ${order.size} $${order.price / 100}\n\t\t\tOrder number: ${
        order.number
      }\n\t\t\tUPS tracking number: ${order.tracking}\n`;
      shippedNum++;
    } else if (order.status == 'DROPPED_OFF') {
      droppedString += `\t\t${droppedNum}. ${order.name} - ${order.size} $${order.price / 100}\n\t\t\tOrder number: ${
        order.number
      }\n`;
      droppedNum++;
    } else if (order.status == 'RECEIVED') {
      receivedString += `\t\t${receivedNum}. ${order.name} - ${order.size} $${order.price / 100}\n\t\t\tOrder number: ${
        order.number
      }\n`;
      receivedNum++;
    } else if (order.status == 'HAS_ISSUES') {
      issuesString += `\t\t${issuesNum}. ${order.name} - ${order.size} $${order.price / 100}\n\t\t\tOrder number: ${
        order.number
      }\n`;
      issuesNum++;
    } else {
      newString += `\t${i}. ${order.name} - ${order.size} $${order.price / 100}\n\t\tOrder number: ${order.number}\n`;
      i++;
      console.log(`\nNew order status is '${order.status}'\n`);
    }
  });

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

  if (issuesNum != 0) {
    returnString += issuesString + '\n';
  }

  if (i != 0) {
    returnString += newString + '\n';
  }

  return [returnString, response.SUCCESS, userOrdersArray];
}

async function confirm(client, loginToken, message, user) {
  let [orderString, getOrdersEnum, userOrdersArray] = await getOrders(user);

  if (getOrdersEnum == response.NO_ITEMS) {
    return [response.NO_ITEMS, null, null];
  }

  let exit = false;
  let all = false;
  let valid = false;
  let nums = [];
  let orders = [];

  let confirmString = 'Needs Confirmation:\n';

  userOrdersArray.forEach((order) => {
    let date = new Date(order.take_action_by);

    if (order.status == 'NEEDS_CONFIRMATION') {
      confirmString += `\t${orders.length}. ${order.name} - ${order.size} $${order.price / 100}\n\t\tOrder number: ${
        order.number
      }\n\t\tConfirm by: ${date.getMonth() + 1}/${date.getDate()}\n`;

      orders.push(order.number);
    }
  });

  if (orders.length == 0) {
    return [response.NO_ITEMS, null, null];
  }

  await message.channel.send('```' + confirmString + '```');
  await message.channel.send('```' + `Enter 'all' or order number(s) to confirm\nEnter 'n' to cancel` + '```');

  let stopped = false;

  const collector = message.channel.createMessageCollector((msg) => msg.author.id == message.author.id, {
    time: 30000,
  });

  for await (const message of collector) {
    nums = message.content.split(' ');

    if (message.content.toLowerCase() == 'n') {
      collector.stop();
      stopped = true;
      exit = true;
      console.log('Canceled\n');
    } else if (checkNumParams(nums)) {
      if (nums[0].toLowerCase() == 'all') {
        all = true;
        collector.stop();
        stopped = true;
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
          stopped = true;
        }
      }
    } else {
      message.channel.send('```' + `Invalid format\nEnter 'all' or listing number(s)` + '```');
    }
  }

  if (exit) {
    return [response.EXIT, null, null];
  } else if (!stopped) {
    return [response.TIMEOUT, null, null];
  }

  let msg = await message.channel.send('```Confirming ... ```');

  if (all) {
    for (let i = 0; i < orders.length; i++) {
      await confirmation(client, loginToken, orders[i]);
    }
  } else {
    if (valid) {
      for (let i = 0; i < nums.length; i++) {
        await confirmation(client, loginToken, orders[nums[i]]);
      }
    }
  }

  return [response.SUCCESS, all, msg];
}

async function confirmation(client, loginToken, number) {
  let confirmation = 0;
  let count = 0;

  while (confirmation != 200) {
    confirmation = await fetch(`https://sell-api.goat.com/api/v1/purchase-orders/${number}/confirm`, {
      method: 'PUT',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
      body: `{"number":"${number}"}`,
    }).then((res, err) => {
      if (res.status == 401) {
        throw new Error('Login expired');
      } else if (res.status == 404) {
        throw new Error('Not exist');
      } else if (res.status != 200) {
        console.log('Res is', res.status);
        console.trace();

        if (err) {
          throw new Error(err);
        }
      }

      return res.status;
    });

    count++;

    if (count == maxRetries) {
      throw new Error('Max retries');
    }
  }

  let shipping = 0;
  count = 0;

  while (shipping != 200) {
    shipping = await fetch(`https://sell-api.goat.com/api/v1/purchase-orders/${number}/generate-shipping-label`, {
      method: 'PUT',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
      body: `{"number":"${number}"}`,
    }).then((res, err) => {
      if (res.status == 401) {
        throw new Error('Login expired');
      } else if (res.status == 404) {
        throw new Error('Not exist');
      } else if (res.status != 200) {
        console.log('Res is', res.status);
        console.trace();

        if (err) {
          throw new Error(err);
        }
      }

      return res.status;
    });

    count++;

    if (count == maxRetries) {
      throw new Error('Max retries');
    }
  }

  if (confirmation == 200 && shipping == 200) {
    return response.SUCCESS;
  }
}

async function settings(message, user, edit) {
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
    let stopped = false;

    await message.channel.send(userSettings).catch((err) => {
      throw new Error(err);
    });

    await message.channel.send(
      '```' +
        `0. Order confirmation refresh rate\n1. Default listing update rate\n2. Specified listing update rate\n\nEnter '0', '1', or '2' to edit\nEnter 'n' to cancel` +
        '```'
    );

    const collector = new Discord.MessageCollector(message.channel, (m) => m.author.id === message.author.id, {
      time: 30000,
    });

    for await (const message of collector) {
      let input = message.content.toLowerCase();

      if (input == 0) {
        collector.stop();
        stopped = true;
        returnedEnum = await editOrderRate(message, user);
      } else if (input == 1) {
        collector.stop();
        stopped = true;
        returnedEnum = await editDefaultListingRate(message, user);
      } else if (input == 2) {
        collector.stop();
        stopped = true;
        returnedEnum = await editSpecifiedListingRate(message, user);
      } else if (input == 'n') {
        collector.stop();
        stopped = true;
        exit = true;
        returnedEnum = response.EXIT;
      } else {
        await message.channel.send('```' + `Enter either '0', '1', or '2'` + '```');
      }
    }

    if (!stopped) {
      return ['', response.TIMEOUT];
    } else {
      return ['', returnedEnum];
    }
  }
}

async function editOrderRate(message, user) {
  let exit = false;
  let stopped = false;

  await message.channel.send(
    '```' + `Editing order confirmation refresh rate\n\tEnter 'live' or 'daily'\n\tEnter 'n' to cancel` + '```'
  );

  const collector = new Discord.MessageCollector(message.channel, (m) => m.author.id === message.author.id, {
    time: 30000,
  });

  for await (const message of collector) {
    let input = message.content.toLowerCase();

    if (input == 'live' || input == 'daily') {
      await Users.updateOne({ _id: user._id }, { $set: { 'settings.orderRefresh': input } }, async (err) => {
        if (!err) {
          await message.channel.send('```Order confirmation refresh rate edited successfully```');
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
      await message.channel.send('```' + `Enter either 'live' or 'daily'` + '```');
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

async function editDefaultListingRate(message, user) {
  let exit = false;
  let stopped = false;

  await message.channel.send(
    '```' + `Editing default listing update rate\n\tEnter 'live' or 'manual'\n\tEnter 'n' to cancel` + '```'
  );

  const collector = new Discord.MessageCollector(message.channel, (m) => m.author.id === message.author.id, {
    time: 30000,
  });

  for await (const message of collector) {
    let input = message.content.toLowerCase();

    if (input == 'live' || input == 'manual') {
      await Users.updateOne({ _id: user._id }, { $set: { 'settings.adjustListing': input } }, async (err) => {
        if (!err) {
          await message.channel.send('```Listing update refresh rate edited successfully```');
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
      await message.channel.send('```' + `Enter either 'live' or 'manual'` + '```');
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
  let [listings, listingEnum, listingIds] = await allListings(user);

  if (listingEnum == response.SUCCESS) {
    for (let i = 0; i < listings.length; i++) {
      if (i == 0) {
        let initialString = 'Current Listings:';
        initialString += listings[i];
        await message.channel.send('```' + initialString + '```');
      } else {
        await message.channel.send('```' + listings[i] + '```');
      }
    }
  } else {
    return response.NO_ITEMS;
  }

  let exit = false;
  let stopped = false;
  let all = false;
  let nums = '';

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
    } else if (checkNumInputs(split, listingIds.length - 1)) {
      nums = split;
      collector1.stop();
      stopped = true;
    } else {
      msg.channel.send('```' + `Invalid format\nEnter valid number(s)` + '```');
    }
  }

  if (exit) {
    return response.EXIT;
  } else if (!stopped) {
    return response.TIMEOUT;
  }

  await message.channel.send('```' + `Enter 'live' or 'manual'\nEnter 'n' to cancel` + '```');

  let input = '';
  stopped = false;
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
    for (i = 0; i < listingIds.length; i++) {
      await Listings.updateOne({ 'listings.id': listingIds[i] }, { $set: { 'listings.$.setting': input } }).catch(
        (err) => {
          throw new Error(err);
        }
      );
    }

    if (i == listingIds.length) {
      await editMsg.edit('```' + 'Listing update rate(s) updated successfully' + '```');
      console.log('Listing refresh rate(s) successfully updated\n');
    } else {
      throw new Error('Error editing listing update rate');
    }
  } else {
    for (i = 0; i < nums.length; i++) {
      await Listings.updateOne({ 'listings.id': listingIds[nums[i]] }, { $set: { 'listings.$.setting': input } }).catch(
        (err) => {
          throw new Error(err);
        }
      );
    }

    if (i == nums.length) {
      await editMsg.edit('```' + 'Listing update rate(s) updated successfully' + '```');
      console.log('Listing refresh rate(s) successfully updated\n');
    } else {
      throw new Error('Error editing listing update rate');
    }
  }

  return response.SUCCESS;
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

      if (crnt[0] != '[' || crnt[crnt.length - 1] != ']') {
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

      if (crntArray[2]) {
        if (isNaN(crntArray[2])) {
          if (crntArray[2].toLowerCase() != 'live' && crntArray[2].toLowerCase() != 'manual') {
            console.log('here3\n');
            return [false, response.NO_CHANGE, [], ''];
          }
        }
      }

      let rate = false;

      if (crntArray[2] && (crntArray[2].toLowerCase() == 'live' || crntArray[2].toLowerCase() == 'manual')) {
        rate = true;
      }

      if (crntArray[3] && rate && (crntArray[3].toLowerCase() == 'live' || crntArray[3].toLowerCase() == 'manual')) {
        return [false, response.NO_CHANGE, [], ''];
      }

      if (crntArray[3] && !rate && crntArray[3].toLowerCase() != 'live' && crntArray[3].toLowerCase() != 'manual') {
        return [false, response.NO_CHANGE, [], ''];
      }

      sizingArray.push(params[i]);
    }
  }

  query = query.substring(0, query.length - 1);

  if (bracketCount == 0) {
    return [false, response.NO_CHANGE, [], ''];
  }

  return [true, response.SUCCESS, sizingArray, query];
}

async function list(client, user, message, loginToken, sizingArray, query) {
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
  let stopped = false;
  let lower = false;

  const collector = message.channel.createMessageCollector((msg) => msg.author.id == message.author.id, {
    time: 30000,
  });

  for await (const message of collector) {
    let input = message.content.toLowerCase();

    if (input == 'y' || input == 'n') {
      if (input == 'n') {
        collector.stop();
        stopped = true;
        console.log('Canceled\n');
        exit = true;
      } else {
        collector.stop();
        stopped = true;
        msg = await message.channel.send('```Listing ...```');

        [returnedEnum, returnString, lower] = await doList(
          client,
          user,
          loginToken,
          message,
          searchProduct,
          sizingArray
        );
      }
    } else {
      await message.channel.send('```' + `Enter either 'y' or 'n'` + '```');
    }
  }

  if (exit) {
    return [response.EXIT, returnString, msg, lower];
  } else if (!stopped) {
    return [response.TIMEOUT, returnString, msg, lower];
  } else {
    return [returnedEnum, returnString, msg, lower];
  }
}

async function doList(client, user, loginToken, message, searchProduct, sizingArray) {
  let returnString = 'Successfully Listed:\n\t' + searchProduct.title + '\n';
  let returnedEnum = null;
  let url = searchProduct.url.split('/');
  let slug = url[url.length - 1];

  let pageDataRes = 0;
  let count = 0;

  while (pageDataRes != 200) {
    pageData = await fetch(
      `https://sell-api.goat.com/api/v1/analytics/products/${slug}/availability?box_condition=1&shoe_condition=1`,
      {
        headers: client.config.headers,
      }
    ).then((res, err) => {
      pageDataRes = res.status;

      if (res.status == 200) {
        return res.json();
      } else {
        console.log('Res is', res.status);
        console.trace();

        if (err) {
          throw new Error(err);
        }
      }
    });

    count++;

    if (count == maxRetries) {
      throw new Error('Max retries');
    }
  }

  let productRes = 0;
  let product = null;
  count = 0;

  while (productRes != 200) {
    product = await fetch('https://sell-api.goat.com/api/v1/listings/get-product', {
      method: 'POST',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
      body: `{"id":"${slug}"}`,
    }).then((res, err) => {
      productRes = res.status;

      if (res.status == 200) {
        return res.json();
      } else if (res.status == 401) {
        throw new Error('Login expired');
      } else {
        console.log('Res is', res.status);
        console.trace();

        if (err) {
          throw new Error(err);
        }
      }
    });

    count++;

    if (count == maxRetries) {
      throw new Error('Max retries');
    }
  }

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
  let detectedLower = false;

  for (i = 0; i < sizingArray.length; i++) {
    let crnt = sizingArray[i].substring(1, sizingArray[i].length - 1).split(',');

    let size = crnt[0];
    let price = crnt[1];
    let rate = null;
    let amount = null;

    if (crnt[2] && (crnt[2].toLowerCase() == 'live' || crnt[2].toLowerCase() == 'manual')) {
      rate = crnt[2].toLowerCase();
    } else if (!isNaN(crnt[2])) {
      amount = crnt[2];
    }

    if (crnt[3]) {
      rate = crnt[3].toLowerCase();
    }

    let lowest = 0;
    let lower = false;
    let existingSize = false;

    if (amount == null) {
      amount = 1;
    }

    listing.listing.sizeOption.name = size;
    listing.listing.sizeOption.value = parseFloat(size);

    for (let k = 0; k < pageData.availability.length; k++) {
      if (pageData.availability[k].size == parseFloat(size)) {
        existingSize = true;

        if (!pageData.availability[k].lowest_price_cents) {
          throw new Error('No lowest ask');
        } else {
          lowest = parseInt(pageData.availability[k].lowest_price_cents);
        }

        if (price == 'lowest') {
          price = lowest;
          listing.listing.priceCents = price;
        } else {
          listing.listing.priceCents = parseInt(price) * 100;
        }

        if (lowest > listing.listing.priceCents) {
          lower = true;
          detectedLower = true;
        }
        break;
      }
    }

    if (!existingSize) {
      throw new Error('Invalid size');
    }

    async function whileRequest(listing, amount, returnString) {
      let j = 0;

      while (j < parseInt(amount)) {
        await listReq(client, loginToken, listing, user, rate, lowest);
        returnString += `\t\t${j}. size: ${listing.listing.sizeOption.name} - $${listing.listing.priceCents / 100}\n`;

        if (rate != null) {
          if (rate == 'live') {
            rate = 'Live';
          } else if (rate == 'manual') {
            rate = 'Manual';
          }

          returnString += `\t\t\tUpdate Rate: ${rate}\n`;
        }

        j++;
      }

      returnString += '\n';

      return returnString;
    }

    if (lower) {
      let skip = false;
      let stopped = false;

      await message.channel.send(
        '```' +
          `Current lowest ask for size ${size}: $${
            lowest / 100
          }\nYou entered $${price}, a lower asking price than the current lowest asking price of $${
            lowest / 100
          }\n\nEnter 'y to confirm, 'n' to skip size ${size}` +
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
            stopped = true;
            await message.channel.send('```' + `Skipped size ${size}` + '```');
            skip = true;
          } else {
            collector.stop();
            stopped = true;
            returnString = await whileRequest(listing, amount, returnString);
            returnedEnum = response.SUCCESS;
          }
        } else {
          await message.channel.send('```' + `Enter either 'y' or 'n'` + '```');
        }
      }

      if (!stopped) {
        returnedEnum = response.TIMEOUT;
      }

      if (skip) {
        continue;
      }
    } else {
      returnString = await whileRequest(listing, amount, returnString);
      returnedEnum = response.SUCCESS;
    }
  }

  if (i == sizingArray.length) {
    if (returnedEnum == null) {
      returnedEnum = response.NO_CHANGE;
    }

    return [returnedEnum, returnString, detectedLower];
  } else {
    throw new Error('Error listing');
  }
}

async function listReq(client, loginToken, listing, user, rate, lowest) {
  let list = null;
  let listRes = 0;
  let count = 0;

  while (listRes != 200) {
    list = await fetch(`https://sell-api.goat.com/api/v1/listings`, {
      method: 'POST',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
      body: JSON.stringify(listing),
    }).then((res, err) => {
      listRes = res.status;

      if (res.status == 200) {
        return res.json();
      } else if (res.status == 401) {
        throw new Error('Login expired');
      } else {
        console.log('Res is', res.status);
        console.trace();

        if (err) {
          console.log(err);
        }
      }
    });

    count++;

    if (count == maxRetries) {
      throw new Error('Max retries');
    }
  }

  let activate = 0;
  count = 0;

  while (activate != 200) {
    activate = await fetch(`https://sell-api.goat.com/api/v1/listings/${list.listing.id}/activate`, {
      method: 'PUT',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
      body: `{"id":"${list.listing.id}"}`,
    }).then((res, err) => {
      if (res.status == 401) {
        throw new Error('Login expired');
      } else if (res.status != 200) {
        console.log('Res is', res.status);
        console.trace();

        if (err) {
          throw new Error(err);
        }
      }

      return res.status;
    });

    count++;

    if (count == maxRetries) {
      throw new Error('Max retries');
    }
  }

  let obj = {
    id: list.listing.id,
    name: listing.listing.product.name,
    size: parseFloat(listing.listing.sizeOption.value),
    price: parseInt(listing.listing.priceCents),
    slug: listing.listing.productId,
    lowest: parseInt(lowest),
    setting: rate == null ? user.settings.adjustListing : rate,
  };

  await Listings.updateOne({ d_id: user.d_id }, { $push: { listings: obj } }).catch((err) => console.log(err));
}

async function me(client, loginToken) {
  let meRes = 0;
  let me = null;
  let count = 0;

  while (meRes != 200) {
    me = await fetch('https://sell-api.goat.com/api/v1/unstable/users/me', {
      method: 'POST',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
      body: '{}',
    }).then((res, err) => {
      meRes = res.status;

      if (res.status == 200) {
        return res.json();
      } else if (res.status == 401) {
        throw new Error('Login expired');
      } else {
        console.log('Res is', res.status);
        console.trace();

        if (err) {
          throw new Error(err);
        }
      }
    });

    count++;

    if (count == maxRetries) {
      throw new Error('Max retries');
    }
  }

  let purchaseOrdersCountRes = 0;
  let purchaseOrdersCount = null;
  count = 0;

  while (purchaseOrdersCountRes != 200) {
    purchaseOrdersCount = await fetch('https://sell-api.goat.com/api/v1/purchase-orders-count', {
      method: 'GET',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
    }).then((res, err) => {
      purchaseOrdersCountRes = res.status;

      if (res.status == 200) {
        return res.json();
      } else if (res.status == 401) {
        throw new Error('Login expired');
      } else {
        console.log('Res is', res.status);
        console.trace();

        if (err) {
          throw new Error(err);
        }
      }
    });

    count++;

    if (count == maxRetries) {
      throw new Error('Max retries');
    }
  }

  let listingValuesRes = 0;
  let listingValues = null;
  count = 0;

  while (listingValuesRes != 200) {
    listingValues = await fetch('https://sell-api.goat.com/api/v1/listings-values', {
      method: 'GET',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
    }).then((res, err) => {
      listingValuesRes = res.status;

      if (res.status == 200) {
        return res.json();
      } else if (res.status == 401) {
        throw new Error('Login expired');
      } else {
        console.log('Res is', res.status);
        console.trace();

        if (err) {
          throw new Error(err);
        }
      }
    });

    count++;

    if (count == maxRetries) {
      throw new Error('Max retries');
    }
  }

  let purchaseOrdersRes = 0;
  let purchaseOrders = null;
  count = 0;

  while (purchaseOrdersRes != 200) {
    purchaseOrders = await fetch('https://sell-api.goat.com/api/v1/total-sales/purchase-orders', {
      method: 'GET',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
    }).then((res, err) => {
      purchaseOrdersRes = res.status;

      if (res.status == 200) {
        return res.json();
      } else if (res.status == 401) {
        throw new Error('Login expired');
      } else {
        console.log('Res is', res.status);
        console.trace();

        if (err) {
          throw new Error(err);
        }
      }
    });

    count++;

    if (count == maxRetries) {
      throw new Error('Max retries');
    }
  }

  let earningsRes = 0;
  let earnings = null;
  count = 0;

  while (earningsRes != 200) {
    earnings = await fetch('https://sell-api.goat.com/api/v1/users/earnings', {
      method: 'GET',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
    }).then((res, err) => {
      earningsRes = res.status;

      if (res.status == 200) {
        return res.json();
      } else if (res.status == 401) {
        throw new Error('Login expired');
      } else {
        console.log('Res is', res.status);
        console.trace();

        if (err) {
          throw new Error(err);
        }
      }
    });

    count++;

    if (count == maxRetries) {
      throw new Error('Max retries');
    }
  }

  const meEmbed = new Discord.MessageEmbed()
    .setColor('#7756fe')
    .setTitle(`${me.user.name} alias Account Information`)
    .addFields(
      { name: 'Username', value: me.user.username, inline: true },
      { name: `Email`, value: me.user.email, inline: true },
      { name: 'Seller Score', value: me.user.seller_score, inline: true },
      {
        name: 'Total Number of Completed Orders',
        value: purchaseOrdersCount.canceled_or_completed_count
          ? purchaseOrdersCount.canceled_or_completed_count.toLocaleString('en')
          : 0,
        inline: true,
      },
      {
        name: 'Completed',
        value: purchaseOrdersCount.completed ? purchaseOrdersCount.completed.toLocaleString('en') : 0,
        inline: true,
      },
      {
        name: 'Canceled',
        value: purchaseOrdersCount.canceled ? purchaseOrdersCount.canceled.toLocaleString('en') : 0,
        inline: true,
      },
      {
        name: 'Current Open Orders',
        value: purchaseOrdersCount.open_count ? purchaseOrdersCount.open_count.toLocaleString('en') : 0,
        inline: true,
      },
      {
        name: 'Orders to Ship Out',
        value: purchaseOrdersCount.need_to_ship_count ? purchaseOrdersCount.need_to_ship_count.toLocaleString('en') : 0,
        inline: true,
      },
      { name: '\u200b', value: '\u200b', inline: true },
      {
        name: 'Current Listings Value',
        value: listingValues.active.cents ? '$' + (listingValues.active.cents / 100).toLocaleString('en') : '$0',
        inline: true,
      },
      {
        name: 'Total Sales Value',
        value: '$' + (purchaseOrders.total_sales_cents / 100).toLocaleString('en'),
        inline: true,
      },
      { name: '\u200b', value: '\u200b', inline: true },
      {
        name: 'Current Available Earnings',
        value: earnings.amount_cents ? '$' + (earnings.amount_cents / 100).toLocaleString('en') : '$0',
        inline: true,
      },
      { name: '\u200b', value: '\u200b', inline: true },
      { name: '\u200b', value: '\u200b', inline: true }
    );

  return meEmbed;
}

async function consign(client, query) {
  let resStatus = 0;
  let res = null;
  let count = 0;

  while (resStatus != 200) {
    res = await fetch('https://2fwotdvm2o-dsn.algolia.net/1/indexes/product_variants_v2/query', {
      method: 'POST',
      headers: client.config.goatHeader,
      body: `{"params":"query=${encodeURIComponent(query)}"}`,
    })
      .then((res, err) => {
        resStatus = res.status;

        if (res.status == 200) {
          return res.json();
        } else {
          console.log('Res is', res.status);
          console.trace();

          if (err) {
            throw new Error(err);
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

    count++;

    if (count == maxRetries) {
      throw new Error('Max retries');
    }
  }

  let dataRes = 0;
  let data = null;
  count = 0;

  while (dataRes != 200) {
    data = await fetch(`https://www.goat.com/api/v1/product_variants/buy_bar_data?productTemplateId=${res.slug}`, {
      method: 'GET',
      headers: client.config.goatHeader,
    }).then((res, err) => {
      dataRes = res.status;

      if (res.status == 200) {
        return res.json();
      } else {
        console.log('Res is', res.status);
        console.trace();

        if (err) {
          throw new Error(err);
        }
      }
    });

    count++;

    if (count == maxRetries) {
      throw new Error('Max retries');
    }
  }

  let category = res.product_category ? res.product_category : 'N/A';
  let name = res.name;
  let productURL = 'https://www.goat.com/sneakers/' + res.slug;
  let description = '';
  if (res.story_html != null) {
    description = res.story_html;
    description = description.replace('<p>', '');
    description = description.replace('</p>', '');
  }
  let image = res.main_glow_picture_url ? res.main_glow_picture_url : null;
  let colorway = res.details ? res.details : 'N/A';
  let retail = res.retail_price_cents ? '$' + res.retail_price_cents / 100 : 'N/A';
  let SKU = res.sku ? res.sku : 'N/A';
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

  let consignString = '';
  let lowestListing = '';
  let potentialProfit = '';

  for (obj of data) {
    if (
      obj.boxCondition == 'good_condition' &&
      obj.instantShipLowestPriceCents.amount &&
      obj.shoeCondition == 'new_no_defects'
    ) {
      consignString += `${obj.sizeOption.presentation} - $${obj.instantShipLowestPriceCents.amount / 100}\n`;

      if (obj.lowestPriceCents.amount) {
        lowestListing += `${obj.sizeOption.presentation} - $${obj.lowestPriceCents.amount / 100}\n`;
      } else {
        lowestListing += `${obj.sizeOption.presentation} - N/A\n`;
      }

      if (obj.instantShipLowestPriceCents.amount && obj.lowestPriceCents.amount) {
        let consignNum = Money.fromDecimal(parseInt(obj.instantShipLowestPriceCents.amount / 100), 'USD');
        let lowestNum = Money.fromDecimal(parseInt(obj.lowestPriceCents.amount / 100), 'USD');

        let consignNum1 = consignNum.multiply(0.095, Math.ceil);
        consignNum1 = consignNum1.add(new Money(500, Money.USD));
        let consignNum2 = consignNum.subtract(consignNum1, Math.ceil);
        consignNum2 = consignNum2.multiply(0.029, Math.ceil);
        consignNum1 = consignNum1.add(consignNum2, Math.ceil);
        let consignNumRevenue = consignNum.subtract(consignNum1, Math.ceil);

        if (consignNumRevenue > lowestNum) {
          potentialProfit += `${obj.sizeOption.presentation} - $${consignNumRevenue.subtract(lowestNum, Math.ceil)}\n`;
        } else {
          potentialProfit += `${obj.sizeOption.presentation} - N/A\n`;
        }
      }
    }
  }

  const embed = new Discord.MessageEmbed()
    .setColor('#7756fe')
    .setTitle(name)
    .setURL(productURL)
    .setThumbnail(image)
    .setDescription(description)
    .addFields(
      { name: 'SKU', value: SKU, inline: true },
      { name: 'Colorway', value: colorway, inline: true },
      { name: 'Price', value: retail, inline: true },
      { name: 'Release Date', value: parsedDate, inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
      { name: 'Consignment Prices', value: '```' + consignString + '```', inline: true },
      {
        name: 'Lowest Asks',
        value: '```' + lowestListing + '```',
        inline: true,
      },
      { name: 'Potential Profit', value: '```' + potentialProfit + '```', inline: true }
    );

  return embed;
}

async function earnings(user) {
  let newMoney = Money.fromDecimal(parseFloat(user.cashoutAmount / 100), 'USD');
  let crntEarnings = '$' + newMoney;
  let earningsString = 'Current Available Earnings: ' + crntEarnings;

  return [earningsString, user.cashoutAmount];
}

async function cashOut(client, loginToken, user, message) {
  let sendOtp = async function () {
    let otpRes = 0;
    let count = 0;

    while (otpRes != 200) {
      otpRes = await fetch('https://sell-api.goat.com/api/v1/unstable/users/send-otp', {
        method: 'POST',
        headers: {
          'user-agent': client.config.aliasHeader,
          authorization: `Bearer ${loginToken}`,
        },
        body: `{}`,
      }).then((res, err) => {
        if (res.status == 401) {
          throw new Error('Login expired');
        } else if (res.status == 404) {
          throw new Error('Not exist');
        } else if (res.status != 200) {
          console.log('Res is', res.status);
          console.trace();

          if (err) {
            throw new Error(err);
          }
        }

        return res.status;
      });

      count++;

      if (count == maxRetries) {
        throw new Error('Max retries');
      }
    }
  };

  let verifyOtp = async function (num) {
    let otpRes = await fetch('https://sell-api.goat.com/api/v1/unstable/users/verify-otp', {
      method: 'POST',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
      body: `{"oneTimePassword":"${num}"}`,
    }).then((res, err) => {
      if (res.status == 401) {
        throw new Error('Login expired');
      } else if (res.status == 404) {
        throw new Error('Not exist');
      } else if (res.status != 200 && res.status != 400) {
        console.log('Res is', res.status);
        console.trace();

        if (err) {
          throw new Error(err);
        }
      }

      return res.status;
    });

    if (otpRes == 200) {
      return response.SUCCESS;
    } else if (res.status == 400) {
      return response.ERROR;
    }
  };

  let [earningsString, crntAmount] = await earnings(user);

  if (crntAmount == 0) {
    return [response.NO_CHANGE, null, null];
  }

  let phoneRes = 0;
  let phone = null;
  let count = 0;

  while (phoneRes != 200) {
    phone = await fetch('https://sell-api.goat.com/api/v1/unstable/users/me', {
      method: 'POST',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
      body: '{}',
    }).then((res, err) => {
      phoneRes = res.status;

      if (res.status == 200) {
        return res.json();
      } else if (res.status == 401) {
        throw new Error('Login expired');
      } else {
        console.log('Res is', res.status);
        console.trace();

        if (err) {
          throw new Error(err);
        }
      }
    });

    count++;

    if (count == maxRetries) {
      throw new Error('Max retries');
    }
  }

  if (!phone.user.phone_number || phone.user.phone_number.length == 0) {
    throw new Error('Missing phone number');
  }

  await sendOtp();

  let phoneNum = phone.user.phone_number.substring(phone.user.phone_number.length - 4);

  await message.channel.send('```' + `A security code has been sent to the phone number ending in ${phoneNum}` + '```');
  await message.channel.send('```' + `Enter the security code or 's' to send again` + '```');

  count = 0;
  let fee = null;
  let feeRes = 0;

  while (feeRes != 200) {
    fee = await fetch(`https://sell-api.goat.com/api/v1/users/cashout-breakdown`, {
      method: 'POST',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
      body: `{"cashoutAmountCents":"${crntAmount}"}`,
    }).then((res, err) => {
      feeRes = res.status;

      if (res.status == 200) {
        return res.json();
      } else if (res.status == 401) {
        throw new Error('Login expired');
      } else {
        console.log('Res is', res.status);
        console.trace();

        if (err) {
          throw new Error(err);
        }
      }
    });

    count++;

    if (count == maxRetries) {
      throw new Error('Max retries');
    }
  }

  earningsString += `\nAmount after Cash Out Fee (2.9%): $${Money.fromDecimal(
    parseFloat(fee.calculated_cashout_cents / 100),
    'USD'
  )}`;

  let stopped = false;
  let exit = false;
  let input = '';

  const collector1 = message.channel.createMessageCollector((msg) => msg.author.id == message.author.id, {
    time: 30000,
  });

  for await (const message of collector1) {
    input = message.content.toLowerCase();

    if (input == 'n') {
      collector1.stop();
      stopped = true;
      exit = true;
      console.log('Canceled\n');
    } else if (input == 's') {
      await sendOtp();
      await message.channel.send(
        '```' + `Another security code has been sent to the phone number ending in ${phoneNum}` + '```'
      );
    } else if (!isNaN(input)) {
      if (input.length == 6) {
        let verifyEnum = await verifyOtp(input);

        if (verifyEnum == response.SUCCESS) {
          collector1.stop();
          stopped = true;
        } else {
          message.channel.send('```' + 'Invalid security code\nEnter again' + '```');
        }
      } else {
        message.channel.send('```' + 'Security code should have 6 digits\nEnter again' + '```');
      }
    } else {
      message.channel.send('```' + `Invalid format\nEnter 'all' or amount to cash out` + '```');
    }
  }

  if (exit) {
    return [response.EXIT, null, null];
  } else if (!stopped) {
    return [response.TIMEOUT, null, null];
  }

  let all = false;
  stopped = false;
  exit = false;
  input = '';

  await message.channel.send('```' + earningsString + '```');
  await message.channel.send('```' + `Enter 'all' or amount to cash out` + '```');

  const collector2 = message.channel.createMessageCollector((msg) => msg.author.id == message.author.id, {
    time: 30000,
  });

  for await (const message of collector2) {
    input = message.content.toLowerCase();

    if (input == 'n') {
      collector2.stop();
      stopped = true;
      exit = true;
      console.log('Canceled\n');
    } else if (!isNaN(input)) {
      if (input > crntAmount / 100) {
        message.channel.send(
          '```' + `Entered input is greater than available earnings\nEnter 'all' or a lesser value` + '```'
        );
      } else {
        collector2.stop();
        stopped = true;
      }
    } else if (input == 'all') {
      collector2.stop();
      all = true;
      stopped = true;
    } else {
      message.channel.send('```' + `Invalid format\nEnter 'all' or amount to cash out` + '```');
    }
  }

  if (exit) {
    return [response.EXIT, null, null];
  } else if (!stopped) {
    return [response.TIMEOUT, null, null];
  }

  let msg = await message.channel.send('```' + 'Cashing out ...' + '```');

  let cashOutRes = 0;
  let cashOut = null;
  count = 0;

  if (all) {
    input = crntAmount;
  } else {
    input *= 100;
  }

  while (cashOutRes != 200) {
    cashOut = await fetch('https://sell-api.goat.com/api/v1/users/cashout', {
      method: 'POST',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
      body: `{"cashOutCents":"${input}"}`,
    }).then((res, err) => {
      cashOutRes = res.status;

      if (res.status == 200) {
        return res.json();
      } else if (res.status == 401) {
        throw new Error('Login expired');
      } else {
        console.log('Res is', res.status);
        console.trace();

        if (err) {
          throw new Error(err);
        }
      }
    });

    count++;

    if (count == maxRetries) {
      throw new Error('Max retries');
    }
  }

  let newAmount = 0;

  if (cashOut.remaining_balance_cents) {
    newAmount = cashOut.remaining_balance_cents;
  }

  await Users.updateOne({ _id: user._id }, { $set: { cashoutAmount: parseInt(newAmount) } }, async (err) => {
    if (!err) {
      console.log('Cash out amount updated successfully');
    }
  }).catch((err) => {
    throw new Error(err);
  });

  return [response.SUCCESS, newAmount, msg];
}

function help() {
  const helpEmbed = new Discord.MessageEmbed()
    .setColor('#7756fe')
    .setTitle('alias Help')
    .setDescription(
      'All the alias account commands\n\nAn alias account is required to use the commands. To gain access to an alias account, you must have a GOAT account with a seller score of 150 or greater. Each command will only work for the bound alias account. It is not possible to control the listings for another alias account.\n\n[Click here for more info](https://apps.apple.com/us/app/alias-sell-sneakers-apparel/id1467090341)\n\nIf no alias account is bound to the Discord account, DM \n``!login <email> <password>`` to the daijoubu bot to login.'
    )
    .addFields(
      { name: `!alias <search parameters>`, value: `Returns information of a specified product` },
      { name: '!alias consign <search parameters>', value: 'Checks the consignment prices of a specified product' },
      { name: `!alias list`, value: `Lists an item` },
      { name: '!alias listings', value: 'Returns all current listings' },
      { name: '!alias check', value: 'Checks if all listings match their current lowest ask' },
      { name: '!alias update', value: 'Updates specified listings to their current lowest ask' },
      { name: '!alias edit', value: 'Edits the asking price for specified listings' },
      { name: '!alias delete', value: 'Deletes specified listings' },
      { name: '!alias orders', value: 'Returns all current orders' },
      { name: '!alias confirm', value: 'Confirms specified orders' },
      { name: '!alias earnings', value: 'Checks available earnings' },
      { name: '!alias cashout', value: 'Cash out available earnings' },
      { name: '!alias me', value: 'Information about your account' },
      { name: '!alias settings', value: 'Current settings for your account' }
    );

  return helpEmbed;
}
