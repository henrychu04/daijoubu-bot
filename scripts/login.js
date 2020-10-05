const fetch = require('node-fetch');
const encryption = require('./encryption');
const config = require('../config.json');
require('dotenv').config();

const PW = process.env.PW;

const Login = require('../models/logins');

module.exports = async function login() {
  try {
    await loggingIn();

    console.log('All Initial Logins Successfully Updated\n');

    setInterval(loggingIn, 3600000);
  } catch (err) {
    console.log(err);
  }
};

async function loggingIn() {
  let logins = await Login.find();

  for (let i = 0; i < logins.length; i++) {
    let goatRes = 0;

    while (goatRes != 200) {
      let loginRes = await fetch('https://sell-api.goat.com/api/v1/unstable/users/login', {
        method: 'POST',
        headers: {
          'user-agent': config.aliasHeader,
        },
        body: `{"grantType":"password","username":"${encryption.decrypt(
          logins[i].email
        )}","password":"${encryption.decrypt(logins[i].pw)}"}`,
      }).then((res) => {
        goatRes = res.status;
        return res.json();
      });

      let loginToken = encryption.encrypt(loginRes.auth_token.access_token);

      await Login.updateOne({ _id: logins[i]._id }, { login: loginToken }).catch((err) => {
        throw new Error(err);
      });
    }
  }
}
