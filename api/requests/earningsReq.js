const fetch = require('node-fetch');

module.exports = async (client, loginToken) => {
  let earningsRes = 0;
  let earnings = null;
  let count = 0;

  while (earningsRes != 200) {
    earnings = await fetch('https://sell-api.goat.com/api/v1/users/earnings', {
      method: 'GET',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
    }).then((res, err) => {
      earningsRes = res.status;

      if (res.status == 200) {
        return res.json();
      } else if (res.status == 401) {
        throw new Error('Login expired');
      } else {
        console.log('Res is', res.status);
        console.trace();

        if (err) {
          console.log(err);
        }
      }
    });

    count++;

    if (count == client.config.maxRetries) {
      throw new Error('Max retries');
    }
  }

  return earnings;
};
