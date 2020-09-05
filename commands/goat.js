const fetch = require('node-fetch');
const Discord = require('discord.js');
const Login = require('../models/login');
const encryption = require('../scripts/encryption');

let checkRes = 0;
let updateRes = 0;
let listingRes = 0;

exports.run = async (client, message, args) => {
  try {
    const query = message.content.slice(6);

    if (query.length == 0) {
      throw new Error('Empty command');
    }

    let toReturn = '';
    let split = query.split(' ');

    switch (split[0]) {
      case 'check':
        if (!split[1]) {
          toReturn = await noCommand(client);
        } else {
          throw new Error('Too many parameters');
        }

        if (checkRes == 300) {
          toReturn = '```All Listings Match Their Lowest Asks```';
        } else if (checkRes == 200) {
          toReturn = '```' + toReturn + '```';
        } else if (checkRes == 404) {
          toReturn = '```No Items Are Listed on Account```';
        }
        break;
      case 'update':
        let all = false;

        if (!split[1]) {
          throw new Error('Not enough parameters');
        } else if (split[1] == 'all') {
          all = true;
          split.shift();
          split.shift();
        } else {
          split.shift();
        }

        await update(split, all);

        if (updateRes == 200 && all == false) {
          toReturn = '```Listing(s) Updated Successfully!```';
        } else if (updateRes == 200 && all == true) {
          toReturn = '```All Listing(s) Updated Successfully!```';
        } else if (updateRes == 300) {
          toReturn = '```All Listing(s) Already Match Their Lowest Asks```';
        }
        break;
      case 'listings':
        const checkQuery = split[1];

        if (checkQuery) {
          throw new Error('Too many parameters');
        }

        let listings = await getListings();

        toReturn = allListings(listings);

        if (listingRes == 200) {
          toReturn = '```' + toReturn + '```';
        } else if ((listingRes = 404)) {
          toReturn = '```No Items Are Listed on Account```';
        }
        break;
      default:
        toReturn = await goatSearch(client, query);
    }

    message.channel
      .send(toReturn)
      .then(console.log(`${message} completed`))
      .catch((err) => {
        console.log(err);
        throw new Error('Unable to send embed');
      });
  } catch (err) {
    console.log(err);

    if (err.message == 'No hits') {
      message.channel.send('```No products found matching search parameters```');
    } else if (err.message == 'Empty command') {
      message.channel.send('```Command is missing parameters```');
    } else if (err.message == 'Unauthorized') {
      message.channel.send('```Command not authorized for message author```');
    } else if (err.message == 'Not exist') {
      message.channel.send('```Update command has one or more non-existing listing ids please run !check again```');
    } else if (err.message == 'Error updating') {
      message.channel.send('```Error updating listing```');
    } else if (err.message == 'Too many parameters') {
      message.channel.send('```Command has too many parameters```');
    } else if (err.message == 'Not enough parameters') {
      message.channel.send('```Command does not have enough parameters```');
    } else if (err.message == 'Login expired') {
      message.channel.send('```Login expired```');
    } else {
      message.channel.send('```Unexpected Error```');
    }
  }
};

async function goatSearch(client, query) {
  let res = await fetch('https://2fwotdvm2o-dsn.algolia.net/1/indexes/product_variants_v2/query', {
    method: 'POST',
    headers: client.config.goatHeader,
    body: `{"params":"query=${encodeURIComponent(query)}"}`,
  })
    .then((res) => {
      return res.json();
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
      method: 'GET',
      headers: client.config.headers,
    }
  ).then((res) => {
    return res.json();
  });

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
    if (
      variant.lowest_price_cents == undefined &&
      variant.highest_offer_cents == undefined &&
      variant.last_sold_price_cents == undefined
    ) {
      continue;
    }

    let size = variant.size;

    if (variant.lowest_price_cents != undefined) {
      lowestPrice += `${size} - $${variant.lowest_price_cents / 100}\n`;
      averageLowestPrice += variant.lowest_price_cents / 100;
      lowest++;
    } else {
      lowestPrice += `${size} - N/A\n`;
    }

    if (variant.highest_offer_cents != undefined) {
      highestBid += `${size} - $${variant.highest_offer_cents / 100}\n`;
      averageHighestBid += variant.highest_offer_cents / 100;
      highest++;
    } else {
      highestBid += `${size} - N/A\n`;
    }

    if (variant.last_sold_price_cents != undefined) {
      lastSold += `${size} - $${variant.last_sold_price_cents / 100}\n`;
      averageLastSold += variant.last_sold_price_cents / 100;
      last++;
    } else {
      lastSold += `${size} - N/A\n`;
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

  const embed = new Discord.MessageEmbed()
    .setColor(16777214)
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
      { name: 'Lowest Asks', value: `Average: $${averageLowestPrice}` + '```' + lowestPrice + '```', inline: true },
      {
        name: 'Highest Bids',
        value: `Average: $${averageHighestBid}` + '```' + highestBid + '```',
        inline: true,
      },
      { name: 'Last Sold', value: `Average: $${averageLastSold}` + '```' + lastSold + '```', inline: true }
    );

  return embed;
}

