const fetch = require('node-fetch');
const encryption = require('./encryption');
const config = require('../config.json');
const sleep = require('./sleep.js');

const Users = require('../models/users');

const maxRetries = 3;
const oneHour = 3600000;

module.exports = function login() {
  try {
    loggingIn();
  } catch (err) {
    console.log(err);
  }

  console.log('All initial alias logins successfully updated');
  console.log('Maintaining logins ...');
};

async function loggingIn() {
  while (1) {
    let users = await Users.find();

    for (let i = 0; i < users.length; i++) {
      if (users[i].aliasEmail.length != 0) {
        aliasLogin(users[i]);
      }

      if (users[i].goatEmail.length != 0) {
        goatLogin(users[i]);
      }
    }

    await sleep(oneHour);
  }
}

async function aliasLogin(user) {
  let aliasRes = 0;
  let count = 0;
  let authRes = '';

  while (aliasRes != 200) {
    try {
      authRes = await fetch('https://sell-api.goat.com/api/v1/unstable/users/login', {
        method: 'POST',
        headers: {
          'user-agent': config.aliasHeader,
        },
        body: `{"grantType":"password","username":"${user.aliasEmail}","password":"${encryption.decrypt(
          user.aliasPW
        )}"}`,
      }).then((res, err) => {
        aliasRes = res.status;

        if (res.status == 200) {
          return res.json();
        } else if (res.status == 401) {
          throw new Error('Login expired');
        } else {
          console.log('Res is', res.status);
          console.trace();

          if (err) {
            throw new Error(err);
          }
        }
      });

      count++;

      if (count == maxRetries) {
        throw new Error('Max retries');
      }
    } catch (err) {
      console.log(err);
    }
  }

  let loginToken = encryption.encrypt(authRes.auth_token.access_token);

  await Users.updateOne({ _id: user._id }, { aliasLogin: loginToken }).catch((err) => {
    console.log(err);
    console.log();
  });
}

async function goatLogin(user) {
  let form = new FormData();
  form.append('user[password]', user.goatPW);
  form.append('user[login]', user.goatEmail);

  let goatRes = 0;
  let authRes = null;
  let count = 0;

  while (goatRes != 200) {
    try {
      authRes = await fetch('https://www.goat.com/api/v1/users/sign_in', {
        method: 'POST',
        headers: {
          'user-agent': config.goatHeader,
        },
        body: form,
      }).then((res, err) => {
        goatRes = res.status;

        if (res.status == 200) {
          return res.json();
        } else if (res.status == 401) {
          throw new Error('Login expired');
        } else {
          console.log('Res is', res.status);
          console.trace();

          if (err) {
            throw new Error(err);
          }
        }
      });

      count++;

      if (count == maxRetries) {
        throw new Error('Max retries');
      }
    } catch (err) {
      console.log(err);
    }
  }

  let loginToken = encryption.encrypt(authRes.auth_token.access_token);

  await Users.updateOne({ _id: user._id }, { goatLogin: loginToken }).catch((err) => {
    console.log(err);
    console.log();
  });
}
