exports.run = async (client, message, args) => {
  try {
    let command = message.content.slice(7);

    if (command.length == 0) {
      throw new Error('Empty command');
    }

    let command_split = command.split(/\s+/);
    let task_num = command_split[0];
    let proxy_num = command_split[1];

    if (task_num.length != 0 && proxy_num.length != 0 && !isNaN(task_num) && !isNaN(proxy_num)) {
      let delay1 = Math.round((task_num * 3600) / proxy_num);
      let delay2 = Math.round((task_num * 4500) / proxy_num);

      const embed1 = new Discord.MessageEmbed()
        .setTitle(delay1)
        .setDescription(`Suggested delay for ${task_num} tasks and ${proxy_num} proxies based on a 3600 delay`);

      const embed2 = new Discord.MessageEmbed()
        .setTitle(delay2)
        .setDescription(`Suggested delay for ${task_num} tasks and ${proxy_num} proxies based on a 4500 delay`);

      await message.channel.send(embed1).catch((err) => {
        console.log(err);
        throw new Error('Unable to send embed1');
      });

      await message.channel
        .send(embed2)
        .then(console.log(`${message} completed`))
        .catch((err) => {
          console.log(err);
          throw new Error('Unable to send embed2');
        });
    } else {
      throw new Error('Incorrect format');
    }
  } catch (err) {
    console.log(err);

    if (err.message == 'Empty command') {
      message.channel.send('```Command is missing valid entries```');
    } else if (err.message == 'Incorrect format') {
      message.channel.send('```Incorrect Format\n!delay <number of tasks> <number of proxies>```');
    } else if (err.message == 'Unable to send embed') {
      message.channel.send('```Unexpected Error```');
    } else {
      message.channel.send('```Unexpected Error```');
    }
  }
};
