const fetch = require('node-fetch');
const Discord = require('discord.js');
const Login = require('../models/login');
const encryption = require('../scripts/encryption');

const response = {
  SUCCESS: 'success',
  NO_ITEMS: 'no_items',
  NO_CHANGE: 'no_change',
};

exports.run = async (client, message, args) => {
  try {
    const query = message.content.slice(6);

    if (args.length == 0) {
      throw new Error('Empty command');
    }

    let toReturn = '';
    let returnedEnum = null;

    switch (args[0]) {
      case 'check':
        if (args.length < 2) {
          [toReturn, returnedEnum] = await noCommand(client);
        } else {
          throw new Error('Too many parameters');
        }

        if (returnedEnum == response.NO_CHANGE) {
          toReturn = '```All Listings Match Their Lowest Asks```';
        } else if (returnedEnum == response.NO_ITEMS) {
          toReturn = '```No Items Are Listed on Account```';
        } else {
          toReturn = '```' + toReturn + '```';
        }
        break;
      case 'update':
        let all = false;

        if (args.length < 2) {
          throw new Error('Too little parameters');
        } else if (args[1] == 'all') {
          all = true;
          args.shift();
          args.shift();
        } else {
          args.shift();
        }

        returnedEnum = await update(args, all);

        if (returnedEnum == response.SUCCESS && !all) {
          toReturn = '```Listing(s) Updated Successfully!```';
        } else if (returnedEnum == response.SUCCESS && all) {
          toReturn = '```All Listing(s) Updated Successfully!```';
        } else if (returnedEnum == response.NO_CHANGE) {
          toReturn = '```All Listing(s) Already Match Their Lowest Asks```';
        } else if (returnedEnum == response.NO_ITEMS) {
          toReturn = '```No Items Are Listed on Account```';
        }
        break;
      case 'listings':
        if (args.length > 1) {
          throw new Error('Too many parameters');
        }

        let listings = await getListings();

        [toReturn, returnedEnum] = allListings(listings);

        if (returnedEnum == response.SUCCESS) {
          toReturn = '```' + toReturn + '```';
        } else if (returnedEnum == response.NO_ITEMS) {
          toReturn = '```No Items Are Listed on Account```';
        }
        break;
      case 'delete':
        if (args.length < 2) {
          throw new Error('Too little parameters');
        } else {
          args.shift();
        }

        returnedEnum = await deleteSearch(args);

        if (returnedEnum == response.SUCCESS) {
          toReturn = '```Specifided Listing(s) Have Been Deleted```';
        }
        break;
      case 'edit':
        if (args.length != 4) {
          throw new Error('Incorrect format');
        } else {
          args.shift();
        }

        returnedEnum = await editListing(args);

        if (returnedEnum == response.SUCCESS) {
          toReturn = '```Item edited successfully```';
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
        throw new Error(err);
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
      message.channel.send('```command has one or more non-existing listing ids```');
    } else if (err.message == 'Error updating') {
      message.channel.send('```Error updating listing(s)```');
    } else if (err.message == 'Too many parameters') {
      message.channel.send('```Command has too many parameters```');
    } else if (err.message == 'Too little parameters') {
      message.channel.send('```Command has too little parameters```');
    } else if (err.message == 'Incorrect format') {
      message.channel.send('```Incorrect format```');
    } else if (err.message == 'Error deleting') {
      message.channel.send('```Error deleting listing(s)```');
    } else if (err.message == 'Login expired') {
      message.channel.send('```Login expired```');
    } else if (err.message == 'Error editing') {
      message.channel.send('```Error editing listing```');
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
      thenError(res);

      return res.json();
    })
    .then((json) => {
      if (json.hits.length != 0) {
        return json.hits[0];
      } else {
        throw new Error('No hits');
      }
    });
  // .catch((err) => {
  //   catchError(err);

  //   if (err.message == 'No hits') {
  //     throw new Error('No hits');
  //   } else {
  //     throw new Error(err);
  //   }
  // });

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
    thenError(res);

    return res.json();
  });
  // .catch((err) => {
  //   catchError(err);

  //   throw new Error(err);
  // });

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
    return ['', response.NO_ITEMS];
  } else {
    let listingObj = [];

    for (let i = 0; i < listings.listing.length; i++) {
      listingObj = await checkListings(listings.listing[i], listingObj);
    }

    if (listingObj.length == 0) {
      return ['', response.NO_CHANGE];
    } else {
      let newLowestAsksString = '';

      listingObj.forEach((obj, i) => {
        newLowestAsksString += `${i}. ${obj.product.name} - ${obj.size_option.name.toUpperCase()} ${
          obj.price_cents / 100
        } => ${obj.product.lowest_price_cents / 100}\n\tid: ${obj.id}\n`;
      });

      tempRes = 200;
      return [newLowestAsksString, response.SUCCESS];
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
    return response.NO_CHANGE;
  } else if (!all && listingOobj.length == 0) {
    return response.NO_ITEMS;
  }

  let updateRes = 0;

  if (all) {
    for (let j = 0; j < listingObj.length; j++) {
      if (listingObj[j].price_cents > listingObj[j].product.lowest_price_cents) {
        updateRes = await updateListing(listingObj[j], loginToken);
      }
    }
  } else {
    for (let i = 0; i < ids.length; i++) {
      updateRes = await updateListing(ids[i], loginToken);
    }
  }

  if (updateRes == 200) {
    return response.SUCCESS;
  }
}

