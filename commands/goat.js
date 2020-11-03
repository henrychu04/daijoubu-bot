const fetch = require('node-fetch');
const Discord = require('discord.js');

exports.run = async (client, message, args) => {
  try {
    const query = message.content.slice(6);

    if (args.length == 0) {
      throw new Error('Empty command');
    }

    let toReturn = await goatSearch(client, query);

    await message.channel
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

  let category = res.product_category ? res.product_category : 'N/A';
  let name = res.name;
  let productURL = 'https://www.goat.com/sneakers/' + res.slug;
  let description = '';
  if (res.story_html != null) {
    description = res.story_html;
    description = description.replace('<p>', '');
    description = description.replace('</p>', '');
  }
  let image = res.main_glow_picture_url ? res.main_glow_picture_url : null;
  let colorway = res.details ? res.details : 'N/A';
  let retail = res.retail_price_cents ? '$' + res.retail_price_cents / 100 : 'N/A';
  let SKU = res.sku ? res.sku : 'N/A';
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

  for (variant of pageData.availability) {
    if (variant.lowest_price_cents || variant.highest_offer_cents || variant.last_sold_price_cents) {
      if (variant.lowest_price_cents) {
        lowestPrice += `${variant.size} - $${variant.lowest_price_cents / 100}\n`;
        averageLowestPrice += variant.lowest_price_cents / 100;
        lowest++;
      } else {
        lowestPrice += `${variant.size} - N/A\n`;
      }

      if (variant.highest_offer_cents) {
        highestBid += `${variant.size} - $${variant.highest_offer_cents / 100}\n`;
        averageHighestBid += variant.highest_offer_cents / 100;
        highest++;
      } else {
        highestBid += `${variant.size} - N/A\n`;
      }

      if (variant.last_sold_price_cents) {
        lastSold += `${variant.size} - $${variant.last_sold_price_cents / 100}\n`;
        averageLastSold += variant.last_sold_price_cents / 100;
        last++;
      } else {
        lastSold += `${variant.size} - N/A\n`;
      }
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
    .setColor('#7756fe')
    .setTitle(name)
    .setURL(productURL)
    .setThumbnail(image)
    .setDescription(description)
    .addFields(
      { name: 'SKU', value: SKU, inline: true },
      { name: 'Colorway', value: colorway, inline: true },
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
