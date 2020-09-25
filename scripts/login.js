const fetch = require('node-fetch');
const encryption = require('./encryption');
const config = require('../config.json');
require('dotenv').config();

const PW = process.env.PW;

const Login = require('../models/login');

module.exports = async function login() {
  try {
    await initialLogin();

    setInterval(loggingIn, 3600000);
  } catch (err) {
    console.log(err);
  }
};

async function initialLogin() {
  let goatRes = 0;

  while (goatRes != 200) {
    let loginRes = await fetch('https://sell-api.goat.com/api/v1/unstable/users/login', {
      method: 'POST',
      headers: {
        'user-agent': config.aliasHeader,
      },
      body: `{"grantType":"password","username":"henrychu04@outlook.com","password":"${PW}"}`,
    })
      .then((res) => {
        goatRes = res.status;
        return res.json();
      })
      .catch((err) => {
        throw new Error(err);
      });

    let loginToken = encryption.encrypt(loginRes.auth_token.access_token);

    let crntLogin = await Login.find();

    if (crntLogin.length != 0) {
      crntLogin[0]
        .overwrite({ login: loginToken })
        .save()
        .then(console.log('Initial GOAT Login Successfully Updated\n'))
        .catch((err) => {
          throw new Error(err);
        });
    } else {
      const login = new Login({
        login: loginToken,
      });

      login
        .save()
        .then(console.log('Initial GOAT Login Successfully Updated\n'))
        .catch((err) => {
          throw new Error(err);
        });
    }
  }
}

async function loggingIn() {
  let goatRes = 0;

  while (goatRes != 200) {
    let loginRes = await fetch('https://sell-api.goat.com/api/v1/unstable/users/login', {
      method: 'POST',
      headers: {
        'user-agent': config.aliasHeader,
      },
      body: `{"grantType":"password","username":"henrychu04@outlook.com","password":"${PW}"}`,
    })
      .then((res) => {
        goatRes = res.status;
        return res.json();
      })
      .catch((err) => {
        throw new Error(err);
      });

    let loginToken = encryption.encrypt(loginRes.auth_token.access_token);

    let crntLogins = await Login.find();

    crntLogins[0]
      .overwrite({ login: loginToken })
      .save()
      .catch((err) => {
        throw new Error(err);
      });
  }
}
