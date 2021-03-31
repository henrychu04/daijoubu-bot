const fetch = require('node-fetch');
const encryption = require('../../scripts/encryption');

const Users = require('../../models/users');
const Listings = require('../../models/listings');
const Orders = require('../../models/orders');

module.exports = async (client, message, email, pw) => {
  const id = message.author.id;
  let loginRes = 0;
  let authRes = null;
  let count = 0;

  try {
    while (loginRes != 200) {
      authRes = await fetch('https://sell-api.goat.com/api/v1/unstable/users/login', {
        method: 'POST',
        headers: {
          'user-agent': client.config.aliasHeader,
        },
        body: `{"grantType":"password","username":"${email}","password":"${pw}"}`,
      }).then((res) => {
        loginRes = res.status;

        if (res.status != 200) {
          throw new Error('Invalid login');
        } else {
          return res.json();
        }
      });

      count++;

      if (count == client.config.maxRetries) {
        throw new Error('Max retries');
      }
    }
  } catch (err) {
    console.log(err + '\n');

    if (err.message == 'Invalid login') {
      await message.channel.send('```Unable to login to alias\nIncorrect email and / or password```');
      return;
    } else {
      await message.channel.send('```Unexpected Error```');
      return;
    }
  }

  let exist = await Users.find({ d_id: id });

  if (exist.length == 0) {
    const newLogin = new Users({
      d_id: id,
      aliasEmail: email,
      aliasPW: encryption.encrypt(pw),
      aliasLogin: encryption.encrypt(authRes.auth_token.access_token),
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

      await message.channel.send('```New Login Successfully Added```');

      await message.channel.send('```Webhook setup recommended\nEnter !webhook <webhook> to setup webhook```');
    } catch (err) {
      console.log(err + '\n');

      await message.channel.send('```Unexpected Error```');
      return;
    }
  } else {
    if (encryption.decrypt(exist[0].aliasPW) == pw) {
      await message.channel.send('```Unable to set new password\nPassword is the same```');
      return;
    }

    try {
      exist[0]
        .overwrite({
          aliasPW: encryption.encrypt(pw),
        })
        .save()
        .then(console.log('Initial alias Login PW Successfully Updated\n'))
        .catch((err) => {
          throw new Error(err);
        });

      await message.channel.send('```alias Password Updated Successfully```');
    } catch (err) {
      console.log(err + '\n');

      await message.channel.send('```Unexpected Error```');
      return;
    }
  }

  console.log('!alias login completed\n');
};
