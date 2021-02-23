exports.run = async (client, message, args) => {
  message.channel
    .send({
      embed: {
        title: 'All Commands',
        color: 16777214,
        fields: [
          { name: 'Shopify Variant Scraper', value: '!shopify <shopify link>' },
          { name: 'Fee Calculator for StockX, GOAT, Stadium Goods', value: '!fee <amount>' },
          { name: 'Returns information of a specified StockX product', value: '!stockx <search parameters>' },
          {
            name: 'Returns information of a specified GOAT product',
            value: '!goat <search parameters>',
          },
          { name: 'Returns information from both StockX and GOAT', value: '!search <search parameters>' },
          { name: 'alias commands', value: '``!alias help`` for more options' },
        ],
      },
    })
    .then(console.log(`${message} completed\n`));
};
