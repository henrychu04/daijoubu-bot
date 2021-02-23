const getAllListings = require('../requests/getAllListings.js');

module.exports = async (client, loginToken, id, lowest) => {
  let listings = await getAllListings(client, loginToken);
  let obj = {};

  for (let i = 0; i < listings.listing.length; i++) {
    if (listings.listing[i].id == id) {
      obj = listings.listing[i];
      break;
    }
  }

  obj.price_cents = lowest.toString();

  let updateRes = 0;
  let count = 0;

  while (updateRes != 200) {
    updateRes = await fetch(`https://sell-api.goat.com/api/v1/listings/${id}`, {
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
          console.log(err);
        }
      }

      return res.status;
    });

    count++;

    if (count == client.config.maxRetries) {
      throw new Error('Max retries');
    }
  }
};
