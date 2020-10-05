const fetch = require('node-fetch');
const encryption = require('../scripts/encryption');

const Login = require('../models/logins');

exports.run = async (client, message, args) => {
  try {
    if (message.channel.type == 'dm') {
      if (args.length == 2) {
        const id = message.author.id;
        const email = args[0];
        const pw = args[1];

        let loginRes = await fetch('https://sell-api.goat.com/api/v1/unstable/users/login', {
          method: 'POST',
          headers: {
            'user-agent': client.config.aliasHeader,
          },
          body: `{"grantType":"password","username":"${email}","password":"${pw}"}`,
        }).then((res) => {
          if (res.status != 200) {
            throw new Error('Invalid login');
          } else {
            return res.json();
          }
        });

        let exist = await Login.find({ d_id: id });

        if (exist.length == 0) {
          const newLogin = new Login({
            d_id: id,
            email: email,
            pw: encryption.encrypt(pw),
            login: encryption.encrypt(loginRes.auth_token.access_token),
          });

          await newLogin
            .save()
            .then(console.log('New login successfully added\n'))
            .catch((err) => {
              throw new Error(err);
            });

          message.channel.send('```New Login Successfully Added```');
        } else {
          if (encryption.decrypt(exist[0].pw) == pw) {
            throw new Error('Same pw');
          }

          exist[0]
            .overwrite({
              pw: encryption.encrypt(pw),
            })
            .save()
            .then(console.log('Initial alias Login Successfully Updated\n'))
            .catch((err) => {
              throw new Error(err);
            });

          message.channel.send('```alias Password Updated Successfully```');
        }
      } else {
        message.channel.send('```Incorrect format\nCorrect format is !login <email> <password>```');
      }
    }
  } catch (err) {
    console.log(err);

    if (err.message == 'Invalid login') {
      message.channel.send('```Unable to login to alias\nIncorrect email and / or password```');
    } else if (err.message == 'Same pw') {
      message.channel.send('```Unable to set new password\nPassword is the same```');
    } else {
      message.channel.send('```Unexpected Error```');
    }
  }
};
