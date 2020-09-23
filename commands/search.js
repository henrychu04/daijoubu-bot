const fetch = require('node-fetch');
const Discord = require('discord.js');

exports.run = async (client, message, args) => {
  try {
    const query = message.content.slice(8);

    if (query.length == 0) {
      throw new Error('Empty command');
    }

    let stockxSearch = '';
    let goatSearch = '';

    if (query.includes(':')) {
      let count = query.match(/:/g) || [];

      if (count.length == 2) {
        let split = query.split(' ');

        if (count.length == 2 && query.split(' ').length % 2 != 0) {
          throw new Error('Incorrect number parameters');
        }

        for (let i = 0; i < split.length; i++) {
          if (split[i].toLowerCase() == 'stockx:') {
            while (i < split.length) {
              i++;

              if (split[i] == 'goat:' || split[i] == undefined) {
                break;
              }

              if (stockxSearch == null) {
                stockxSearch = split[i] + ' ';
              } else {
                stockxSearch += split[i] + ' ';
              }
            }
          }

          if (split[i].toLowerCase() == 'goat:') {
            while (i < split.length) {
              i++;

              if (split[i] == 'stockx:' || split[i] == undefined) {
                break;
              }

              if (goatSearch == null) {
                goatSearch = split[i] + ' ';
              } else {
                goatSearch += split[i] + ' ';
              }
            }
          }

          if (split[i].toLowerCase() == 'stockx:') {
            while (i < split.length) {
              i++;

              if (split[i] == 'goat:' || split[i] == undefined) {
                break;
              }

              if (stockxSearch == null) {
                stockxSearch = split[i] + ' ';
              } else {
                stockxSearch += split[i] + ' ';
              }
            }
          }
        }
      } else if (count.length == 1 || count.length > 2) {
        throw new Error('Incorrect number parameters');
      }
    }

    let goatRes = await fetch('https://2fwotdvm2o-dsn.algolia.net/1/indexes/product_variants_v2/query', {
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
          throw new Error('Goat no hits');
        }
      });

    let goatSKU = goatRes.sku;

    let stockxRes = await fetch('https://xw7sbct9v6-dsn.algolia.net/1/indexes/products/query', {
      method: 'POST',
      headers: client.config.stockxHeader,
      body: `{"params":"query=${encodeURIComponent(query)}"}`,
    })
      .then((res) => {
        return res.json();
      })
      .then((json) => {
        if (json.hits.length != 0) {
          return json.hits[0];
        } else {
          throw new Error('Stockx no hits');
        }
      });

    let stockxSKU = stockxRes.style_id;

    goatSKU = goatSKU.split(/\s+/);

    if (!valid(goatSKU, stockxSKU)) {
      throw new Error('SKU not matching');
    }

    let goatData = await getGoatData(client, goatRes);
    let stockxData = await getStockxData(client, stockxRes);

    const embed = new Discord.MessageEmbed()
      .setColor(16777214)
      .setTitle(stockxData[0])
      .setURL(stockxData[1])
      .setDescription(goatData[3])
      .setThumbnail(stockxData[1])
      .addFields(
        {
          name: 'Links',
          value: `StockX - [${stockxData[0]}](${stockxData[2]})\n` + `GOAT - [${goatData[1]}](${goatData[2]})\n`,
        },
        { name: 'SKU', value: stockxSKU, inline: true },
        { name: 'Colorway', value: stockxData[3], inline: true },
        { name: 'Price', value: stockxData[4], inline: true },
        { name: 'Release Date', value: stockxData[5], inline: false },
        { name: 'Total Amount of StockX Sales', value: stockxData[6], inline: true },
        { name: 'StockX Sales Last 72 Hours', value: stockxData[7], inline: true },
        { name: 'Total StockX Sales', value: stockxData[8], inline: true },
        { name: 'Average StockX Sale Price', value: stockxData[9], inline: true },
        { name: '\u200b', value: '\u200b', inline: true },
        { name: '\u200b', value: '\u200b', inline: true },
        {
          name: 'StockX Lowest Asks',
          value: 'Average: ' + stockxData[9] + '```' + stockxData[10] + '```',
          inline: true,
        },
        {
          name: 'StockX Highest Bids',
          value: 'Average: ' + stockxData[11] + '```' + stockxData[12] + '```',
          inline: true,
        },
        {
          name: 'StockX Last Sold',
          value: 'Average: ' + stockxData[13] + '```' + stockxData[14] + '```',
          inline: true,
        },
        {
          name: 'GOAT Lowest Asks',
          value: 'Average: ' + goatData[9] + '```' + goatData[8] + '```',
          inline: true,
        },
        {
          name: 'GOAT Highest Bids',
          value: 'Average: ' + goatData[11] + '```' + goatData[10] + '```',
          inline: true,
        },
        { name: 'GOAT Last Sold', value: 'Average: ' + goatData[13] + '```' + goatData[12] + '```', inline: true }
      );

    message.channel
      .send(embed)
      .then(console.log(`${message} completed\n`))
      .catch((err) => {
        console.log(err);
        throw new Error('Unable to send embed');
      });
  } catch (err) {
    console.log(err);

    if (err.message == 'Empty command') {
      message.channel.send('```Command is missing search parameters```');
    } else if (err.message == 'Goat no hits') {
      message.channel.send('```No GOAT products found matching search parameters```');
    } else if (err.message == 'Stockx no hits') {
      message.channel.send('```No StockX products found matching search parameters```');
    } else if (err.message == 'SKU not matching') {
      message.channel.send('```Narrow search parameters, inconsistent products found```');
    } else if (err.message == 'Incorrect number parameters') {
      message.channel.send('```Incorrect number of search parameters```');
    } else if (err.message == 'Searched non sneaker') {
      message.channel.send('```Command only supports sneaker searches```');
    } else {
      message.channel.send('```Unexpected Error```');
    }
  }
};

