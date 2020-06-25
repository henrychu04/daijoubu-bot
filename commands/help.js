const Discord = require('discord.js');

exports.run = async (client, message, args) => {
  const embed = new Discord.MessageEmbed()
    .setTitle('All Commands')
    .setColor(16777214)
    .addField(
      { name: 'Shopify Variant Scraper', value: '!shopify <shopify link>' },
      { name: 'Fee Calculator for StockX, Goat, Stadium Goods', value: '!fee <amount>' },
      {
        name:
          'Sends latest Supreme drop info, current Supreme week, and the Supreme drop info for a specific week',
        value: '!droplist, !droplist num, !droplist <number>',
      }
    );

  message.channel.send({ embed }).then(console.log(`${message} completed`));
};
