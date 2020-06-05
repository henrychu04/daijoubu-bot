const sendWebhook = require('./sendWebhook');

exports.run = async (client, message, args) => {
  let help = {
    username: 'Commands',
    embeds: [
      {
        title: 'All Commands',
        color: 16777214,
        fields: [
          {
            name: 'Shopify Variant Scraper',
            value: '!shopify <shopify link>',
          },
          {
            name: 'Fee Calculator for StockX, Goat, Stadium Goods',
            value: '!fee <amount>',
          },
          {
            name: 'Delay Calculator based on 3600 delay',
            value: '!delay <number of tasks> <number of proxies>',
          },
          {
            name:
              'Sends latest Supreme drop info, current Supreme week, and the Supreme drop info for a specific week',
            value:
              '!droplist, !droplist latest, !droplist num, !droplist <number>',
          },
        ],
      },
    ],
  };

  await sendWebhook(help).then(console.log(`${message} completed`));
};
