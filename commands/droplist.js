const fetch = require('node-fetch');
const cheerio = require('cheerio');
const sendWebhook = require('./sendWebhook');
const config = require('../config.json');

exports.run = async (client, message, args) => {
  const domain = 'https://www.supremecommunity.com';

  let droplistPage = await fetch(
    domain + '/season/spring-summer2020/droplists/',
    { headers: config.headers }
  )
    .then((res) => {
      return res.text();
    })
    .catch((err) => console.log(err));

  const $1 = cheerio.load(droplistPage);

  const latestURL = $1(
    'div[class="col-xs-12 col-sm-12 col-md-10 box-list scapp-main-cont"]'
  )
    .find('div[class="col-sm-4 col-xs-12 app-lr-pad-2"]')
    .find('a')
    .attr('href');

  let doc = await fetch(domain + latestURL, { headers: config.headers })
    .then((res) => {
      return res.text();
    })
    .catch((err) => console.log(err));

  const $ = cheerio.load(doc);

  const pageItems = $('div[class="card card-2"]');

  if (pageItems.length > 0) {
    let items = [];

    pageItems.each((i, el) => {
      let prop = {};

      prop.name = $(el).find('h2').text();

      prop.price = $(el).find('.label-price').text().trim();

      const imageURL = $(el).find('img').attr('src');
      prop.image = 'https://www.supremecommunity.com' + imageURL;

      const description = $(el).find('img').attr('alt');
      prop.description = description.split(' - ')[1];

      const category = $(el).find('.category').text();
      prop.category = category;

      items.push(prop);
    });

    for (let crnt of items) {
      let droplist = {
        username: 'Latest Supreme Droplist',
        embeds: [
          {
            title: crnt.name,
            color: 16711680,
            fields: [
              {
                name: 'Description',
                value: crnt.description,
              },
              {
                name: 'Price',
                value: crnt.price,
                inline: true,
              },
              {
                name: 'Category',
                value: crnt.category,
                inline: true,
              },
            ],
            thumbnail: {
              url: crnt.image,
            },
          },
        ],
      };

      await sendWebhook(droplist);

      await sleep(1000);
    }
  } else {
    let droplist = {
      username: 'Latest Supreme Droplist',
      embeds: [
        {
          title: 'Droplist not out yet',
          color: 16711680,
          description: 'Stay tuned!',
        },
      ],
    };

    await sendWebhook(droplist);
  }

  console.log(`${message} completed`);
};
