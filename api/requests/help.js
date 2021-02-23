const Discord = require('discord.js');

module.exports = () => {
  const helpEmbed = new Discord.MessageEmbed()
    .setColor('#7756fe')
    .setTitle('alias Help')
    .setDescription(
      'All the alias account commands\n\nAn alias account is required to use the commands. To gain access to an alias account, you must have a GOAT account with a seller score of 150 or greater. Each command will only work for the bound alias account. It is not possible to control the listings for another alias account.\n\n[Click here for more info](https://apps.apple.com/us/app/alias-sell-sneakers-apparel/id1467090341)\n\nIf no alias account is bound to the Discord account, DM \n``!alias login <email> <password>`` to <@712771907719528478> to login.'
    )
    .addFields(
      { name: `!alias login <email> <password>`, value: `Login to alias` },
      { name: `!alias <search parameters>`, value: `Returns information of a specified product` },
      { name: '!alias consign <search parameters>', value: 'Checks the consignment prices of a specified product' },
      { name: `!alias list <search parameters>`, value: `Lists an item` },
      { name: '!alias listings', value: 'Returns all current listings' },
      { name: '!alias check', value: 'Checks if all listings match their current lowest ask' },
      { name: '!alias match', value: 'Matches specified listings to their current lowest ask' },
      { name: '!alias edit', value: 'Edits the asking price for specified listings' },
      { name: '!alias delete', value: 'Deletes specified listings' },
      { name: '!alias orders', value: 'Returns all current orders' },
      { name: '!alias confirm', value: 'Confirms specified orders' },
      { name: '!alias generate', value: 'Generates a shipping label for specified orders' },
      { name: '!alias cancel', value: 'Cancels specified orders' },
      { name: '!alias earnings', value: 'Checks available earnings' },
      { name: '!alias cashout', value: 'Cash out available earnings' },
      { name: '!alias me', value: 'Information about your account' },
      { name: '!alias settings', value: 'Current settings for your account' },
      { name: '!alias settings edit', value: 'Edit settings for your account' }
    );

  return helpEmbed;
};
