const Discord = require('discord.js');

exports.run = async (client, message, args) => {
  if (args.length == 0) {
    return message.channel.send('```Command is missing parameters```');
  }

  let numTasks = args[0];
  let numProxies = args[1];

  if (numTasks.length != 0 && numProxies.length != 0 && !isNaN(numTasks) && !isNaN(numProxies)) {
    let delay1 = Math.round((numTasks * 3600) / numProxies);
    let delay2 = Math.round((numTasks * 4500) / numProxies);
    let delay3 = Math.round((numTasks * 5500) / numProxies);

    const embed1 = new Discord.MessageEmbed()
      .setColor(16777214)
      .setTitle(delay1)
      .setDescription(`Suggested delay for ${numTasks} tasks and ${numProxies} proxies based on a 3600 delay`);

    const embed2 = new Discord.MessageEmbed()
      .setColor(16777214)
      .setTitle(delay2)
      .setDescription(`Suggested delay for ${numTasks} tasks and ${numProxies} proxies based on a 4500 delay`);

    const embed3 = new Discord.MessageEmbed()
      .setColor(16777214)
      .setTitle(delay3)
      .setDescription(`Suggested delay for ${numTasks} tasks and ${numProxies} proxies based on a 5500 delay`);

    await message.channel.send(embed1);
    await message.channel.send(embed2);
    await message.channel.send(embed3).then(console.log(`${message.content} completed\n`));
  } else {
    return message.channel.send('```Incorrect Format\n!delay <number of tasks> <number of proxies>```');
  }
};
