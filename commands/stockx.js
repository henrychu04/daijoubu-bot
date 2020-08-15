const fetch = require('node-fetch');
const Discord = require('discord.js');

exports.run = async (client, message, args) => {
  try {
    const query = message.content.slice(8);

    if (query.length == 0) {
      throw new Error('Empty command');
    }

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
          return json.hits[0];
        } else {
          throw new Error('No hits');
        }
      });

    const productURL = `https://gateway.stockx.com/api/v2/products/${data.objectID}?includes=market,360&currency=USD&country=US`;

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
    let SKU = 'N/A';
    let season = 'N/A';
    let colorway = 'N/A';
    let price = 'NA';
    let date = 'N/A';

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
        }
      }
    }

    let image = product.media.imageUrl;
    let sales72 = product.market.salesLast72Hours;
    let totalSales = product.market.deadstockSold;
    let totalDollars = '$' + product.market.totalDollars.toLocaleString();
    let averageDeadstockPrice = '$' + product.market.averageDeadstockPrice;
    let lowestPrice = '';
    let highestOffer = '';
    let lastSold = '';
    let averageLowestPrice = 0;
    let averageHighestOffer = 0;
    let averageLastSold = 0;
    let lowest = 0;
    let highest = 0;
    let last = 0;

    for (variant in product.children) {
      let market = product.children[variant].market;

      let size = product.children[variant].shoeSize;

      if (size == null || size.length == 0) {
        size = 'OS';
      }

      if (market.lowestAsk != 0) {
        lowestPrice += `${size}   ----   $${market.lowestAsk}\n`;
        averageLowestPrice += market.lowestAsk;
        lowest++;
      } else {
        lowestPrice += `${size}   ----   N/A\n`;
      }

      if (market.highestBid != 0) {
        highestOffer += `${size}   ----   $${market.highestBid}\n`;
        averageHighestOffer += market.highestBid;
        highest++;
      } else {
        highestOffer += `${size}   ----   N/A\n`;
      }

      if (market.lastSale != 0) {
        lastSold += `${size}   ----   $${market.lastSale}\n`;
        averageLastSold += market.lastSale;
        last++;
      } else {
        lastSold += `${size}   ----   N/A\n`;
      }
    }

    averageLowestPrice = '$' + Math.round(averageLowestPrice / lowest);
    averageHighestOffer = '$' + Math.round(averageHighestOffer / highest);
    averageLastSold = '$' + Math.round(averageLastSold / last);

    const embed = new Discord.MessageEmbed()
      .setColor(16777214)
      .setTitle(name)
      .setURL(URL)
      .setThumbnail(image)
      .setDescription(description);

    if (SKU != 'N/A') {
      embed.addFields({ name: 'SKU', value: SKU, inline: true });
    } else {
      embed.addFields({ name: 'Season', value: season, inline: true });
    }

    embed.addFields(
      { name: 'Colorway', value: colorway, inline: true },
      { name: 'Price', value: price, inline: true },
      { name: 'Release Date', value: date, inline: false },
      { name: 'Total Amount of Sales', value: totalSales, inline: true },
      { name: 'Sales Last 72 Hours', value: sales72, inline: true },
      { name: 'Total Sales', value: totalDollars, inline: true },
      { name: 'Average Sale Price', value: averageDeadstockPrice, inline: true },
      { name: 'Lowest Asks', value: 'Average: ' + averageLowestPrice + '```' + lowestPrice + '```' },
      {
        name: 'Highest Offers',
        value: 'Average: ' + averageHighestOffer + '```' + highestOffer + '```',
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
