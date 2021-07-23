const fetch = require('node-fetch');
const moment = require('moment-timezone');

module.exports = async (client, loginToken, message) => {
  let history = await getHistory(client, loginToken);
  let returnString = 'Completed Order(s):\n';

  let count = 0;
  let number = 1;

  for (let crnt of history.items) {
    let item = buildString(crnt, number);

    if (item) {
      returnString += item + '\n\n';
    } else {
      continue;
    }

    if (count == 15) {
      await message.channel.send('```' + returnString + '```');

      returnString = '';
      count = 0;
    }

    if (crnt.transaction_type == 'SALE') ++number;

    ++count;
  }

  await message.channel.send('```' + returnString + '```');
  await message.channel.send('```All past orders retrieved```');
};

function buildString(item, number) {
  let newMoment = moment.utc(item.created_date).tz('America/New_York');

  if (newMoment.year() != 2021) {
    return undefined;
  }

  let string = `\tNumber: ${number}\n\tDate: ${newMoment.month() + 1}/${newMoment.date()}/${newMoment.year()}\n\Id: ${
    item.transaction_type
  }\n\tOrder Number: ${item.id}\n\tAmount: ${item.amount_cents / 100}`;

  return string;
}

getHistory = async (client, loginToken) => {
  let getStatus = 0;
  let history = {};
  let count = 0;

  while (getStatus != 200) {
    history = await fetch('https://sell-api.goat.com/api/v1/users/transactions?includeMetadata=1&page=1', {
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

  for (let i = 1; i < history.metadata.total_pages; i++) {
    let temp = {};
    getStatus = 0;
    count = 0;

    while (getStatus != 200) {
      temp = await fetch(`https://sell-api.goat.com/api/v1/users/transactions?includeMetadata=1&page=${i + 1}`, {
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

    for (let j = 0; j < temp.items.length; j++) {
      history.items.push(temp.items[j]);
    }
  }

  return history;
};
