const sendWebhook = require('./sendWebhook');

exports.run = async (client, message, args) => {
  try {
    let command = message.content.slice(7);
    let command_split = command.split(/\s+/);
    let task_num = command_split[0];
    let proxy_num = command_split[1];

    if (
      task_num.length != 0 &&
      proxy_num.length != 0 &&
      !isNaN(task_num) &&
      !isNaN(proxy_num)
    ) {
      let delay = Math.round((task_num * 3600) / proxy_num);
      let delayEmbed = {
        username: 'Delay Calculator',
        embeds: [
          {
            title: delay,
            color: 16777214,
            description: `Suggested delay for ${task_num} tasks and ${proxy_num} proxies`,
          },
        ],
      };

      sendWebhook(delayEmbed).then(console.log(`${message} completed`));
    } else {
      throw new err();
    }
  } catch (err) {
    message.channel.send(
      '```' +
        'Incorrect Format\n!delay <number of tasks> <number of proxies>' +
        '```'
    );
    throw new Error('Incorrect Format');
  }
};
