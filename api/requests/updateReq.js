const fetch = require('node-fetch');

module.exports = async (client, loginToken, obj) => {
  obj.price_cents = obj.product.lowest_price_cents;
  let updateRes = 0;
  let count = 0;

  console.log('in updateReq');
  console.log('updated obj is:');
  console.log(obj);

  while (updateRes != 200) {
    updateRes = await fetch(`https://sell-api.goat.com/api/v1/listings/${obj.id}`, {
      method: 'PUT',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
      body: `{"listing":${JSON.stringify(obj)}}`,
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

  return updateRes;
};
