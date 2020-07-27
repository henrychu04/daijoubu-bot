const fetch = require('node-fetch');
const cheerio = require('cheerio');
const config = require('../config.json');
const Discord = require('discord.js');

exports.run = async (client, message, args) => {
  try {
    const embed = new Discord.MessageEmbed().setColor(16777214);

    const query = message.content.slice(8);

    const headers = {
      'x-algolia-application-id': 'XW7SBCT9V6',
      'x-algolia-api-key': '6bfb5abee4dcd8cea8f0ca1ca085c2b3',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4136',
    };

    let data = await fetch('https://xw7sbct9v6-dsn.algolia.net/1/indexes/products/query', {
      method: 'POST',
      headers: headers,
      body: `{\"params\":\"query=${encodeURIComponent(query)}&facets=*&filters=\"}`,
    }).then((res) => {
      return res.json();
    });

    if (data.hits.length == 0) {
      throw new Error('No matching products');
    }

    const productURL = `https://www.stockx.com/${data.hits[0].url}`;

    let page = await fetch(productURL, {
      headers: config.headers,
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

    embed.setTitle(name);
    embed.setURL(productURL);

    const pageDetails = $('.detail');

    embed.addFields(
      { name: 'SKU', value: pageDetails.find('[data-testid="product-detail-style"]').text().trim(), inline: true },
      {
        name: 'Colorway',
        value: pageDetails.find('[data-testid="product-detail-colorway"]').text().trim(),
        inline: true,
      },
      {
        name: 'Price',
        value: pageDetails.find('[data-testid="product-detail-retail price"]').text().trim(),
        inline: true,
      },
      {
        name: 'Date',
        value: pageDetails.find('[data-testid="product-detail-release date"]').text().trim(),
        inline: true,
      }
    );

    const image = $('[data-testid="product-detail-image"]').attr('src');
    embed.setThumbnail(image);

    const salesData = $('.gauge-container');
    let numberSales = null;
    let averagePrice = null;

    salesData.each((i, el) => {
      if ($(el).find('.gauge-title').text() == '# of Sales') {
        numberSales = $(el).find('.gauge-value').text();
        embed.addFields({
          name: 'Number of Sales',
          value: Number(numberSales).toLocaleString(),
          inline: true,
        });
      }

      if ($(el).find('.gauge-title').text() == 'Average Sale Price') {
        averagePrice = $(el).find('.gauge-value').text();
        embed.addFields({
          name: 'Average Price',
          value: averagePrice.toLocaleString(),
          inline: true,
        });
      }
    });

    const totalSales = '$' + (numberSales * averagePrice.replace(/\D/g, '')).toLocaleString();
    embed.addFields({ name: 'Total Sales', value: totalSales, inline: true });

    const askTable = $('.market-summary').find('li[class="select-option"]');

    let asksAllString = '';

    askTable.each((i, el) => {
      let prop = {};

      prop.size = $(el).find('.title').text().trim();
      prop.price = $(el).find('.subtitle').text();

      asksAllString += `${prop.size} -- ${prop.price}\n`;
    });

    embed.addFields({ name: 'Lowest Asks', value: asksAllString });

    message.channel
      .send(embed)
      .then(console.log(`${message} completed`))
      .catch((err) => {
        console.log(err);
        throw new Error('Unable to send embed');
      });
  } catch (err) {
    console.log(err);

    if (err.message == 'No matching products') {
      message.channel.send('```' + 'No products found matching search parameters' + '```');
    } else {
      message.channel.send('```Unexpected Error```');
    }
  }
};
