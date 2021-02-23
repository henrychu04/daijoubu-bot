const Discord = require('discord.js');
const fetch = require('node-fetch');

module.exports = async (client, loginToken) => {
  let meRes = 0;
  let me = null;
  let count = 0;

  while (meRes != 200) {
    me = await fetch('https://sell-api.goat.com/api/v1/unstable/users/me', {
      method: 'POST',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
      body: '{}',
    }).then((res, err) => {
      meRes = res.status;

      if (res.status == 200) {
        return res.json();
      } else if (res.status == 401) {
        throw new Error('Login expired');
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

  let purchaseOrdersCountRes = 0;
  let purchaseOrdersCount = null;
  count = 0;

  while (purchaseOrdersCountRes != 200) {
    purchaseOrdersCount = await fetch('https://sell-api.goat.com/api/v1/purchase-orders-count', {
      method: 'GET',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
    }).then((res, err) => {
      purchaseOrdersCountRes = res.status;

      if (res.status == 200) {
        return res.json();
      } else if (res.status == 401) {
        throw new Error('Login expired');
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

  let listingValuesRes = 0;
  let listingValues = null;
  count = 0;

  while (listingValuesRes != 200) {
    listingValues = await fetch('https://sell-api.goat.com/api/v1/listings-values', {
      method: 'GET',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
    }).then((res, err) => {
      listingValuesRes = res.status;

      if (res.status == 200) {
        return res.json();
      } else if (res.status == 401) {
        throw new Error('Login expired');
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

  let purchaseOrdersRes = 0;
  let purchaseOrders = null;
  count = 0;

  while (purchaseOrdersRes != 200) {
    purchaseOrders = await fetch('https://sell-api.goat.com/api/v1/total-sales/purchase-orders', {
      method: 'GET',
      headers: {
        'user-agent': client.config.aliasHeader,
        authorization: `Bearer ${loginToken}`,
      },
    }).then((res, err) => {
      purchaseOrdersRes = res.status;

      if (res.status == 200) {
        return res.json();
      } else if (res.status == 401) {
        throw new Error('Login expired');
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

  let earningsRes = 0;
  let earnings = null;
  count = 0;

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
          throw new Error(err);
        }
      }
    });

    count++;

    if (count == client.config.maxRetries) {
      throw new Error('Max retries');
    }
  }

  const meEmbed = new Discord.MessageEmbed()
    .setColor('#7756fe')
    .setTitle(`${me.user.name} alias Account Information`)
    .addFields(
      { name: 'Username', value: me.user.username, inline: true },
      { name: `Email`, value: me.user.email, inline: true },
      { name: 'Seller Score', value: me.user.seller_score, inline: true },
      {
        name: 'Total Number of Completed Orders',
        value: purchaseOrdersCount.canceled_or_completed_count
          ? purchaseOrdersCount.canceled_or_completed_count.toLocaleString('en')
          : 0,
        inline: true,
      },
      {
        name: 'Completed',
        value: purchaseOrdersCount.completed ? purchaseOrdersCount.completed.toLocaleString('en') : 0,
        inline: true,
      },
      {
        name: 'Canceled',
        value: purchaseOrdersCount.canceled ? purchaseOrdersCount.canceled.toLocaleString('en') : 0,
        inline: true,
      },
      {
        name: 'Current Open Orders',
        value: purchaseOrdersCount.open_count ? purchaseOrdersCount.open_count.toLocaleString('en') : 0,
        inline: true,
      },
      {
        name: 'Orders to Ship Out',
        value: purchaseOrdersCount.need_to_ship_count ? purchaseOrdersCount.need_to_ship_count.toLocaleString('en') : 0,
        inline: true,
      },
      { name: '\u200b', value: '\u200b', inline: true },
      {
        name: 'Current Listings Value',
        value: listingValues.active.cents ? '$' + (listingValues.active.cents / 100).toLocaleString('en') : '$0',
        inline: true,
      },
      {
        name: 'Total Sales Value',
        value: '$' + (purchaseOrders.total_sales_cents / 100).toLocaleString('en'),
        inline: true,
      },
      { name: '\u200b', value: '\u200b', inline: true },
      {
        name: 'Current Available Earnings',
        value: earnings.amount_cents ? '$' + (earnings.amount_cents / 100).toLocaleString('en') : '$0',
        inline: true,
      },
      { name: '\u200b', value: '\u200b', inline: true },
      { name: '\u200b', value: '\u200b', inline: true }
    );

  return meEmbed;
};
