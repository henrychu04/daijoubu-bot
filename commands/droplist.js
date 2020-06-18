const fetch = require('node-fetch');
const cheerio = require('cheerio');
const sendWebhook = require('./sendWebhook');
const sleep = require('./sleep');
const config = require('../config.json');

exports.run = async (client, message, args) => {
  let command = message.content.slice(10);

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

  let link = undefined;
  let num = 0;

  if (!isNaN(command)) {
    let weeks = $1(
      'div[class="col-xs-12 col-sm-12 col-md-10 box-list scapp-main-cont"]'
    ).find('div[class="col-sm-4 col-xs-12 app-lr-pad-2"]');

    weeks.each((i, el) => {
      let weekNum = $1(el).find('.droplist-overview-title').text();

      if (weekNum.slice(5) == command) {
        link = $1(el).find('a').attr('href');
      }
    });
  } else if (command == 'num') {
    let weeks = $1(
      'div[class="col-xs-12 col-sm-12 col-md-10 box-list scapp-main-cont"]'
    ).find('div[class="col-sm-4 col-xs-12 app-lr-pad-2"]');

    weeks.each((i, el) => {
      let weekNum = $1(el)
        .find('.droplist-overview-title')
        .text()
        .split(/\s+/)[1];

      if (parseInt(weekNum) > num) {
        num = weekNum;
      }
    });
  } else if (!command || command == 'latest') {
    link = $1(
      'div[class="col-xs-12 col-sm-12 col-md-10 box-list scapp-main-cont"]'
    )
      .find('div[class="col-sm-4 col-xs-12 app-lr-pad-2"]')
      .find('a')
      .attr('href');
  }

  if (link) {
    let doc = await fetch(domain + link, { headers: config.headers })
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
                  value: editCategory(crnt.category),
                  inline: true,
                },
              ],
              thumbnail: {
                url: crnt.image,
              },
              footer: {
                text: 'Supreme Week ' + weekNum,
              },
            },
          ],
        };

        await sendWebhook(droplist);

        await sleep(1000);

        numItems++;
      }

      let numItemsWebhook = {
        username: 'Latest Supreme Droplist',
        embeds: [
          {
            title: 'Number of items',
            color: 16711680,
            description: numItems + ' items',
          },
        ],
      };

      await sendWebhook(numItemsWebhook).then(
        console.log(`${message} completed`)
      );
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

      await sendWebhook(droplist).then(console.log(`${message} completed`));
    }
  } else if (command == 'num') {
    let numWeeks = {
      username: 'Supreme Week',
      embeds: [
        {
          title: 'Latest Supreme Week',
          color: 16711680,
          description: `Week ${num}`,
        },
      ],
    };

    await sendWebhook(numWeeks).then(console.log(`${message} completed`));
  } else if (!link) {
    let weekNotFound = {
      username: 'Supreme Week',
      embeds: [
        {
          title: 'Week not available',
          color: 16711680,
          description: `Enter a new week num`,
        },
      ],
    };

    await sendWebhook(weekNotFound).then(console.log(`${message} completed`));
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
      break;
  }
}
