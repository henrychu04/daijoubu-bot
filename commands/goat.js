const fetch = require('node-fetch');
const Discord = require('discord.js');
const Login = require('../models/login');
const encryption = require('../scripts/encryption');
const config = require('../config.json');

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

        switch (returnedEnum) {
          case response.SUCCESS:
            toReturn = '```' + toReturn + '```';
            break;
          case response.NO_CHANGE:
            toReturn = '```All Listings Match Their Lowest Asks```';
            break;
          case response.NO_ITEMS:
            toReturn = '```No Items Are Listed on Account```';
            break;
          default:
            break;
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

        switch (returnedEnum) {
          case response.SUCCESS:
            if (all) {
              toReturn = '```All Listing(s) Updated Successfully!```';
            } else {
              toReturn = '```Listing(s) Updated Successfully!```';
            }
            break;
          case response.NO_CHANGE:
            toReturn = '```All Listing(s) Already Match Their Lowest Asks```';
            break;
          case response.NO_ITEMS:
            toReturn = '```No Items Are Listed on Account```';
            break;
          default:
            break;
        }
        break;
      case 'listings':
        if (args.length > 1) {
          throw new Error('Too many parameters');
        }

        let listings = await getListings();

        [toReturn, returnedEnum] = allListings(listings);

        switch (returnedEnum) {
          case response.SUCCESS:
            toReturn = '```' + toReturn + '```';
            break;
          case response.NO_ITEMS:
            toReturn = '```No Items Are Listed on Account```';
            break;
          default:
            break;
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
      .then(console.log(`${message} completed\n`))
      .catch((err) => {
        throw new Error(err);
      });
  } catch (err) {
    console.log(err);

    switch (err.message) {
      case 'No hits':
        message.channel.send('```No products found matching search parameters```');
        break;
      case 'Empty command':
        message.channel.send('```Command is missing parameters```');
        break;
      case 'Unauthorized':
        message.channel.send('```Command not authorized for message author```');
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
      default:
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
        newLowestAsksString += `${i}. ${obj.product.name} - ${obj.size_option.name.toUpperCase()} ${obj.price_cents / 100
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
  } else if (!all && listingObj.length == 0) {
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
      'user-agent': config.aliasHeader,
      authorization: `Bearer ${encryption.decrypt(loginToken[0].login)}`,
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

async function updateListing(obj, loginToken) {
  obj.price_cents = obj.product.lowest_price_cents;

  let updateRes = await fetch(`https://sell-api.goat.com/api/v1/listings/${obj.id}`, {
    method: 'PUT',
    headers: {
      'user-agent': config.aliasHeader,
      authorization: `Bearer ${encryption.decrypt(loginToken[0].login)}`,
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

function allListings(listings) {
  let listingString = '';

  if (listings.listing.length != 0) {
    listings.listing.forEach((obj, i) => {
      listingString += `${i}. ${obj.product.name} - ${obj.size_option.name.toUpperCase()} ${obj.price_cents / 100
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
      'user-agent': config.aliasHeader,
      authorization: `Bearer ${encryption.decrypt(loginToken[0].login)}`,
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
        'user-agent': config.aliasHeader,
        authorization: `Bearer ${encryption.decrypt(loginToken[0].login)}`,
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

async function editListing(args) {
  let loginToken = await Login.find();
  let id = args[0];
  let price = args[1];

  let getJSON = await fetch(`https://sell-api.goat.com/api/v1/listings/${id}`, {
    headers: {
      'user-agent': config.aliasHeader,
      authorization: `Bearer ${token}`,
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

  getJSON.listing.price_cents = (parseInt(price) * 100).toString();

  let editRes = await fetch(`https://sell-api.goat.com/api/v1/listings/${id}`, {
    method: 'PUT',
    headers: {
      'user-agent': config.aliasHeader,
      authorization: `Bearer ${encryption.decrypt(loginToken[0].login)}`,
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

  return response.SUCCESS;
}
