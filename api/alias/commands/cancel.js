const cancelReq = require('../../requests/cancelReq.js');
const getOrders = require('./getOrders.js');

const response = {
  SUCCESS: 'success',
  NO_ITEMS: 'no_items',
  NO_CHANGE: 'no_change',
  EXIT: 'exit',
  TIMEOUT: 'timeout',
  ERROR: 'error',
};

module.exports = async (client, loginToken, message, user) => {
  let returnObj = {
    returnedEnum: null,
    msg: null,
  };

  let getOrdersRes = await getOrders(user);
  let orderNumArray = [];

  if (getOrdersRes.returnedEnum == response.SUCCESS) {
    let orderReturnString = 'Current Cancelable Orders:\n';
    let orderCounter = 0;

    for (let type of getOrdersRes.orderArray) {
      if (type.name == 'Needs Shipping') {
        if (type.value.length != 0) {
          orderReturnString += `\t${type.name}:\n`;

          for (let order of type.value) {
            orderReturnString += order.string;
            orderNumArray.push(order.number);

            orderCounter++;

            if (orderCounter == 15) {
              await message.channel.send('```' + orderReturnString + '```');

              orderReturnString = '';
              orderCounter = 0;
            }
          }

          orderReturnString += '\n';
        }

        break;
      }
    }

    await message.channel.send('```' + orderReturnString + '```');
  } else if (getOrdersRes.returnedEnum == response.NO_ITEMS) {
    returnObj.returnedEnum = response.NO_ITEMS;
    return returnObj;
  }

  await message.channel.send(
    '```' +
      `Only 'Needs Shipping' orders may be canceled\nConfirm orders or generate a shipping label before canceling` +
      '```'
  );
  await message.channel.send('```' + `Enter 'all' or order number(s) to cancel\nEnter 'n' to cancel` + '```');

  let stopped = false;
  let exit = false;
  let all = false;
  let nums = [];

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
          if (parseInt(nums[i]) >= orderNumArray.length) {
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

  let msg = await message.channel.send('```Canceling ... ```');

  if (all) {
    for (let num of orderNumArray) {
      let cancelRes = await cancelReq(client, loginToken, num);

      if (cancelRes != 200) {
        throw new Error('Error canceling');
      }
    }
  } else {
    for (let num of nums) {
      let cancelRes = await cancelReq(client, loginToken, orderNumArray[parseInt(num)]);

      if (cancelRes != 200) {
        throw new Error('Error canceling');
      }
    }
  }

  // Add delete orders

  returnObj.returnedEnum = response.SUCCESS;
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
