exports.run = async (client, message, args) => {
  message.channel
    .send({
      embed: {
        title: 'All Commands',
        color: 16777214,
        fields: [
          { name: 'Shopify Variant Scraper', value: '!shopify <shopify link>' },
          { name: 'Fee Calculator for StockX, GOAT, Stadium Goods', value: '!fee <amount>' },
          {
            name: 'Sends latest Supreme drop info, current Supreme week, or the Supreme drop info for a specific week',
            value: '!droplist, !droplist num, !droplist <number>',
          },
          { name: 'Returns information and lowest asks of a StockX product', value: '!stockx <search parameters>' },
          {
            name: 'Returns information and lowest asks of a GOAT product. Able to edit listings for a given account.',
            value: '!goat <search parameters>',
          },
          { name: 'Returns information from StockX and GOAT', value: '!search <search parameters>' },
        ],
      },
    })
    .then(console.log(`${message} completed\n`));
};
