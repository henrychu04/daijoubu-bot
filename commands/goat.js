const fetch = require('node-fetch');
const Discord = require('discord.js');
const Login = require('../models/login');
const encryption = require('../scripts/encryption');

let tempRes = 0;

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
        if (split.length < 2) {
          toReturn = await noCommand(client);
        } else {
          throw new Error('Too many parameters');
        }

        if (tempRes == 300) {
          toReturn = '```All Listings Match Their Lowest Asks```';
        } else if (tempRes == 200) {
          toReturn = '```' + toReturn + '```';
        } else if (tempRes == 404) {
          toReturn = '```No Items Are Listed on Account```';
        }
        break;
      case 'update':
        let all = false;

        if (split.length < 2) {
          throw new Error('Too little parameters');
        } else if (split[1] == 'all') {
          all = true;
          split.shift();
          split.shift();
        } else {
          split.shift();
        }

        await update(split, all);

        if (tempRes == 200 && all == false) {
          toReturn = '```Listing(s) Updated Successfully!```';
        } else if (tempRes == 200 && all == true) {
          toReturn = '```All Listing(s) Updated Successfully!```';
        } else if (tempRes == 300) {
          toReturn = '```All Listing(s) Already Match Their Lowest Asks```';
        }
        break;
      case 'listings':
        if (split.length > 1) {
          throw new Error('Too many parameters');
        }

        let listings = await getListings();

        toReturn = allListings(listings);

        if (tempRes == 200) {
          toReturn = '```' + toReturn + '```';
        } else if ((tempRes = 404)) {
          toReturn = '```No Items Are Listed on Account```';
        }
        break;
      case 'delete':
        if (split.length < 2) {
          throw new Error('Too little parameters');
        } else {
          split.shift();
        }

        await deleteSearch(split);

        if (tempRes == 200) {
          toReturn = '```Specifided Listing(s) Have Been Deleted```';
        }

        break;
      default:
        toReturn = await goatSearch(client, query);
        break;
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
      message.channel.send('```Update command has one or more non-existing listing ids```');
    } else if (err.message == 'Error updating') {
      message.channel.send('```Error updating listing(s)```');
    } else if (err.message == 'Too many parameters') {
      message.channel.send('```Command has too many parameters```');
    } else if (err.message == 'Too little parameters') {
      message.channel.send('```Command has too little parameters```');
    } else if (err.message == 'Error deleting') {
      message.channel.send('```Error deleting listing(s)```');
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
    tempRes = 404;
  } else {
    let listingObj = [];

    for (let i = 0; i < listings.listing.length; i++) {
      listingObj = await checkListings(listings.listing[i], listingObj);
    }

    if (listingObj.length == 0) {
      tempRes = 300;
    } else {
      let newLowestAsksString = '';

      listingObj.forEach((obj, i) => {
        newLowestAsksString += `${i}. ${obj.product.name} - ${obj.size_option.name.toUpperCase()} ${
          obj.price_cents / 100
        } => ${obj.product.lowest_price_cents / 100}\n\tid: ${obj.id}\n`;
      });

      tempRes = 200;
      return newLowestAsksString;
    }
  }
}

async function update(ids, all) {
  let loginToken = await Login.find();
  let listings = await getListings();

  let listingObj = [];

  for (let i = 0; i < listings.listing.length; i++) {
    listingObj = await checkListings(listings.listing[i], listingObj);
  }

  if (all && listingObj.length == 0) {
    tempRes = 300;
    return;
  }

  let updateRes = 0;

  if (all) {
    for (let j = 0; j < listingObj.length; j++) {
      if (listingObj[j].price_cents > listingObj[j].product.lowest_price_cents) {
        updateRes = await updateListing(listingObj[j], loginToken);
      }
    }
  } else {
    let exist = false;
    for (let i = 0; i < ids.length; i++) {
      for (let j = 0; j < listingObj.length; j++) {
        if (listingObj[j].id == ids[i]) {
          exist = true;
          updateRes = await updateListing(listingObj[j], loginToken);
        }
      }

      if (!exist) {
        throw new Error('Not exist');
      }
    }
  }

  if (updateRes == 200) {
    tempRes = 200;
  }
}

async function getListings() {
  let loginToken = await Login.find();

  let listings = await fetch('https://sell-api.goat.com/api/v1/listings?filter=1&includeMetadata=1&page=1', {
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

async function updateListing(obj, loginToken) {
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

  if (updateRes != 200) {
    throw new Error('Error Updating');
  }

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
    tempRes = 404;
  }

  tempRes = 200;
  return listingString;
}

async function deleteSearch(split) {
  let listings = await getListings();
  let loginToken = await Login.find();
  let exist = false;
  let deleteRes = 0;

  for (let i = 0; i < listings.listing.length; i++) {
    for (let j = 0; j < split.length; j++) {
      if (listings.listing[i].id == split[j]) {
        exist = true;
        deleteRes = await deletion(split[j], loginToken);
      }
    }

    if (!exist) {
      throw new Error('Not exist');
    }
  }

  if (deleteRes == 200) {
    tempRes = 200;
  }
}

async function deletion(listingId, loginToken) {
  let deactivateRes = 0;
  let cancelRes = 0;

  deactivateRes = await fetch(`https://sell-api.goat.com/api/v1/listings/${listingId}/deactivate`, {
    method: 'PUT',
    headers: {
      'user-agent': 'alias/1.1.1 (iPhone; iOS 14.0; Scale/2.00)',
      authorization: `Bearer ${encryption.decrypt(loginToken[0].login)}`,
    },
    body: `{"id":"${listingId}"}`,
  }).then((res) => {
    return res.status;
  });

  if (deactivateRes == 200) {
    cancelRes = await fetch(` https://sell-api.goat.com/api/v1/listings/${listingId}/cancel`, {
      method: 'PUT',
      headers: {
        'user-agent': 'alias/1.1.1 (iPhone; iOS 14.0; Scale/2.00)',
        authorization: `Bearer ${encryption.decrypt(loginToken[0].login)}`,
      },
      body: `{"id":"${listingId}"}`,
    })
      .then((res) => {
        return res.status;
      })
      .catch((err) => {
        console.log(err);
      });
  }

  if (deactivateRes != 200 && cancelRes != 200) {
    throw new Error('Error deleting');
  } else if (deactivateRes == 200 && cancelRes == 200) {
    return 200;
  }
}
