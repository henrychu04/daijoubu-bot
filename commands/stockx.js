const fetch = require('node-fetch');
const cheerio = require('cheerio');
const Discord = require('discord.js');

exports.run = async (client, message, args) => {
  try {
    const query = message.content.slice(8);

    if (query.length == 0) {
      throw new Error('Empty command');
    }

    let last72 = 0;
    let totalSales = 0;

    let data = await fetch('https://xw7sbct9v6-dsn.algolia.net/1/indexes/products/query', {
      method: 'POST',
      headers: client.config.stockxHeader,
      body: `{"params":"query=${encodeURIComponent(query)}"}`,
    })
      .then((res) => {
        return res.json();
      })
      .then((json) => {
        if (json.hits.length != 0) {
          last72 = json.hits[0].sales_last_72;
          totalSales = '$' + json.hits[0].total_dollars.toLocaleString();
          return json.hits[0];
        } else {
          throw new Error('No hits');
        }
      });

    const productURL = `https://www.stockx.com/${data.url}`;

    let page = await fetch(productURL, {
      headers: client.config.headers,
    })
      .then((res) => {
        return res.text();
      })
      .catch((err) => console.log(err));

    const $ = cheerio.load(page);

    const name = $('div[class="product-header hidden-xs"]')
      .find('div[class="col-md-12"]')
      .find('h1[class="name"]')
      .text();

    const pageDetails = $('.detail');

    let SKU = pageDetails.find('[data-testid="product-detail-style"]').text().trim();
    let colorway = pageDetails.find('[data-testid="product-detail-colorway"]').text().trim();
    let price = pageDetails.find('[data-testid="product-detail-retail price"]').text().trim();
    let date = pageDetails.find('[data-testid="product-detail-release date"]').text().trim();

    if (!SKU) {
      SKU = 'N/A';
    }

    if (!colorway) {
      colorway = 'N/A';
    }

    if (!price) {
      price = 'N/A';
    }

    if (!date) {
      date = 'N/A';
    }

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
    let asksAllString = '';
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

      asksAllString += `OS   ----   ${lowestAsk}`;
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

    const embed = new Discord.MessageEmbed()
      .setColor(16777214)
      .setTitle(name)
      .setURL(productURL)
      .setThumbnail(image)
      .addFields(
        { name: 'SKU', value: SKU, inline: true },
        { name: 'Colorway', value: colorway, inline: true },
        { name: 'Price', value: price, inline: true },
        { name: 'Release Date', value: date }
      )
      .addFields({
        name: 'Number of Sales',
        value: Number(numberSales).toLocaleString(),
        inline: true,
      })
      .addFields({
        name: 'Average Selling Price',
        value: averagePrice.toLocaleString(),
        inline: true,
      })
      .addFields({ name: 'Total Sales', value: totalSales, inline: true })
      .addFields({ name: 'Sales Last 72 Hours', value: last72, inline: true });

    if (asksAllString.length != 0) {
      embed.addFields({ name: 'Lowest Asks', value: '```' + asksAllString + '```' });
    }

    message.channel
      .send(embed)
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
      message.channel.send('```Command is missing search parameters```');
    } else {
      message.channel.send('```Unexpected Error```');
    }
  }
};
