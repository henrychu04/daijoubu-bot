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
};
