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
        await message.channel.send({
          embed: {
            title: crnt.name,
            color: 16711680,
            fields: [
              { name: 'Description', value: crnt.description },
              { name: 'Price', value: crnt.price, inline: true },
              { name: 'Category', value: editCategory(crnt.category), inline: true },
            ],
            thumbnail: crnt.image,
            footer: `Supreme Week ${weekNum}`,
          },
        });

        await sleep(1000);

        numItems++;
      }

      message.channel
        .send({
          embed: {
            title: 'Number of items',
            color: 16711680,
            description: `${numItems} items`,
          },
        })
        .then(console.log(`${message} completed`));
    } else {
      message.channel
        .send({
          embed: {
            title: 'Droplist not out yet',
            color: 16711680,
            description: 'Stay tuned!',
          },
        })
        .then(console.log(`${message} completed`));
    }
  } else if (command == 'num') {
    message.channel
      .send({
        embed: {
          title: 'Latest Supreme Week',
          color: 16711680,
          description: `Week ${num}`,
        },
      })
      .then(console.log(`${message} completed`));
  } else if (!link) {
    message.channel
      .send({
        embed: {
          title: 'Week not available',
          color: 16711680,
          description: 'Enter a new week num',
        },
      })
      .then(console.log(`${message} completed`));
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