async function getListings() {
  let loginToken = await Login.find();

  let listings = await fetch('https://sell-api.goat.com/api/v1/listings?filter=1&includeMetadata=1&page=1', {
    headers: {
      'user-agent': 'alias/1.1.1 (iPhone; iOS 14.0; Scale/2.00)',
      authorization: `Bearer ${encryption.decrypt(loginToken[0].login)}`,
    },
  }).then((res) => {
    thenError(res);

    return res.json();
  });
  // .catch((err) => {
  //   catchError(err);
  // });

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
  }).then((res) => {
    thenError(res);

    return res.status;
  });
  // .catch((err) => {
  //   catchError(err);
  // });

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
    return ['', response.NO_ITEMS];
  }

  return [listingString, response.SUCCESS];
}

async function deleteSearch(args) {
  let loginToken = await Login.find();
  let deleteRes = 0;

  for (let j = 0; j < args.length; j++) {
    deleteRes = await deletion(args[j], loginToken);
  }

  if (deleteRes == 200) {
    return response.SUCCESS;
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
    thenError(res);

    return res.status;
  });
  // .catch((err) => {
  //   catchError(err);
  // });

  if (deactivateRes == 200) {
    cancelRes = await fetch(` https://sell-api.goat.com/api/v1/listings/${listingId}/cancel`, {
      method: 'PUT',
      headers: {
        'user-agent': 'alias/1.1.1 (iPhone; iOS 14.0; Scale/2.00)',
        authorization: `Bearer ${encryption.decrypt(loginToken[0].login)}`,
      },
      body: `{"id":"${listingId}"}`,
    }).then((res) => {
      thenError(res);

      return res.status;
    });
    // .catch((err) => {
    //   catchError(err);
    // });
  }

  if (deactivateRes != 200 && cancelRes != 200) {
    throw new Error('Error deleting');
  } else if (deactivateRes == 200 && cancelRes == 200) {
    return 200;
  }
}

async function editListing(args) {
  let loginToken = await Login.find();
  let id = args[0];
  let price = args[1];

  let getJSON = await fetch(`https://sell-api.goat.com/api/v1/listings/${id}`, {
    method: 'GET',
    headers: {
      'user-agent': 'alias/1.1.1 (iPhone; iOS 14.0; Scale/2.00)',
      authorization: `Bearer ${token}`,
    },
  }).then((res) => {
    thenError(res);

    return res.json();
  });
  // .catch((err) => {
  //   catchError(err);
  // });

  getJSON.listing.price_cents = (parseInt(price) * 100).toString();

  let editRes = await fetch(`https://sell-api.goat.com/api/v1/listings/${id}`, {
    method: 'PUT',
    headers: {
      'user-agent': 'alias/1.1.1 (iPhone; iOS 14.0; Scale/2.00)',
      authorization: `Bearer ${encryption.decrypt(loginToken[0].login)}`,
    },
    body: `${JSON.stringify(getJSON)}`,
  }).then((res) => {
    thenError(res);

    return res.status;
  });
  // .catch((err) => {
  //   catchError(err);
  // });

  if (editRes != 200) {
    throw new Error('Error editing');
  }

  return response.SUCCESS;
}

function thenError(res) {
  if (res.status == 404) {
    throw new Error('Not exist');
  } else if (res.status == 401) {
    throw new Error('Login expired');
  } else {
    console.log('Res status is', res.status);
  }
}

function catchError(err) {
  if (err.message == 'Not exist') {
    throw new Error('Not exist');
  } else if (err.message == 'Login expired') {
    throw new Error('Login expired');
  } else {
    throw new Error(err.message);
  }
}
