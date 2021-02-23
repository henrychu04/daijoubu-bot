const fetch = require('node-fetch');

module.exports = async (client, loginToken) => {
  let getStatus = 0;
  let listings = {};
  let count = 0;

  while (getStatus != 200) {
    listings = await fetch(`https://sell-api.goat.com/api/v1/listings?filter=1&includeMetadata=1&page=1`, {
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
    }).then((res, err) => {
      getStatus = res.status;

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

  for (let i = 1; i < listings.metadata.total_pages; i++) {
    let temp = {};
    getStatus = 0;
    count = 0;

    while (getStatus != 200) {
      temp = await fetch(`https://sell-api.goat.com/api/v1/listings?filter=1&includeMetadata=1&page=${i + 1}`, {
        headers: {
          'user-agent': client.config.aliasHeader,
          authorization: `Bearer ${loginToken}`,
        },
      }).then((res, err) => {
        getStatus = res.status;

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

    for (let j = 0; j < temp.listing.length; j++) {
      listings.listing.push(temp.listing[j]);
    }
  }

  return listings;
};
