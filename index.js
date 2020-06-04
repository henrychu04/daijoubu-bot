const fetch = require('node-fetch');
const AbortController = require('abort-controller');
const url = require('url');
const Money = require('js-money');
const cheerio = require('cheerio');
const Discord = require('discord.js');
const client = new Discord.Client();
const api = process.env.BOT_TOOLS;

const headers = {
  headers: {
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4136',
  },
};

client.login(process.env.BOT_TOKEN);

client.once('ready', () => {
  console.log('Ready!');
});

client.on('message', async (message) => {
  try {
    if (message.content.substring(0, 8) === '!shopify') {
      console.log(`Command: ${message}`);

      let controller = new AbortController();
      setTimeout(() => controller.abort(), 1000);

      function timeoutPromise(ms, promise) {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('timeout'));
          }, ms);
          promise.then(
            (res) => {
              clearTimeout(timeoutId);
              resolve(res);
            },
            (err) => {
              clearTimeout(timeoutId);
              reject(err);
            }
          );
        });
      }

      let link = message.content.slice(9);
      let domain = url.parse(link).host;

      await timeoutPromise(1000, fetch(`${link}.json`, headers))
        .then((response) => response.json())
        .then(async (data) => {
          try {
            let vars = {
              username: 'Shopify Variants',
              embeds: [
                {
                  title: data['product']['title'],
                  url: link,
                  color: 16777214,
                  fields: [
                    {
                      name: 'Price',
                      value: '$' + data['product']['variants'][0]['price'],
                      inline: true,
                    },
                    {
                      name: 'Site',
                      value: domain,
                      inline: true,
                    },
                    {
                      name: 'Variants',
                      value: '',
                    },
                  ],
                  thumbnail: {
                    url: data['product']['image']['src'],
                  },
                },
              ],
            };

            let sizes = [];

            for (let i = 0; i < data['product']['options'].length; i++) {
              if (data['product']['options'][i]['name'] === 'Size') {
                sizes = data['product']['options'][i]['values'];
                break;
              }
            }

            for (let i = 0; i < sizes.length; i++) {
              vars['embeds'][0]['fields'][2][
                'value'
              ] += `${sizes[i]} - ${data['product']['variants'][i]['id']}\n`;
            }

            await sendWebhook(vars).then(console.log(`${message} completed`));
          } catch (err) {
            console.log(err);
            throw err;
          }
        })
        .catch((err) => {
          console.log(err);

          if (err.message.includes('invalid json response body')) {
            message.channel.send('```' + 'Error retrieving variants' + '```');
          } else if (err.message === 'timeout') {
            message.channel.send('```' + 'Site must be Shopify' + '```');
          }
        });
    }

    if (message.content.substring(0, 4) === '!fee') {
      console.log(`Command: ${message}`);

      let num = Money.fromDecimal(parseInt(message.content.slice(5)), 'USD');

      let StockXFee1 = num.multiply(0.09, Math.ceil);
      let StockXFee2 = num.multiply(0.03, Math.ceil);
      StockXFee1 = StockXFee1.add(StockXFee2);
      let StockXRevenue = num.subtract(StockXFee1, Math.ceil);

      let GoatFee1 = num.multiply(0.095, Math.ceil);
      GoatFee1 = GoatFee1.add(new Money(500, Money.USD));
      let GoatFee2 = num.subtract(GoatFee1, Math.ceil);
      GoatFee2 = GoatFee2.multiply(0.029, Math.ceil);
      GoatFee1 = GoatFee1.add(GoatFee2, Math.ceil);
      let GoatRevenue = num.subtract(GoatFee1, Math.ceil);

      let SGFee = num.multiply(0.2, Math.ceil);
      let SGRevenue = num.subtract(SGFee, Math.ceil);

      let fee = {
        username: 'Fee Calculator',
        embeds: [
          {
            title: 'Fee for $' + num,
            color: 16777214,
            fields: [
              {
                name: 'Marketplace',
                value: 'StockX',
                inline: true,
              },
              {
                name: 'Fee',
                value: '$' + StockXFee1,
                inline: true,
              },
              {
                name: 'Revenue',
                value: '$' + StockXRevenue,
                inline: true,
              },
              {
                name: 'Marketplace',
                value: 'Goat',
                inline: true,
              },
              {
                name: 'Fee',
                value: '$' + GoatFee1,
                inline: true,
              },
              {
                name: 'Revenue',
                value: '$' + GoatRevenue,
                inline: true,
              },
              {
                name: 'Marketplace',
                value: 'Stadium Goods',
                inline: true,
              },
              {
                name: 'Fee',
                value: '$' + SGFee,
                inline: true,
              },
              {
                name: 'Revenue',
                value: '$' + SGRevenue,
                inline: true,
              },
            ],
          },
        ],
      };

      await sendWebhook(fee).then(console.log(`${message} completed`));
    }

    if (message.content.substring(0, 6) === '!delay') {
      try {
        console.log(`Command: ${message}`);

        let command = message.content.slice(7);
        let command_split = command.split(/\s+/);

        let task_num = command_split[0];
        let proxy_num = command_split[1];

        if (
          task_num.length != 0 &&
          proxy_num.length != 0 &&
          !isNaN(task_num) &&
          !isNaN(proxy_num)
        ) {
          let delay = Math.round((task_num * 3600) / proxy_num);

          let delayEmbed = {
            username: 'Delay Calculator',
            embeds: [
              {
                title: `Suggested delay for ${task_num} tasks and ${proxy_num} proxies:`,
                color: 16777214,
                description: delay,
              },
            ],
          };

          await sendWebhook(delayEmbed).then(
            console.log(`${message} completed`)
          );
        } else {
          throw new err();
        }
      } catch (err) {
        message.channel.send(
          '```' +
            'Incorrect Format\n!delay <number of tasks> <number of proxies>' +
            '```'
        );
        throw new Error('Incorrect Format');
      }
    }

    if (message.content.substring(0, 9) === '!droplist') {
      console.log(`Command: ${message}`);

      const domain = 'https://www.supremecommunity.com';

      let droplistPage = await fetch(
        domain + '/season/spring-summer2020/droplists/',
        { headers: headers }
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

      let doc = await fetch(domain + latestURL, { headers: headers })
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
    }

    if (message.content === '!help') {
      console.log(`Command: ${message}`);

      let help = {
        username: 'Commands',
        embeds: [
          {
            title: 'All Commands',
            color: 16777214,
            fields: [
              {
                name: '!shopify <shopify link>',
                value: 'Shopify Variant Scraper',
              },
              {
                name: '!fee <amount>',
                value: 'Fee Calculator for StockX, Goat, Stadium Goods',
              },
              {
                name: '!delay <number of tasks> <number of proxies>',
                value: 'Delay Calculator based on 3600 delay',
              },
              {
                name: '!droplist',
                value: 'Sends latest Supreme drop info',
              },
            ],
          },
        ],
      };

      await sendWebhook(help).then(console.log(`${message} completed`));
    }
  } catch (err) {
    console.log(err);
    if (err.message != 'Incorrect Format')
      message.channel.send('```' + 'Unexpected error' + '```');
  }
});

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function sendWebhook(embeded) {
  await fetch(api, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(embeded),
  }).catch((err) => {
    console.log(err);
  });
}
