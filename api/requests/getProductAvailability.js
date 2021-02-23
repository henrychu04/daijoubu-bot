const fetch = require('node-fetch');

module.exports = async (client, slug) => {
  let pageDataRes = 0;
  let pageData = null;
  let count = 0;

  while (pageDataRes != 200) {
    pageData = await fetch(
      `https://sell-api.goat.com/api/v1/analytics/products/${slug}/availability?box_condition=1&shoe_condition=1`,
      {
        headers: client.config.headers,
      }
    ).then((res, err) => {
      pageDataRes = res.status;

      if (res.status == 200) {
        return res.json();
      } else if (res.status == 404) {
        throw new Error('Not exist');
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

  return pageData;
};
