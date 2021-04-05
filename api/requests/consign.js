const Discord = require('discord.js');
const fetch = require('node-fetch');
const Money = require('js-money');

module.exports = async (client, query) => {
  let res = null;
  let resStatus = 0;
  let count = 0;

  while (resStatus != 200) {
    res = await fetch('https://2fwotdvm2o-dsn.algolia.net/1/indexes/product_variants_v2/query', {
      method: 'POST',
      headers: client.config.goatHeader,
      body: `{"params":"query=${encodeURIComponent(query)}"}`,
    })
      .then((res, err) => {
        resStatus = res.status;

        if (res.status == 200) {
          return res.json();
        } else {
          console.log('Res is', res.status);
          console.trace();

          if (err) {
            throw new Error(err);
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

    count++;

    if (count == client.config.maxRetries) {
      throw new Error('Max retries');
    }
  }

  let dataRes = 0;
  let data = null;
  count = 0;

  while (dataRes != 200) {
    data = await fetch(`https://www.goat.com/api/v1/product_variants/buy_bar_data?productTemplateId=${res.slug}`, {
      headers: client.config.headers,
    }).then((res, err) => {
      dataRes = res.status;

      if (res.status == 200) {
        return res.json();
      } else {
        console.log('Res is', res.status);
        console.trace();

        if (err) {
          throw new Error(err);
        }
      }
    });

    count++;

    if (count == client.config.maxRetries) {
      throw new Error('Max retries');
    }
  }

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

  let consignString = '';
  let lowestListing = '';
  let potentialProfit = '';

  for (obj of data) {
    if (
      obj.boxCondition == 'good_condition' &&
      obj.instantShipLowestPriceCents.amount &&
      obj.shoeCondition == 'new_no_defects'
    ) {
      consignString += `${obj.sizeOption.presentation} - $${obj.instantShipLowestPriceCents.amount / 100}\n`;

      if (obj.lowestPriceCents.amount) {
        lowestListing += `${obj.sizeOption.presentation} - $${obj.lowestPriceCents.amount / 100}\n`;
      } else {
        lowestListing += `${obj.sizeOption.presentation} - N/A\n`;
      }

      if (obj.instantShipLowestPriceCents.amount && obj.lowestPriceCents.amount) {
        let consignNum = Money.fromDecimal(parseInt(obj.instantShipLowestPriceCents.amount / 100), 'USD');
        let lowestNum = Money.fromDecimal(parseInt(obj.lowestPriceCents.amount / 100), 'USD');

        let consignNum1 = consignNum.multiply(0.095, Math.ceil);
        consignNum1 = consignNum1.add(new Money(500, Money.USD));
        let consignNum2 = consignNum.subtract(consignNum1, Math.ceil);
        consignNum2 = consignNum2.multiply(0.029, Math.ceil);
        consignNum1 = consignNum1.add(consignNum2, Math.ceil);
        let consignNumRevenue = consignNum.subtract(consignNum1, Math.ceil);

        if (consignNumRevenue > lowestNum) {
          potentialProfit += `${obj.sizeOption.presentation} - $${consignNumRevenue.subtract(lowestNum, Math.ceil)}\n`;
        } else {
          potentialProfit += `${obj.sizeOption.presentation} - N/A\n`;
        }
      }
    }
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
      { name: 'Consignment Prices', value: '```' + consignString + '```', inline: true },
      {
        name: 'Lowest Asks',
        value: '```' + lowestListing + '```',
        inline: true,
      },
      { name: 'Potential Profit', value: '```' + potentialProfit + '```', inline: true }
    );

  return embed;
};
