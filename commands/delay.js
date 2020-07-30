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
      let delay = Math.round((task_num * 3600) / proxy_num);

      message.channel
        .send({
          embed: {
            title: delay,
            color: 16777214,
            description: `Suggested delay for ${task_num} tasks and ${proxy_num} proxies`,
          },
        })
        .then(console.log(`${message} completed`))
        .catch((err) => {
          console.log(err);
          throw new Error('Unable to send embed');
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
