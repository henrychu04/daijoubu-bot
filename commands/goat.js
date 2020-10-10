const fetch = require('node-fetch');
const Discord = require('discord.js');
const encryption = require('../scripts/encryption');

const Users = require('../models/users');

const response = {
  SUCCESS: 'success',
  NO_ITEMS: 'no_items',
  NO_CHANGE: 'no_change',
  EXIT: 'exit',
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
      command == 'list'
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
        if (args.length < 2) {
          [toReturn, returnedEnum] = await noCommand(client, loginToken);
        } else {
          throw new Error('Too many parameters');
        }

        switch (returnedEnum) {
          case response.SUCCESS:
            toReturn = '```' + toReturn + '```';
            break;
          case response.NO_CHANGE:
            toReturn = '```All Listing(s) Match Their Lowest Asks```';
            break;
          case response.NO_ITEMS:
            toReturn = '```Account Currently Has No Items Listed```';
            break;
          default:
            break;
        }
        break;
      case 'update':
        let all1 = false;

        if (args.length < 2) {
          throw new Error('Too little parameters');
        } else if (args[1] == 'all') {
          all1 = true;
        } else {
          args.shift();
        }

        returnedEnum = await update(client, loginToken, args, all1);

        switch (returnedEnum) {
          case response.SUCCESS:
            if (all1) {
              toReturn = '```All Listing(s) Updated Successfully!```';
            } else {
              toReturn = '```Specified Listing(s) Updated Successfully!```';
            }
            break;
          case response.NO_CHANGE:
            toReturn = '```All Listing(s) Already Match Their Lowest Asks```';
            break;
          case response.NO_ITEMS:
            toReturn = '```Account Currently Has No Items Listed```';
            break;
          default:
            break;
        }
        break;
      case 'listings':
        if (args.length > 1) {
          throw new Error('Too many parameters');
        }

        let listings = await getListings(client, loginToken);

        [toReturn, returnedEnum] = allListings(listings);

        switch (returnedEnum) {
          case response.SUCCESS:
            toReturn = '```' + toReturn + '```';
            break;
          case response.NO_ITEMS:
            toReturn = '```Account Currently Has No Items Listed```';
            break;
          default:
            break;
        }
        break;
      case 'delete':
        let all4 = false;
        if (args.length < 2) {
          throw new Error('Too little parameters');
        } else if (args[1] == 'all') {
          all4 = true;
        } else {
          args.shift();
        }

        returnedEnum = await deleteSearch(client, loginToken, args, all4);

        if (returnedEnum == response.SUCCESS) {
          if (all4) {
            toReturn = '```All Listing(s) Deleted Successfully```';
          } else {
            toReturn = '```Specified Listing(s) Deleted Successfully```';
          }
        } else if (returnedEnum == response.NO_ITEMS) {
          toReturn = '```Account Currently Has No Items Listed```';
        }
        break;
      case 'edit':
        if (args.length != 3) {
          throw new Error('Incorrect format');
        } else {
          args.shift();
        }

        returnedEnum = await editListing(client, loginToken, args);

        if (returnedEnum == response.SUCCESS) {
          toReturn = '```Item edited successfully```';
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
        let all2 = false;

        if (args.length < 2) {
          throw new Error('Too little parameters');
        } else if (args[1] == 'all') {
          all2 = true;
        } else {
          args.shift();
        }

        returnedEnum = await confirm(client, loginToken, args, all2);

        switch (returnedEnum) {
          case response.SUCCESS:
            if (all2) {
              toReturn = '```All Order(s) Confirmed Successfully!```';
            } else {
              toReturn = '```Orders(s) Updated Successfully!```';
            }
            break;
          case response.NO_ITEMS:
            toReturn = '```No Open Order(s) Currently On Account```';
            break;
          case response.NO_CHANGE:
            toReturn = '```Currently All Open Order(s) Are Confirmed```';
          default:
            break;
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

        toReturn = await settings(client, message, user, edit);

        break;
      case 'list':
        let params = message.content.slice(11).split(' ');

        let valid = false;
        let sizingArray = [];
        let searchParams = '';
        let listString = '';

        [valid, returnedEnum, sizingArray, searchParams] = await checkListParams(params);

        if (!valid && returnedEnum == response.NO_CHANGE) {
          throw new Error('Invalid list command');
        } else if (valid) {
          [returnedEnum, listString] = await list(client, message, user, loginToken, sizingArray, searchParams);
        }

        if (returnedEnum == response.SUCCESS) {
          toReturn = '```' + listString + '```';
        } else if (returnedEnum == response.EXIT) {
          toReturn = '';
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
        toReturn = await goatSearch(client, query);
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
            `Incorrect format\n\nCorrect format is:\n\n!goat list <search parameters> [<size (num)>,<price (num, 'lowest')>,<amount (num) - optional>] [] ...` +
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

async function noCommand(client, loginToken) {
  let listings = await getListings(client, loginToken);

  if (!listings.listing) {
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

async function update(client, loginToken, ids, all) {
  let listings = await getListings(client, loginToken);

  let listingObj = [];

  if (listings.listing) {
    for (let i = 0; i < listings.listing.length; i++) {
      listingObj = await checkListings(listings.listing[i], listingObj);
    }
  } else {
    return response.NO_ITEMS;
  }

  if (listingObj.length == 0) {
    return response.NO_CHANGE;
  }

  let updateRes = 0;

  for (let i = 0; i < listingObj.length; i++) {
    if (all && listingObj[i].price_cents > listingObj[i].product.lowest_price_cents) {
      updateRes = await updateListing(client, loginToken, listingObj[i]);
    }

    if (!all) {
      for (let j = 0; j < ids.length; j++) {
        if (ids[j] == listingObj[i].id) {
          updateRes = await updateListing(client, loginToken, listingObj[i]);
        }
      }
    }
  }

  if (updateRes == 200) {
    return response.SUCCESS;
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

function allListings(listings) {
  let listingString = 'Current Listings:';

  if (listings.listing) {
    listings.listing.forEach((obj, i) => {
      listingString += `\n\t${i}. ${obj.product.name} - ${obj.size_option.name.toUpperCase()} $${
        obj.price_cents / 100
      }\n\t\tid: ${obj.id}\n`;
    });
  } else {
    return ['', response.NO_ITEMS];
  }

  return [listingString, response.SUCCESS];
}

async function deleteSearch(client, loginToken, args, all) {
  let deleteRes = 0;

  if (all) {
    let listings = await getListings(client, loginToken);

    if (!listings.listing) {
      return response.NO_ITEMS;
    }

    for (let i = 0; i < listings.listing.length; i++) {
      deleteRes = await deletion(client, loginToken, listings.listing[i].id);
    }
  } else {
    for (let i = 0; i < args.length; i++) {
      deleteRes = await deletion(client, loginToken, args[i]);
    }
  }

  if (deleteRes == 200) {
    return response.SUCCESS;
  }
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

async function editListing(client, loginToken, args) {
  let id = args[0];
  let price = args[1];

  let getJSON = await fetch(`https://sell-api.goat.com/api/v1/listings/${id}`, {
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

  getJSON.listing.price_cents = (parseInt(price) * 100).toString();

  let editRes = await fetch(`https://sell-api.goat.com/api/v1/listings/${id}`, {
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

  return response.SUCCESS;
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

  if (purchaseOrders.purchase_orders) {
    purchaseOrders.purchase_orders.forEach((order) => {
      let date = new Date(order.take_action_by);

      if (order.status == 'NEEDS_CONFIRMATION') {
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
        console.log(`\nNew order status is '${order.status}'\n`);
      }
    });

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

    return [returnString, response.SUCCESS];
  } else {
    return ['', response.NO_ITEMS];
  }
}

async function confirm(client, loginToken, args, all) {
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

  let orders = purchaseOrders.purchase_orders;

  if (!orders) {
    return response.NO_ITEMS;
  }

  let orderNum = 0;

  for (let i = 0; i < orders.length; i++) {
    console.log(orders[i].number);
    let exist = false;

    if (all && orders[i].status == 'NEEDS_CONFIRMATION') {
      orderNum++;
      await confirmation(client, loginToken, orders[i].number);
    }

    if (!all) {
      for (let j = 0; j < args.length; j++) {
        if (orders[i].number == args[j]) {
          exist = true;
          orderNum++;

          if (exist && orders[i].status == 'NEEDS_CONFIRMATION') {
            confirmRes = await confirmation(client, loginToken, orders[i].number);
          }
        }
      }

      if (!exist) {
        throw new Error('Order not exist');
      }
    }
  }

  if (orderNum == 0) {
    return response.NO_CHANGE;
  } else {
    return response.SUCCESS;
  }
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
    .setTitle('GOAT / alias Settings')
    .addFields({
      name: 'Order Confirmation Refresh Rate:',
      value: user.settings.orderRefresh == 'live' ? 'Live' : 'Daily',
    });

  if (!edit) {
    return userSettings;
  } else {
    await message.channel.send(userSettings).catch((err) => {
      throw new Error(err);
    });

    await message.channel.send('```' + `Enter 'live' or 'daily' to adjust order confirmation refresh rate` + '```');

    const collector = new Discord.MessageCollector(message.channel, (m) => m.author.id === message.author.id, {
      time: 10000,
    });

    collector.on('collect', async (message) => {
      if (message.content.toLowerCase() == 'live' || message.content.toLowerCase() == 'daily') {
        let setting = message.content.toLowerCase();

        await Users.updateOne({ _id: user._id }, { $set: { 'settings.orderRefresh': setting } }, async (err) => {
          if (!err) {
            await message.channel.send('```Order confirmation refresh rate edited successfully```');
            collector.stop();
            console.log('!goat settings edit completed\n');
          }
        }).catch((err) => {
          throw new Error(err);
        });
      } else {
        await message.channel.send('```' + `Enter either 'live' or 'daily'` + '```');
      }
    });

    collector.on('end', async (collected) => {
      if (collected.size == 0) {
        await message.channel.send('```Command timed out```');
      }
    });

    return '';
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

async function list(client, message, user, loginToken, sizingArray, query) {
  let searchProduct = await goatSearch(client, query).catch((err) => {
    throw new Error(err.message);
  });

  await message.channel.send(searchProduct);

  await message.channel.send(
    '```' + `Is this the product that you want to list?\nEnter 'y' to confirm, enter 'n' to exit` + '```'
  );

  let returnedEnum = null;
  let returnString = '';

  const collector = message.channel.createMessageCollector((msg) => msg.author.id == message.author.id, {
    time: 15000,
  });

  for await (const message of collector) {
    if (message.content.toLowerCase() == 'y' || message.content.toLowerCase() == 'n') {
      if (message.content.toLowerCase() == 'n') {
        collector.stop();
        await message.channel.send('```' + `Exited` + '```');
        returnedEnum = response.EXIT;
      } else {
        collector.stop();
        [returnedEnum, returnString] = await doList(client, loginToken, message, searchProduct, sizingArray);
      }
    } else {
      await message.channel.send('```' + `Enter either 'y' or 'n'` + '```');
    }
  }

  collector.on('end', async (collected) => {
    if (collected.size == 0) {
      await message.channel.send('```Command timed out```');
    }
  });

  return [returnedEnum, returnString];
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
    listing.listing.sizeOption.value = parseInt(size);

    if (price == 'lowest') {
      for (let k = 0; k < pageData.availability.length; k++) {
        if (pageData.availability[k].size == parseInt(size)) {
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

    for (variant of pageData.availability) {
      if (variant.size == size) {
        if (variant.lowest_price_cents > listing.listing.priceCents) {
          lower = true;
          break;
        }
      }
    }

    async function whileRequest(client, loginToken, listing, amount, returnString) {
      let j = 0;

      while (j < parseInt(amount)) {
        let id = await listRes(client, loginToken, listing);
        returnString += `\t\t${j}. size: ${listing.listing.sizeOption.name} - $${
          listing.listing.priceCents / 100
        }\n\t\t\tid: ${id}\n`;

        j++;
      }

      returnString += '\n';

      return returnString;
    }

    if (lower) {
      let skip = false;

      await message.channel.send(
        '```' +
          `You entered a lower asking price than the current lowest asking price for size ${size}\nEnter 'y to confirm, 'n' to skip` +
          '```'
      );

      const collector = new Discord.MessageCollector(message.channel, (m) => m.author.id === message.author.id, {
        time: 15000,
      });

      for await (const message of collector) {
        if (message.content.toLowerCase() == 'y' || message.content.toLowerCase() == 'n') {
          if (message.content.toLowerCase() == 'n') {
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
        if (collected.size == 0) {
          await message.channel.send('```Command timed out```');
        }
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
    return [returnedEnum, returnString];
  } else {
    throw new Error('Error listing');
  }
}

async function listRes(client, loginToken, listing) {
  let id = '';
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

  id = list.listing.id;

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

  return id;
}

function help() {
  const helpEmbed = new Discord.MessageEmbed()
    .setColor('#7756fe')
    .setTitle('GOAT / alias Help')
    .setDescription(
      'All the GOAT / alias account commands\n\nAn alias account is required to use the commands. To gain access to an alias account, you must have a GOAT account with a score of 150 or greater. Each command will only work for the bound alias account. It is not possible to control the listings for another alias account.\n\n[Click for more info](https://apps.apple.com/us/app/alias-sell-sneakers-apparel/id1467090341)\n\nIf no alias account is bound to the Discord account, DM \n``!login <email> <password>`` to the daijoubu bot to login.'
    )
    .addFields(
      { name: '!goat listings', value: 'Returns all the current listings for the attached account.' },
      {
        name: '!goat check',
        value: 'Checks if all the listings for the attached account match the current lowest ask.',
      },
      {
        name: '!goat update ( all / <listing id(s)> )',
        value: 'Updates the listings to the current lowest ask. Able to take in multiple listing ids at once.',
      },
      {
        name: '!goat edit <listing id(s)>',
        value: 'Edits the ask for the listings that are sent. Able to take in multiple listing ids at once.',
      },
      {
        name: '!goat delete <listing id(s)>',
        value: 'Deletes the listings for the account. Able to take in multiple listing ids at once.',
      },
      { name: '!goat orders', value: 'Returns all the current orders for the attached account.' },
      {
        name: '!goat confirm ( all / <order num(s)> )',
        value: 'Confirms the orders that are passed in. Able to take in multiple order ids at once.',
      },
      {
        name: 'Automated confimation of orders',
        value:
          'Everyday at 12:01 AM EST, all orders that need confirmation for the bound account will be confirmed and a shipping label will be generated.',
      }
    );

  return helpEmbed;
}