function valid(goatSKU, stockxSKU) {
  try {
    for (SKU of goatSKU) {
      if (!stockxSKU.includes(SKU)) {
        return false;
      }
    }

    return true;
  } catch (err) {
    if (err.message == `Cannot read property 'includes' of null`) {
      throw new Error('Searched non sneaker');
    }
  }
}

async function getGoatData(client, res) {
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

  averageLowestPrice = '$' + Math.round(averageLowestPrice / lowest);
  averageHighestBid = '$' + Math.round(averageHighestBid / highest);
  averageLastSold = '$' + Math.round(averageLastSold / last);

  return [
    category,
    name,
    productURL,
    description,
    colorway,
    retail,
    SKU,
    parsedDate,
    lowestPrice,
    averageLowestPrice,
    highestBid,
    averageHighestBid,
    lastSold,
    averageLastSold,
  ];
}

async function getStockxData(client, res) {
  const productURL = `https://gateway.stockx.com/api/v2/products/${res.objectID}?includes=market,360&currency=USD&country=US`;

  let page = await fetch(productURL, {
    headers: client.config.stockxHeaderMobile,
  })
    .then((res) => {
      return res.json();
    })
    .catch((err) => console.log(err));

  let product = page.Product;

  let name = product.title;
  let URL = `https://www.stockx.com/${product.urlKey}`;
  let description = product.description;
  description = description.replace(/<br>/g, '');
  description = description.replace(/[\r\n]{2,}/g, '\n');
  let SKU = 'N/A';
  let season = 'N/A';
  let colorway = 'N/A';
  let price = 'NA';
  let date = 'N/A';
  let parsedDate = '';

  if (product.traits[0].name == 'Season') {
    for (trait of product.traits) {
      if (trait.name == 'Season') {
        season = trait.value;
      }

      if (trait.name == 'Color') {
        colorway = trait.value;
      }

      if (trait.name == 'Release Date') {
        date = trait.value;
        let [month, day, year] = new Date(date).toLocaleDateString().split('/');
        parsedDate = `${month.length == 1 ? '0' + month : month}/${day.length == 1 ? '0' + day : day}/${year}`;
      }

      if (trait.name == 'Retail') {
        price = '$' + trait.value;
      }
    }
  } else if (product.contentGroup == 'sneakers') {
    for (trait of product.traits) {
      if (trait.name == 'Style') {
        SKU = trait.value;
      }

      if (trait.name == 'Colorway') {
        colorway = trait.value;
      }

      if (trait.name == 'Retail Price') {
        price = '$' + trait.value;
      }

      if (trait.name == 'Release Date') {
        date = trait.value;
        let [month, day, year] = new Date(date).toLocaleDateString().split('/');
        parsedDate = `${month.length == 1 ? '0' + month : month}/${day.length == 1 ? '0' + day : day}/${year}`;
      }
    }
  }

  let image = product.media.imageUrl;
  let sales72 = product.market.salesLast72Hours;
  let totalSales = product.market.deadstockSold;
  let totalDollars = '$' + product.market.totalDollars.toLocaleString();
  let averageDeadstockPrice = '$' + product.market.averageDeadstockPrice;
  let lowestPrice = '';
  let highestBid = '';
  let lastSold = '';
  let averageLowestPrice = 0;
  let averageHighestBid = 0;
  let averageLastSold = 0;
  let lowest = 0;
  let highest = 0;
  let last = 0;

  for (variant in product.children) {
    let market = product.children[variant].market;

    if (
      (market.lowestAsk == undefined || market.lowestAsk == 0) &&
      (market.highestBid == undefined || market.highestBid == 0) &&
      (market.lastSale == undefined || market.lastSale == 0)
    ) {
      continue;
    }

    let size = product.children[variant].shoeSize;

    if (size == null || size.length == 0) {
      size = 'OS';
    }

    if (market.lowestAsk != 0 && market.lowestAsk != undefined) {
      lowestPrice += `${size} - $${market.lowestAsk}\n`;
      averageLowestPrice += market.lowestAsk;
      lowest++;
    } else {
      lowestPrice += `${size} - N/A\n`;
    }

    if (market.highestBid != 0 && market.highestBid != undefined) {
      highestBid += `${size} - $${market.highestBid}\n`;
      averageHighestBid += market.highestBid;
      highest++;
    } else {
      highestBid += `${size} - N/A\n`;
    }

    if (market.lastSale != 0 && market.lastSale != undefined) {
      lastSold += `${size} - $${market.lastSale}\n`;
      averageLastSold += market.lastSale;
      last++;
    } else {
      lastSold += `${size} - N/A\n`;
    }
  }

  averageLowestPrice = '$' + Math.round(averageLowestPrice / lowest);
  averageHighestBid = '$' + Math.round(averageHighestBid / highest);
  averageLastSold = '$' + Math.round(averageLastSold / last);

  return [
    name,
    image,
    URL,
    colorway,
    price,
    parsedDate,
    totalSales,
    sales72,
    totalDollars,
    averageDeadstockPrice,
    lowestPrice,
    averageLowestPrice,
    highestBid,
    averageHighestBid,
    lastSold,
    averageLastSold,
  ];
}
