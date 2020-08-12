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
    let image = res.main_glow_picture_url;
    let colorway = res.details;
    let retail = res.retail_price_cents;
    let sku = res.sku;
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

    if (!sku) {
      sku = 'N/A';
    }

    let pageData = await fetch(`https://www.goat.com/web-api/v1/product_variants?productTemplateId=${res.slug}`, {
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

    pageData.forEach((variant) => {
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

    priceAll = '$' + Math.round(priceAll / i);

    const embed = new Discord.MessageEmbed()
      .setColor(16777214)
      .setTitle(name)
      .setURL(productURL)
      .setThumbnail(image)
      .addFields(
        { name: 'SKU', value: sku, inline: true },
        { name: 'Colorway', value: `${colorway ? colorway : 'N/A'}`, inline: true },
        { name: 'Price', value: retail, inline: true },
        { name: 'Release Date', value: parsedDate, inline: true },
        { name: 'Average Price', value: priceAll }
      );

    if (askAllString.length != 0) {
      embed.addFields({ name: 'Lowest Asks', value: '```' + askAllString + '```' });
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
