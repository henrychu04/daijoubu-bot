const fetch = require('node-fetch');
const encryption = require('./encryption');
const config = require('../config.json');

const Users = require('../models/users');

const maxRetries = 3;

function maintainLogin() {
  try {
    console.log('Maintaining Logins ...');
    setInterval(loggingIn, 3600000);
  } catch (err) {
    console.log(err);
  }
}

async function loggingIn() {
  return new Promise(async (resolve) => {
    let users = await Users.find();
    let i = 0;

    for (; i < users.length; i++) {
      let goatRes = 0;
      let count = 0;

      while (goatRes != 200) {
        let loginRes = await fetch('https://sell-api.goat.com/api/v1/unstable/users/login', {
          method: 'POST',
          headers: {
            'user-agent': config.aliasHeader,
          },
          body: `{"grantType":"password","username":"${users[i].email}","password":"${encryption.decrypt(
            users[i].pw
          )}"}`,
        }).then((res) => {
          goatRes = res.status;
          return res.json();
        });

        let loginToken = encryption.encrypt(loginRes.auth_token.access_token);

        await Users.updateOne({ _id: users[i]._id }, { login: loginToken }).catch((err) => {
          throw new Error(err);
        });

        count++;

        if (count == maxRetries) {
          throw new Error('Invalid login');
        }
      }
    }

    if (i == users.length) {
      resolve();
    }
  });
}

module.exports = { loggingIn, maintainLogin };
