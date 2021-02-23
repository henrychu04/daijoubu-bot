const fetch = require('node-fetch');

module.exports = async (client, loginToken) => {
  let getStatus = 0;
  let purchaseOrders = {};
  let count = 0;

  while (getStatus != 200) {
    purchaseOrders = await fetch(
      'https://sell-api.goat.com/api/v1/purchase-orders?filter=10&includeMetadata=1&page=1',
      {
        method: 'GET',
        headers: {
          'user-agent': client.config.aliasHeader,
          authorization: `Bearer ${loginToken}`,
        },
      }
    ).then((res, err) => {
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

  for (let i = 1; i < purchaseOrders.metadata.total_pages; i++) {
    let temp = {};
    getStatus = 0;
    count = 0;

    while (getStatus != 200) {
      temp = await fetch(`https://sell-api.goat.com/api/v1/purchase-orders?filter=10&includeMetadata=1&page=${i + 1}`, {
        method: 'GET',
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

    for (let j = 0; j < temp.purchase_orders.length; j++) {
      purchaseOrders.purchase_orders.push(temp.purchase_orders[j]);
    }
  }

  return purchaseOrders;
};
