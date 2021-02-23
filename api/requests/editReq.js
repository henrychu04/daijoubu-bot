const fetch = require('node-fetch');

async function getListing(client, loginToken, id) {
  let listingRes = 0;
  let listing = null;
  let count = 0;

  while (listingRes != 200) {
    listing = await fetch(`https://sell-api.goat.com/api/v1/listings/${id}`, {
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
    }).then((res, err) => {
      listingRes = res.status;

      if (res.status == 200) {
        return res.json();
      } else if (res.status == 401) {
        throw new Error('Login expired');
      } else if (res.status == 404) {
        throw new Error('Not exist');
      } else {
        console.log('Res is', res.status);
        console.trace();

        if (err) {
          throw new Error(err);
        }
      }
    });

    count++;

    if (count == client.config.maxRetries) {
      throw new Error('Max retries');
    }
  }

  return listing;
}

async function doEdit(client, loginToken, id, listingObj) {
  let editRes = 0;
  let count = 0;

  while (editRes != 200) {
    editRes = await fetch(`https://sell-api.goat.com/api/v1/listings/${id}`, {
      method: 'PUT',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
      body: `${JSON.stringify(listingObj)}`,
    }).then((res) => {
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

  return editRes;
}

module.exports = { getListing, doEdit };
