const fs = require('fs');
const fetch = require('node-fetch');

module.exports = async function login() {
  return new Promise(async (resolve) => {
    while (true) {
      let edited = false;

      let loginRes = await fetch('https://sell-api.goat.com/api/v1/unstable/users/login', {
        method: 'POST',
        headers: {
          'user-agent': 'alias/1.1.1 (iPhone; iOS 14.0; Scale/2.00)',
        },
        body: '{"grantType":"password","username":"henrychu04@outlook.com","password":"#Eu2u5sOOx7v"}',
      }).then((res) => {
        return res.json();
      });

      let loginToken = loginRes.auth_token.access_token;

      fs.readFile('config.json', (err, data) => {
        if (err) throw err;
        let file = JSON.parse(data);
        file.goatLogin = loginToken;

        let newFile = JSON.stringify(file, null, 2);

        fs.writeFile('config.json', newFile, (err) => {
          if (err) throw err;
          edited = true;
        });
      });

      if (edited) {
        resolve();
        break;
      }
    }
  });
};
