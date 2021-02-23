const confirmReq = require('../../requests/confirmReq.js');
const getOrders = require('./getOrders.js');

const response = {
  SUCCESS: 'success',
  NO_ITEMS: 'no_items',
  NO_CHANGE: 'no_change',
  EXIT: 'exit',
  TIMEOUT: 'timeout',
  ERROR: 'error',
};

module.exports = async (client, loginToken, user, message) => {
  let returnObj = {
    returnedEnum: null,
    all: null,
    msg: null,
  };

  let getOrderRes = await getOrders(user);

  if (getOrderRes.returnedEnum == response.NO_ITEMS) {
    returnObj.returnedEnum = response.NO_ITEMS;
    return returnObj;
  }

  let confirmString = 'Needs Confirmation:\n';
  let orders = [];
  let i = 0;

  for (let type of getOrderRes.orderArray) {
    if (type.name == 'Needs Confirmation') {
      for (let j = 0; j < type.value.length; j++) {
        confirmString += type.value[j].string + '\n';

        i++;

        if (i == 15) {
          await message.channel.send('```' + confirmString + '```');

          confirmString = '';
          i = 0;
        }

        orders.push(type.value[j].number);
      }
    }
  }

  if (orders.length == 0) {
    returnObj.returnedEnum = response.NO_ITEMS;
    return returnObj;
  }

  await message.channel.send('```' + confirmString + '```');
  await message.channel.send('```' + `Enter 'all' or order number(s) to confirm\nEnter 'n' to cancel` + '```');

  let nums = [];
  let stopped = false;
  let exit = false;
  let all = false;

  const collector = message.channel.createMessageCollector((msg) => msg.author.id == message.author.id, {
    time: 30000,
  });

  for await (const msg of collector) {
    nums = msg.content.split(' ');

    if (msg.content.toLowerCase() == 'n') {
      collector.stop();
      stopped = true;
      exit = true;
      console.log('Canceled');
    } else if (checkNumParams(nums)) {
      if (nums[0].toLowerCase() == 'all') {
        collector.stop();
        all = true;
        stopped = true;
      } else {
        let valid = true;

        for (let i = 0; i < nums.length; i++) {
          if (parseInt(nums[i]) >= orders.length) {
            valid = false;
            await msg.channel.send('```' + 'One or more entered order number(s) do not exist' + '```');
            break;
          }
        }

        if (valid) {
          collector.stop();
          stopped = true;
        }
      }
    } else {
      await msg.channel.send('```' + `Invalid format\nEnter 'all' or order number(s)` + '```');
    }
  }

  if (exit) {
    returnObj.returnedEnum = response.EXIT;
    return returnObj;
  } else if (!stopped) {
    returnObj.returnedEnum = response.TIMEOUT;
    return returnObj;
  }

  let msg = await message.channel.send('```Confirming ... ```');

  if (all) {
    for (let order of orders) {
      let confirmRes = await confirmReq(client, loginToken, order);

      if (confirmRes != 200) {
        throw new Error('Error confirming');
      }

      let generateRes = await generateReq(client, loginToken, order);

      if (generateRes != 200) {
        throw new Error('Error generating');
      }
    }
  } else {
    for (let num of nums) {
      let confirmRes = await confirmReq(client, loginToken, orders[parseInt(num)]);

      if (confirmRes != 200) {
        throw new Error('Error confirming');
      }

      let generateRes = await generateReq(client, loginToken, orders[parseInt(num)]);

      if (generateRes != 200) {
        throw new Error('Error generating');
      }
    }
  }

  returnObj.returnedEnum = response.SUCCESS;
  returnObj.all = all;
  returnObj.msg = msg;

  return returnObj;
};

function checkNumParams(nums) {
  if (nums.length == 1) {
    if (nums[0].toLowerCase() == 'all') {
      return true;
    } else if (!isNaN(nums[0])) {
      return true;
    } else {
      return false;
    }
  }

  for (let i = 0; i < nums.length; i++) {
    if (isNaN(nums[i])) {
      return false;
    }
  }

  return true;
}
