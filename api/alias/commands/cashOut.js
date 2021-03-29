const cashOutReq = require('../../requests/cashOutReq.js');
const earnings = require('./earnings.js');

const Users = require('../../../models/users.js');

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
    newAmount: null,
    msg: null,
  };

  let earningsRes = await earnings(user);

  if (earningsRes.cashoutAmount == 0) {
    returnObj.returnedEnum = response.NO_CHANGE;
    return returnObj;
  }

  let phoneRes = await cashOutReq.getPhone(client, loginToken);

  if (!phoneRes.user.phone_number || phoneRes.user.phone_number.length == 0) {
    throw new Error('Missing phone number');
  }

  await cashOutReq.sendOTP(client, loginToken);

  let phoneNum = phoneRes.user.phone_number.substring(phoneRes.user.phone_number.length - 4);

  await message.channel.send('```' + `A security code has been sent to the phone number ending in ${phoneNum}` + '```');
  await message.channel.send('```' + `Enter the security code or 's' to send again` + '```');

  let fee = await cashOutReq.getFee(client, loginToken, earningsRes.cashoutAmount);

  earningsRes.returnString += `\nAmount after Cash Out Fee (2.9%): $${(
    fee.calculated_cashout_cents / 100
  ).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  let stopped = false;
  let exit = false;
  let input = '';

  const collector1 = message.channel.createMessageCollector((msg) => msg.author.id == message.author.id, {
    time: 30000,
  });

  for await (const msg of collector1) {
    input = msg.content.toLowerCase();

    if (input == 'n') {
      collector1.stop();
      stopped = true;
      exit = true;
      console.log('Canceled\n');
    } else if (input == 's') {
      await cashOutReq.sendOTP(client, loginToken);
      await msg.channel.send(
        '```' + `Another security code has been sent to the phone number ending in ${phoneNum}` + '```'
      );
    } else if (!isNaN(input)) {
      if (input.length == 6) {
        let verifyRes = await cashOutReq.verifyOTP(client, loginToken, input);

        if (verifyRes == 200) {
          collector1.stop();
          stopped = true;
        } else {
          await msg.channel.send('```' + 'Invalid security code\nEnter again' + '```');
        }
      } else {
        await msg.channel.send('```' + 'Security code should have 6 digits\nEnter again' + '```');
      }
    } else {
      await msg.channel.send('```' + `Invalid format\nEnter 'all' or amount to cash out` + '```');
    }
  }

  if (exit) {
    returnObj.returnedEnum = response.EXIT;
    return returnObj;
  } else if (!stopped) {
    returnObj.returnedEnum = response.TIMEOUT;
    return returnObj;
  }

  let all = false;

  await message.channel.send('```' + earningsRes.returnString + '```');
  await message.channel.send('```' + `Enter 'all' or amount to cash out` + '```');

  const collector2 = message.channel.createMessageCollector((msg) => msg.author.id == message.author.id, {
    time: 30000,
  });

  for await (const msg of collector2) {
    input = msg.content.toLowerCase();

    if (input == 'n') {
      collector2.stop();
      stopped = true;
      exit = true;
      console.log('Canceled\n');
    } else if (!isNaN(input)) {
      if (input > earningsRes.cashoutAmount / 100) {
        await msg.channel.send(
          '```' + `Entered input is greater than available earnings\nEnter 'all' or a lesser value` + '```'
        );
      } else {
        collector2.stop();
        stopped = true;
        input = (parseInt(input) * 100).toString();
      }
    } else if (input == 'all') {
      collector2.stop();
      all = true;
      stopped = true;
      input = earningsRes.cashoutAmount;
    } else {
      await msg.channel.send('```' + `Invalid format\nEnter 'all' or amount to cash out` + '```');
    }
  }

  if (exit) {
    returnObj.returnedEnum = response.EXIT;
    return returnObj;
  } else if (!stopped) {
    returnObj.returnedEnum = response.TIMEOUT;
    return returnObj;
  }

  let msg = await message.channel.send('```' + 'Cashing out ...' + '```');

  let cashOutRes = await cashOutReq.cashOut(client, loginToken, input);

  if (all) {
    input = earningsRes.cashoutAmount;
  } else {
    input *= 100;
  }

  let newAmount = 0;

  if (cashOutRes.remaining_balance_cents) {
    newAmount = parseInt(cashOutRes.remaining_balance_cents);
  }

  await Users.updateOne({ _id: user._id }, { $set: { aliasCashoutAmount: newAmount } }, (err) => {
    if (!err) {
      console.log('Cash out amount updated successfully');
    }
  });

  returnObj.returnedEnum = response.SUCCESS;
  returnObj.newAmount = newAmount;
  returnObj.msg = msg;

  return returnObj;
};
