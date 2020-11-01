const Discord = require('discord.js');

const Users = require('../models/users');

exports.run = async (client, message, args) => {
  try {
    const id = message.author.id;
    let user = await Users.find({ d_id: id });
    let webhook = null;

    if (user.length == 0) {
      throw new Error('Not logged in');
    } else {
      user = user[0];
      let split = user.webhook.split('/');
      let id = split[5];
      let token = split[6];

      webhook = new Discord.WebhookClient(id, token);
    }

    if (args.length != 1) {
      throw new Error('Incorrect format');
    }

    let input = args[0];

    if (input.toLowerCase() == 'test') {
      if (user.webhook.length == 0) {
        throw new Error('No webhook');
      }

      await webhook
        .send('```' + 'Test Success' + '```', {
          username: 'Webhook test',
          avatarURL: client.config.aliasPicture,
        })
        .then(console.log('!webhook test completed\n'))
        .catch((err) => {
          if (err.message == 'Unknown Webhook') {
            throw new Error('Unknown webhook');
          } else if (err.message == 'Invalid Webhook Token') {
            throw new Error('Invalid webhook token');
          } else {
            throw new Error(err);
          }
        });
    } else {
      await Users.updateOne({ _id: user._id }, { $set: { webhook: input } }, async (err) => {
        if (!err) {
          await message.channel.send('```Webhook successfully added```');
          console.log('New webhook successfully added\n');
        }
      }).catch((err) => {
        throw new Error(err);
      });
    }
  } catch (err) {
    console.log(err);

    if (err.message == 'Not logged in') {
      message.channel.send(
        '```Command not available\nPlease login via daijoubu DMS with the format:\n\t!login <email> <password>```'
      );
    } else if (err.message == 'Incorrect format') {
      message.channel.send('```Incorrect format\nEnter !webhook <webhook> to setup webhook```');
    } else if (err.message == 'No webhook') {
      message.channel.send(```Enter !webhook <webhook> to setup webhook```);
    } else if (err.message == 'Unknown webhook') {
      message.channel.send('```Unknown webhook```');
    } else if (err.message == 'Invalid webhook token') {
      message.channel.send('```Invalid Webhook Token```');
    } else {
      message.channel.send('```Unexpected error```');
    }
  }
};
