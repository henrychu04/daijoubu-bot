const fetch = require('node-fetch');
const FormData = require('form-data');
const config = require('../../config.json');

const Users = require('../../models/users');
const Listings = require('../../models/listings');
const Orders = require('../../models/orders');

module.exports = class Task {
  constructor(loginToken) {
    this.loginToken = loginToken;
  }

  async login(email, pw) {
    let form = new FormData();
    form.append('user[password]', email);
    form.append('user[login]', pw);

    let res = await fetch('https://www.goat.com/api/v1/users/sign_in', {
      method: 'POST',
      headers: {
        'user-agent': config.goatHeader,
      },
      body: form,
    }).then((res) => {
      console.log(res.status);
      return res.json();
    });

    this.loginToken = res.authToken;
  }
};
