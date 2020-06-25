const fetch = require('node-fetch');
const cheerio = require('cheerio');
const Discord = require('discord.js');
const sendWebhook = require('./sendWebhook');
const sleep = require('./sleep');

exports.run = async (client, message, args) => {
  let command = message.content.slice(10);

  const domain = 'https://www.supremecommunity.com';

  let droplistPage = await fetch(domain + '/season/spring-summer2020/droplists/', {
    headers: client.config.headers,
  })
    .then((res) => {
      return res.text();
    })
    .catch((err) => console.log(err));

  const $1 = cheerio.load(droplistPage);

  let link = undefined;
  let num = 0;

  if (!isNaN(command)) {
    let weeks = $1('div[class="col-xs-12 col-sm-12 col-md-10 box-list scapp-main-cont"]').find(
      'div[class="col-sm-4 col-xs-12 app-lr-pad-2"]'
    );

    weeks.each((i, el) => {
      let weekNum = $1(el).find('.droplist-overview-title').text();

      if (weekNum.slice(5) == command) {
        link = $1(el).find('a').attr('href');
      }
    });
  } else if (command == 'num') {
    let weeks = $1('div[class="col-xs-12 col-sm-12 col-md-10 box-list scapp-main-cont"]').find(
      'div[class="col-sm-4 col-xs-12 app-lr-pad-2"]'
    );

    weeks.each((i, el) => {
      let weekNum = $1(el).find('.droplist-overview-title').text().split(/\s+/)[1];

      if (parseInt(weekNum) > num) {
        num = weekNum;
      }
    });
  } else if (!command) {
    link = $1('div[class="col-xs-12 col-sm-12 col-md-10 box-list scapp-main-cont"]')
      .find('div[class="col-sm-4 col-xs-12 app-lr-pad-2"]')
      .find('a')
      .attr('href');
  }

  if (link) {
    let doc = await fetch(domain + link, { headers: client.config.headers })
      .then((res) => {
        return res.text();
      })
      .catch((err) => console.log(err));

    const $ = cheerio.load(doc);

    const weekNum = $('p[class="lead hidden-xs"]')
      .text()
      .replace(/[^0-9]/g, '');

    const pageItems = $('div[class="card card-2"]');

    if (pageItems.length > 0) {
      let items = [];

      pageItems.each((i, el) => {
        let prop = {};

        prop.name = $(el).find('h2').text();

        if ($(el).find('p[class="priceusd hidden"]').text() == 0) {
          prop.price = 'Currently no price';
        } else {
          prop.price = $(el).find('.label-price').text().trim();
        }

        const imageURL = $(el).find('img').attr('src');
        prop.image = domain + imageURL;

        let description = $(el).find('img').attr('alt');
        description = description.split(' - ')[1];
        description = description.split('<')[0].trim();

        if (!description) {
          prop.description = 'Currently no description';
        } else {
          prop.description = description;
        }

        prop.category = $(el).find('.category').text();

        items.push(prop);
      });

      let numItems = 0;

      for (let crnt of items) {
        const embed = new Discord.MessageEmbed()
          .setTitle(crnt.name)
          .setColor(16711680)
          .addField('Description', crnt.description)
          .addField('Price', crnt.price, true)
          .addField('Category', editCategory(crnt.category), true)
          .setThumbnail(crnt.image)
          .setFooter(`Supreme Week ${weekNum}`);

        await message.channel.send({ embed });

        await sleep(1000);

        numItems++;
      }

      const embed = new Discord.MessageEmbed()
        .setTitle('Number of items')
        .setColor(16711680)
        .setDescription(`${numItems} items`);

      message.channel.send({ embed }).then(console.log(`${message} completed`));
    } else {
      const embed = new Discord.MessageEmbed()
        .setTitle('Droplist not out yet')
        .setColor(16711680)
        .setDescription('Stay tuned!');

      message.channel.send({ embed }).then(console.log(`${message} completed`));
    }
  } else if (command == 'num') {
    const embed = new Discord.MessageEmbed()
      .setTitle('Latest Supreme Week')
      .setColor(16711680)
      .setDescription(`Week ${num}`);

    message.channel.send({ embed }).then(console.log(`${message} completed`));
  } else if (!link) {
    const embed = new Discord.MessageEmbed()
      .setTitle('Week not available')
      .setColor(16711680)
      .setDescription('Enter a new week num');

    message.channel.send({ embed }).then(console.log(`${message} completed`));
  }
};

function editCategory(category) {
  switch (category) {
    case 'jackets':
      return 'Jackets';
    case 'shirts':
      return 'Shirts';
    case 't-shirts':
      return 'T-Shirts';
    case 'tops-sweaters':
      return 'Tops/Sweaters';
    case 'sweatshirts':
      return 'Sweatshirts';
    case 'pants':
      return 'Pants';
    case 'shorts':
      return 'Shorts';
    case 'hats':
      return 'Hats';
    case 'bags':
      return 'Bags';
    case 'accessories':
      return 'Accessories';
    case 'shoes':
      return 'Shoes';
    case 'skate':
      return 'Skate';
    default:
      return 'Category not available';
  }
}
