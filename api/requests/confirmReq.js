let fetch = require('node-fetch');

module.exports = async (client, loginToken, orderNum) => {
  let confirmRes = 0;
  let count = 0;

  while (confirmRes != 200) {
    confirmRes = await fetch(`https://sell-api.goat.com/api/v1/purchase-orders/${orderNum}/confirm`, {
      method: 'PUT',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
      body: `{"number":"${orderNum}"}`,
    }).then((res, err) => {
      if (res.status == 401) {
        throw new Error('Login expired');
      } else if (res.status == 404) {
        throw new Error('Not exist');
      } else if (res.status != 200) {
        console.log('Res is', res.status);
        console.trace();

        if (err) {
          throw new Error(err);
        }
      }

      return res.status;
    });

    count++;

    if (count == client.config.maxRetries) {
      throw new Error('Max retries');
    }
  }

  return confirmRes;
};
