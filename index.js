const fetch = require('node-fetch');
const AbortController = require('abort-controller');
const url = require('url');
const Money = require('js-money');
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
        .then((data) => {
          try {
            var vars = {
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

            var sizes = [];

            for (var i = 0; i < data['product']['options'].length; i++) {
              if (data['product']['options'][i]['name'] === 'Size') {
                sizes = data['product']['options'][i]['values'];
                break;
              }
            }

            for (var i = 0; i < sizes.length; i++) {
              vars['embeds'][0]['fields'][2][
                'value'
              ] += `${sizes[i]} - ${data['product']['variants'][i]['id']}\n`;
            }

            fetch(api, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(vars),
            }).then(console.log('Command completed'));
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

      var num = Money.fromDecimal(parseInt(message.content.slice(5)), 'USD');

      var StockXFee1 = num.multiply(0.09, Math.ceil);
      var StockXFee2 = num.multiply(0.03, Math.ceil);
      StockXFee1 = StockXFee1.add(StockXFee2);
      var StockXRevenue = num.subtract(StockXFee1, Math.ceil);

      var GoatFee1 = num.multiply(0.095, Math.ceil);
      GoatFee1 = GoatFee1.add(new Money(500, Money.USD));
      var GoatFee2 = num.subtract(GoatFee1, Math.ceil);
      GoatFee2 = GoatFee2.multiply(0.029, Math.ceil);
      GoatFee1 = GoatFee1.add(GoatFee2, Math.ceil);
      var GoatRevenue = num.subtract(GoatFee1, Math.ceil);

      var SGFee = num.multiply(0.2, Math.ceil);
      var SGRevenue = num.subtract(SGFee, Math.ceil);

      var fee = {
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

      fetch(api, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fee),
      }).then(console.log('Command completed'));
    }

    if (message.content.substring(0, 6) === '!delay') {
      try {
        console.log(`Command: ${message}`);

        var command = message.content.slice(7);
        var command_split = command.split(/\s+/);

        var task_num = command_split[0];
        var proxy_num = command_split[1];

        if (
          task_num.length != 0 &&
          proxy_num.length != 0 &&
          !isNaN(task_num) &&
          !isNaN(proxy_num)
        ) {
          var delay = Math.round((task_num * 3600) / proxy_num);

          message.channel.send(
            '```' +
              `Suggested delay for ${task_num} tasks and ${proxy_num} proxies: ${delay}` +
              '```'
          );

          console.log('Command completed');
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

    if (message.content === '!help') {
      console.log(`Command: ${message}`);

      var help = {
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
            ],
          },
        ],
      };

      fetch(api, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(help),
      }).then(console.log('Command completed'));
    }
  } catch (err) {
    console.log(err);
    if (err.message != 'Incorrect Format')
      message.channel.send('```' + 'Unexpected error' + '```');
  }
});
