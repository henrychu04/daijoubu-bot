const fetch = require('node-fetch');
const Discord = require('discord.js');
const getProductAvailability = require('../requests/getProductAvailability.js');

const Listings = require('../../models/listings.js');

const response = {
  SUCCESS: 'success',
  NO_ITEMS: 'no_items',
  NO_CHANGE: 'no_change',
  EXIT: 'exit',
  TIMEOUT: 'timeout',
  ERROR: 'error',
};

function checkListParams(params) {
  let bracketCount = 0;
  let sizingArray = [];

  for (let i = 0; i < params.length; i++) {
    if (params[i].includes('[') && params[i].includes(']')) {
      let crnt = params[i];
      bracketCount++;

      if (crnt[0] != '[' || crnt[crnt.length - 1] != ']') {
        return false;
      }

      if (!crnt.includes(',')) {
        return false;
      }

      crnt = crnt.substring(1, crnt.length - 1);
      let crntArray = crnt.split(',');

      if (crntArray.length < 1 || crntArray.length > 4) {
        return false;
      }

      if (isNaN(crntArray[0])) {
        return false;
      }

      if (isNaN(crntArray[1]) && crntArray[1] != 'lowest') {
        return false;
      }

      if (crntArray[2]) {
        if (isNaN(crntArray[2])) {
          if (crntArray[2].toLowerCase() != 'live' && crntArray[2].toLowerCase() != 'manual') {
            return false;
          }
        }
      }

      let rate = false;

      if (crntArray[2] && (crntArray[2].toLowerCase() == 'live' || crntArray[2].toLowerCase() == 'manual')) {
        rate = true;
      }

      if (crntArray[3] && rate && (crntArray[3].toLowerCase() == 'live' || crntArray[3].toLowerCase() == 'manual')) {
        return false;
      }

      if (crntArray[3] && !rate && crntArray[3].toLowerCase() != 'live' && crntArray[3].toLowerCase() != 'manual') {
        return false;
      }

      sizingArray.push(params[i]);
    }
  }

  if (bracketCount == 0) {
    return false;
  }

  return true;
}

async function doList(client, user, loginToken, message, searchProduct, sizingArray) {
  let returnString = 'Successfully Listed:\n\t' + searchProduct.title + '\n';
  let returnedEnum = null;
  let url = searchProduct.url.split('/');
  let slug = url[url.length - 1];

  let { pageData, product } = await getProduct(client, slug, loginToken);

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
      let cancel = false;

      await message.channel.send(
        '```' +
          `Current lowest ask for size ${size}: $${
            lowest / 100
          }\nYou entered $${price}, a lower asking price than the current lowest asking price of $${
            lowest / 100
          }\n\nEnter 'y to confirm, 's' to skip size ${size}, 'n' to cancel` +
          '```'
      );

      const collector = new Discord.MessageCollector(message.channel, (m) => m.author.id === message.author.id, {
        time: 30000,
      });

      for await (const msg of collector) {
        let input = msg.content.toLowerCase();

        if (input == 'y' || input == 's' || input == 'n') {
          if (input == 's') {
            collector.stop();
            stopped = true;
            await msg.channel.send('```' + `Skipped size ${size}` + '```');
            skip = true;
          } else if (input == 'y') {
            collector.stop();
            stopped = true;
            returnString = await whileRequest(listing, amount, returnString);
            returnedEnum = response.SUCCESS;
          } else {
            collector.stop();
            stopped = true;
            cancel = true;
          }
        } else {
          await msg.channel.send('```' + `Enter either 'y', 'n', or 'x'` + '```');
        }
      }

      if (!stopped) {
        returnedEnum = response.TIMEOUT;
      }

      if (cancel) {
        returnedEnum = response.EXIT;
        break;
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

    return { returnedEnum, returnString, detectedLower };
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

    if (count == client.config.maxRetries) {
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

    if (count == client.config.maxRetries) {
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

  await Listings.updateOne({ d_id: user.d_id }, { $push: { aliasListings: obj } }).catch((err) => console.log(err));
}

async function getProduct(client, slug, loginToken) {
  let pageData = await getProductAvailability(client, slug);

  let productRes = 0;
  let product = null;
  let count = 0;

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

    if (count == client.config.maxRetries) {
      throw new Error('Max retries');
    }
  }

  return { pageData, product };
}

module.exports = { checkListParams, doList, listReq };
