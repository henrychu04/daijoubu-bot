const fetch = require('node-fetch');
const Discord = require('discord.js');

exports.run = async (client, message, args) => {
  try {
    const query = message.content.slice(6);

    if (query.length == 0) {
      throw new Error('Empty command');
    }

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
    )
      .then((res) => {
        return res.json();
      })
      .then((json) => {
        return json;
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
        lowestPrice += `${size}   ----   $${variant.lowest_price_cents / 100}\n`;
        averageLowestPrice += variant.lowest_price_cents / 100;
        lowest++;
      } else {
        lowestPrice += `${size}   ----   N/A\n`;
      }

      if (variant.highest_offer_cents != undefined) {
        highestBid += `${size}   ----   $${variant.highest_offer_cents / 100}\n`;
        averageHighestBid += variant.highest_offer_cents / 100;
        highest++;
      } else {
        highestBid += `${size}   ----   N/A\n`;
      }

      if (variant.last_sold_price_cents != undefined) {
        lastSold += `${size}   ----   $${variant.last_sold_price_cents / 100}\n`;
        averageLastSold += variant.last_sold_price_cents / 100;
        last++;
      } else {
        lastSold += `${size}   ----   N/A\n`;
      }
    }

    averageLowestPrice = '$' + Math.round(averageLowestPrice / lowest);
    averageHighestBid = '$' + Math.round(averageHighestBid / highest);
    averageLastSold = '$' + Math.round(averageLastSold / last);

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
        { name: 'Lowest Asks', value: 'Average: ' + averageLowestPrice + '```' + lowestPrice + '```' },
        {
          name: 'Highest Bids',
          value: 'Average: ' + averageHighestBid + '```' + highestBid + '```',
        },
        { name: 'Last Sold', value: 'Average: ' + averageLastSold + '```' + lastSold + '```' }
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

    if (err.message == 'No hits') {
      message.channel.send('```No products found matching search parameters```');
    } else if (err.message == 'Empty command') {
      message.channel.send('```Command is missing search parameters```');
    } else {
      message.channel.send('```Unexpected Error```');
    }
  }
};
