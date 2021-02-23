const Discord = require('discord.js');

const Users = require('../models/users.js');

exports.run = async (client, message, args) => {
  if (args.length != 1) {
    console.log();
    return message.channel.send('```Incorrect format\nEnter !webhook <webhook> to setup webhook```');
  }

  const id = message.author.id;
  let users = await Users.find({ d_id: id });
  let user = null;
  let webhook = null;

  if (users.length == 0) {
    const newLogin = new Users({
      d_id: id,
      aliasEmail: '',
      aliasPW: '',
      aliasLogin: '',
      goatEmail: '',
      goatPW: '',
      goatLogin: '',
      webhook: '',
      aliasCashoutAmount: 0,
      goatCashoutAmount: 0,
      settings: {
        orderRefresh: 'daily',
        adjustListing: 'manual',
        maxAdjust: 5,
        manualNotif: true,
      },
    });

    const newListings = new Listings({
      d_id: id,
      aliasListings: [],
      goatListings: [],
    });

    const newOrders = new Orders({
      d_id: id,
      aliasOrders: [],
      goatOrders: [],
    });

    try {
      await newLogin
        .save()
        .then(console.log('New login successfully added'))
        .catch((err) => {
          throw new Error(err);
        });

      await newListings
        .save()
        .then(console.log('New listings successfully added'))
        .catch((err) => {
          throw new Error(err);
        });

      await newOrders
        .save()
        .then(console.log('New orders successfully added'))
        .catch((err) => {
          throw new Error(err);
        });
    } catch (err) {
      console.log(err);
      console.log();

      return message.channel.send('```Unexpected Error```');
    }
  } else {
    user = users[0];
  }

  try {
    let input = args[0];

    if (input.toLowerCase() == 'test') {
      if (user.webhook.length == 0) {
        console.log();
        return message.channel.send(```Enter !webhook <webhook> to setup webhook```);
      }

      let split = user.webhook.split('/');
      let id = split[5];
      let token = split[6];

      webhook = new Discord.WebhookClient(id, token);

      await webhook
        .send('```Test Success```', {
          username: 'Webhook test',
          avatarURL: client.config.aliasPicture,
        })
        .then(console.log('!webhook test completed\n'))
        .catch(() => {
          message.channel.send('```Invalid webhook```');
          console.log('Invalid webhook\n');
        });
    } else if (input.toLowerCase() == 'remove') {
      await Users.updateOne({ _id: user._id }, { $set: { webhook: '' } }, (err) => {
        if (!err) {
          message.channel.send('```Webhook successfully removed```');
          console.log('Webhook successfully removed\n');
        }
      }).catch((err) => {
        throw new Error(err);
      });
    } else {
      await Users.updateOne({ _id: user._id }, { $set: { webhook: input } }, (err) => {
        if (!err) {
          message.channel.send('```Webhook successfully added```');
          console.log('New webhook successfully added\n');
        }
      }).catch((err) => {
        throw new Error(err);
      });
    }
  } catch (err) {
    console.log(err);
    console.log();

    return message.channel.send('```Unexpected error```');
  }
};
