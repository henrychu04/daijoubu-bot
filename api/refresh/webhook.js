const Discord = require('discord.js');

module.exports = async (client, user, data) => {
  let { title, body } = data;

  let split = user.webhook.split('/');
  let id = split[5];
  let token = split[6];
  let webhook = new Discord.WebhookClient(id, token);

  let success = false;
  let count = 0;

  while (!success) {
    await webhook
      .send(body, {
        username: title,
        avatarURL: client.config.aliasPicture,
      })
      .then(() => {
        success = true;
        console.log(`User: ${user.d_id}\nSuccessfully sent webhook notification\n`);
      })
      .catch((err) => {
        if (err.message == 'Unknown Webhook') {
          throw new Error('Unknown webhook');
        } else if (err.message == 'Invalid Webhook Token') {
          throw new Error('Invalid webhook token');
        } else {
          throw new Error(err);
        }
      });

    count++;

    if (count == client.config.maxRetries) {
      throw new Error('Max retries');
    }
  }
};
