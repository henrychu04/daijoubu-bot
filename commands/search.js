const fetch = require('node-fetch');
const cheerio = require('cheerio');
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
      body: `{"params":"query=${encodeURIComponent(goatSearch.trim().length != 0 ? goatSearch.trim() : query)}"}`,
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

    let stockxLast72 = 0;
    let stockxTotalSales = 0;

    let stockxRes = await fetch('https://xw7sbct9v6-dsn.algolia.net/1/indexes/products/query', {
      method: 'POST',
      headers: client.config.stockxHeader,
      body: `{"params":"query=${encodeURIComponent(stockxSearch.trim().length != 0 ? stockxSearch.trim() : query)}"}`,
    })
      .then((res) => {
        return res.json();
      })
      .then((json) => {
        if (json.hits.length != 0) {
          stockxLast72 = json.hits[0].sales_last_72;
          stockxTotalSales = '$' + json.hits[0].total_dollars.toLocaleString();
          return json.hits[0];
        } else {
          throw new Error('Stockx no hits');
        }
      });

    const stockxURL = `https://www.stockx.com/${stockxRes.url}`;

    let stockxPage = await fetch(stockxURL, {
      headers: client.config.headers,
    })
      .then((res) => {
        return res.text();
      })
      .catch((err) => console.log(err));

    const $ = cheerio.load(stockxPage);

    const stockxPageDetails = $('.detail');
    let stockxSKU = stockxPageDetails.find('[data-testid="product-detail-style"]').text().trim();

    goatSKU = goatSKU.split(/\s+/);

    if (!valid(goatSKU, stockxSKU)) {
      throw new Error('SKU not matching');
    }

    let goatData = await getGoatData(client, goatRes);
    let stockxData = await getStockxData(client, stockxPage);

    const embed = new Discord.MessageEmbed()
      .setColor(16777214)
      .setTitle(stockxData[0])
      .setURL(stockxData[1])
      .setDescription(goatData[3])
      .setThumbnail(stockxData[1])
      .addFields(
        { name: 'SKU', value: stockxSKU, inline: true },
        { name: 'Colorway', value: stockxData[2], inline: true },
        { name: 'Price', value: stockxData[3], inline: true },
        { name: 'Release Date', value: stockxData[4], inline: false },
        { name: 'Average StockX Selling Price', value: stockxData[6], inline: true },
        { name: 'Number of StockX Sales', value: stockxData[5], inline: true },
        { name: 'Total StockX Sales', value: stockxTotalSales, inline: true },
        { name: 'StockX Sales Last 72 Hours', value: stockxLast72, inline: false },
        {
          name: `StockX Lowest Asks`,
          value:
            `[${stockxData[0]}](${stockxURL})\n` + `Average Price: ${stockxData[7]}\n` + '```' + stockxData[8] + '```',
          inline: true,
        },
        {
          name: `GOAT Lowest Asks`,
          value: `[${goatData[1]}](${goatData[2]})\n` + `Average Price: ${goatData[8]}\n` + '```' + goatData[9] + '```',
          inline: true,
        }
      );

    message.channel
      .send(embed)
      .then(console.log(`${message} completed`))
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
    } else {
      message.channel.send('```Unexpected Error```');
    }
  }
};

function valid(goatSKU, stockxSKU) {
  for (SKU of goatSKU) {
    if (!stockxSKU.includes(SKU)) {
      return false;
    }
  }

  return true;
}

async function getGoatData(client, res) {
  let category = res.product_category;
  let name = res.name;
  let productURL = 'https://www.goat.com/sneakers/' + res.slug;
  let description = res.story_html;
  description = description.replace('<p>', '');
  description = description.replace('</p>', '');
  let colorway = res.details;
  let retail = res.retail_price_cents;
  let SKU = res.sku;
  let date = res.release_date;
  let parsedDate = null;

  if (date != null) {
    let [month, day, year] = new Date(date).toLocaleDateString().split('/');
    parsedDate = `${month.length == 1 ? '0' + month : month}/${day.length == 1 ? '0' + day : day}/${year}`;
  } else if (res.brand_name == 'Supreme' && category == 'clothing') {
    parsedDate = sku.substring(0, 4);
  } else {
    parsedDate = 'N/A';
  }

  if (!category) {
    category = 'N/A';
  }

  if (!name) {
    name = 'N/A';
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

  let goatpageData = await fetch(`https://www.goat.com/web-api/v1/product_variants?productTemplateId=${res.slug}`, {
    method: 'GET',
    headers: client.config.headers,
  })
    .then((res) => {
      return res.json();
    })
    .then((json) => {
      return json;
    });

  let askAllString = '';
  let priceAll = 0;
  let i = 0;

  goatpageData.forEach((variant) => {
    if (variant.shoeCondition == 'new_no_defects' && variant.boxCondition == 'good_condition') {
      let size = null;

      if (category == 'shoes') {
        size = variant.size;
      } else if (category == 'clothing') {
        size = variant.sizeOption.presentation.toUpperCase();
      }

      priceAll += variant.lowestPriceCents.amount / 100;
      let price = '$' + variant.lowestPriceCents.amount / 100;
      i++;

      askAllString += `${size}   ----   ${price}\n`;
    }
  });

  priceAll = '$' + Math.round(priceAll / i).toLocaleString();

  return [category, name, productURL, description, colorway, retail, SKU, parsedDate, priceAll, askAllString];
}

async function getStockxData(client, res) {
  const $ = cheerio.load(res);

  const pageDetails = $('.detail');

  let colorway = pageDetails.find('[data-testid="product-detail-colorway"]').text().trim();
  let price = pageDetails.find('[data-testid="product-detail-retail price"]').text().trim();
  let date = pageDetails.find('[data-testid="product-detail-release date"]').text().trim();

  const name = $('div[class="product-header hidden-xs"]')
    .find('div[class="col-md-12"]')
    .find('h1[class="name"]')
    .text();

  const image = $('[data-testid="product-detail-image"]').attr('src');

  const salesData = $('.gauge-container');
  let numberSales = '';
  let averagePrice = '';

  salesData.each((i, el) => {
    if ($(el).find('.gauge-title').text() == '# of Sales') {
      numberSales = $(el).find('.gauge-value').text();
    }

    if ($(el).find('.gauge-title').text() == 'Average Sale Price') {
      averagePrice = $(el).find('.gauge-value').text();
    }
  });

  const askTable = $('.market-summary').find('li[class="select-option"]');
  let askAllString = '';
  let totalPrice = 0;
  let j = 0;

  if (askTable.length == 0) {
    let asks = $('.market-summary').find('.stats').find('div[class="en-us stat-value stat-small"]');
    let lowestAsk = '';

    asks.each((i, el) => {
      if ($(el).next().text() == 'Lowest Ask') {
        lowestAsk = $(el).text();

        let price = lowestAsk.replace('$', '');
        price = Number(price);
        totalPrice += price;
        j++;
      }
    });

    askAllString += `OS   ----   ${lowestAsk}`;
  } else {
    askTable.each((i, el) => {
      let size = $(el).find('.title').text().trim();
      let price = $(el).find('.subtitle').text();

      askAllString += `${size}   ----   ${price}\n`;

      price = price.replace('$', '');
      price = price.replace(/,/g, '');
      price = Number(price);
      totalPrice += price;
      j++;
    });
  }

  totalPrice = '$' + Math.round(totalPrice / j).toLocaleString();

  return [name, image, colorway, price, date, numberSales, averagePrice, totalPrice, askAllString];
}
