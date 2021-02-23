const fetch = require('node-fetch');
const encryption = require('../../scripts/encryption');

const Users = require('../../models/users');
const Listings = require('../../models/listings');
const Orders = require('../../models/orders');

module.exports = async (client, message, email, pw) => {
  try {
    const id = message.author.id;
    let loginRes = null;

    try {
      let form = new FormData();
      form.append('user[password]', email);
      form.append('user[login]', pw);

      loginRes = await fetch('https://www.goat.com/api/v1/users/sign_in', {
        method: 'POST',
        headers: {
          'user-agent': client.config.goatHeader,
        },
        body: form,
      }).then((res) => {
        console.log(res.status);
        return res.json();
      });
    } catch (err) {
      console.log(err + '\n');

      if (err.message == 'Invalid login') {
        await message.channel.send('```Unable to login to GOAT\nIncorrect email and / or password```');
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
        aliasEmail: '',
        aliasPW: '',
        aliasLogin: '',
        goatEmail: email,
        goatPW: encryption.encrypt(pw),
        goatLogin: encryption.encrypt(loginRes.authToken),
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
      if (encryption.decrypt(exist[0].goatPW) == pw) {
        await message.channel.send('```Unable to set new password\nPassword is the same```');
        return;
      }

      exist[0]
        .overwrite({
          goatPW: encryption.encrypt(pw),
        })
        .save()
        .then(console.log('Initial GOAT Login PW Successfully Updated\n'))
        .catch((err) => {
          throw new Error(err);
        });

      await message.channel.send('```GOAT Password Updated Successfully```');
    }

    console.log('!goat login completed\n');
  } catch (err) {
    console.log(err);

    message.channel.send('```Unexpected Error```');
  }
};