async function noCommand() {
  let listings = await getListings();

  if (listings.listing.length == 0) {
    checkRes = 404;
  } else {
    let listingObj = [];

    for (let i = 0; i < listings.listing.length; i++) {
      listingObj = await checkListings(listings.listing[i], listingObj);
    }

    if (listingObj.length == 0) {
      checkRes = 300;
    } else {
      let newLowestAsksString = '';

      listingObj.forEach((obj, i) => {
        newLowestAsksString += `${i}. ${obj.product.name} - ${obj.size_option.name.toUpperCase()} ${
          obj.price_cents / 100
        } => ${obj.product.lowest_price_cents / 100}\n\tid: ${obj.id}\n`;
      });

      checkRes = 200;
      return newLowestAsksString;
    }
  }
}

async function update(ids, all) {
  let listingRes = await getListings();

  let listingObj = [];

  for (let i = 0; i < listingRes.listing.length; i++) {
    listingObj = await checkListings(listingRes.listing[i], listingObj);
  }

  if (all && listingObj.length == 0) {
    updateRes = 300;
    return;
  }

  if (all) {
    for (let j = 0; j < listingObj.length; j++) {
      if (listingObj[j].price_cents > listingObj[j].product.lowest_price_cents) {
        let res = await updateListing(listingObj[j]);

        if (res == 200) {
          updateRes = res;
          break;
        } else {
          throw new Error('Error Updating');
        }
      }
    }
  } else {
    for (let i = 0; i < ids.length; i++) {
      let exist = false;

      for (let j = 0; j < listingObj.length; j++) {
        if (listingObj[j].id == ids[i]) {
          exist = true;
          let res = await updateListing(listingObj[j]);

          if (res == 200) {
            updateRes = res;
            break;
          } else {
            throw new Error('Error Updating');
          }
        }
      }

      if (!exist && updateRes != 300) {
        throw new Error('Not exist');
      }
    }
  }
}

async function getListings() {
  let loginToken = await Login.find();

  let listingRes = await fetch('https://sell-api.goat.com/api/v1/listings?filter=1&includeMetadata=1&page=1', {
    headers: {
      'user-agent': 'alias/1.1.1 (iPhone; iOS 14.0; Scale/2.00)',
      authorization: `Bearer ${encryption.decrypt(loginToken[0].login)}`,
    },
  })
    .then((res) => {
      return res.json();
    })
    .catch((err) => {
      if (
        err.message ==
        'invalid json response body at https://sell-api.goat.com/api/v1/listings?filter=1&includeMetadata=1&page=1 reason: Unexpected end of JSON input'
      ) {
        throw new Error('Login expired');
      }
    });

  return listingRes;
}

async function checkListings(obj, listingObj) {
  if (
    obj.id != 'air-jordan-1-retro-high-og-bloodline-f7ce71bc-875b-4cd2-9ba7-571ebb758c92' &&
    obj.id != 'air-jordan-1-mid-gs-chicago-black-toe-8dd9b928-07ca-487c-960b-37fcec82cbe9'
  ) {
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

async function updateListing(obj) {
  let loginToken = await Login.find();

  obj.price_cents = obj.product.lowest_price_cents;

  let updateRes = await fetch(`https://sell-api.goat.com/api/v1/listings/${obj.id}`, {
    method: 'PUT',
    headers: {
      'user-agent': 'alias/1.1.1 (iPhone; iOS 14.0; Scale/2.00)',
      authorization: `Bearer ${encryption.decrypt(loginToken[0].login)}`,
    },
    body: `{"listing":${JSON.stringify(obj)}}`,
  })
    .then((res) => {
      return res.status;
    })
    .catch((err) => {
      if (
        err.message.includes('invalid json response body at') &&
        err.message.includes('Unexpected end of JSON input')
      ) {
        throw new Error('Login expired');
      }
    });

  return updateRes;
}

function allListings(listings) {
  let listingString = '';

  if (listings.listing.length != 0) {
    listings.listing.forEach((obj, i) => {
      listingString += `${i}. ${obj.product.name} - ${obj.size_option.name.toUpperCase()} ${
        obj.price_cents / 100
      }\n\tid: ${obj.id}\n`;
    });
  } else {
    listingRes = 404;
  }

  listingRes = 200;
  return listingString;
}
