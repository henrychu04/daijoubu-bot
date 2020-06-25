const Discord = require('discord.js');

exports.run = async (client, message, args) => {
  const embed = new Discord.MessageEmbed()
    .setTitle('All Commands')
    .setColor(16777214)
    .addField('Shopify Variant Scraper', '!shopify <shopify link>')
    .addField('Fee Calculator for StockX, Goat, Stadium Goods', '!fee <amount>')
    .addField(
      'Sends latest Supreme drop info, current Supreme week, and the Supreme drop info for a specific week',
      '!droplist, !droplist num, !droplist <number>'
    );

  message.channel.send({ embed }).then(console.log(`${message} completed`));
};
