const fetch = require('node-fetch');
const encryption = require('./encryption');
const config = require('../config.json');

const Users = require('../models/users');

module.exports = async function login() {
  try {
    await loggingIn();

    console.log('All Initial alias Logins Successfully Updated\n');

    setInterval(loggingIn, 3600000);
  } catch (err) {
    console.log(err);
  }
};

async function loggingIn() {
  let users = await Users.find();

  for (let i = 0; i < users.length; i++) {
    let goatRes = 0;

    while (goatRes != 200) {
      let loginRes = await fetch('https://sell-api.goat.com/api/v1/unstable/users/login', {
        method: 'POST',
        headers: {
          'user-agent': config.aliasHeader,
        },
        body: `{"grantType":"password","username":"${
          users[i].email
        }","password":"${encryption.decrypt(users[i].pw)}"}`,
      }).then((res) => {
        goatRes = res.status;
        return res.json();
      });

      let loginToken = encryption.encrypt(loginRes.auth_token.access_token);

      await Users.updateOne({ _id: users[i]._id }, { login: loginToken }).catch((err) => {
        throw new Error(err);
      });
    }
  }
}
