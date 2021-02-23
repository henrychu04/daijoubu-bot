const fetch = require('node-fetch');

const Listings = require('../../models/listings.js');

module.exports = async (client, loginToken, user, listingId) => {
  let deactivateRes = 0;
  let cancelRes = 0;
  let count = 0;

  while (deactivateRes != 200) {
    deactivateRes = await fetch(`https://sell-api.goat.com/api/v1/listings/${listingId}/deactivate`, {
      method: 'PUT',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
      body: `{"id":"${listingId}"}`,
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

  if (deactivateRes != 200) {
    return 0;
  }

  count = 0;

  while (cancelRes != 200) {
    cancelRes = await fetch(` https://sell-api.goat.com/api/v1/listings/${listingId}/cancel`, {
      method: 'PUT',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
      body: `{"id":"${listingId}"}`,
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

  if (cancelRes != 200) {
    return 0;
  }

  await Listings.updateOne({ d_id: user.d_id }, { $pull: { aliasListings: { id: listingId } } }).catch((err) =>
    console.log(err)
  );

  if (deactivateRes == 200 && cancelRes == 200) {
    return 200;
  }
};
