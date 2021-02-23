const aliasSearch = require('../../requests/aliasSearch.js');
const listReq = require('../../requests/listReq.js');

const response = {
  SUCCESS: 'success',
  NO_ITEMS: 'no_items',
  NO_CHANGE: 'no_change',
  EXIT: 'exit',
  TIMEOUT: 'timeout',
  ERROR: 'error',
};

module.exports = async (query, client, loginToken, user, message) => {
  let returnObj = {
    returnedEnum: null,
    returnString: null,
    msg: null,
    lower: null,
  };

  if (query.length == 0) {
    throw new Error('No query');
  }

  let searchProduct = await aliasSearch(client, query);

  await message.channel.send(searchProduct);
  await message.channel.send(
    '```' + `Is this the product that you want to list?\nEnter 'y' to confirm, enter 'n' to cancel` + '```'
  );

  let returnMsg = null;
  let exit = false;
  let stopped = false;
  let input = '';

  const collector1 = message.channel.createMessageCollector((msg) => msg.author.id == message.author.id, {
    time: 30000,
  });

  for await (const msg of collector1) {
    input = msg.content.toLowerCase();

    if (input == 'y' || input == 'n') {
      if (input == 'n') {
        collector1.stop();
        stopped = true;
        console.log('Canceled');
        exit = true;
      } else {
        collector1.stop();
        stopped = true;
      }
    } else {
      await msg.channel.send('```' + `Enter either 'y' or 'n'` + '```');
    }
  }

  if (exit) {
    returnObj.returnedEnum = response.EXIT;
    return returnObj;
  } else if (!stopped) {
    returnObj.returnedEnum = response.TIMEOUT;
    return returnObj;
  }

  await message.channel.send(
    '```' +
      `Enter size range and price\n\n[<size (num)> REQUIRED,<price (num, 'lowest')> REQUIRED,<amount (num)> OR <listing update rate ('live', 'manual')> OPTIONAL,<listing update rate ('live', 'manual')> OPTIONAL] [] ...\n\nExamples:\n\t[10,lowest]\t[10,500]\t[10,500,live]\t[10,500,manual]\t[10,500,4,live]\n\nEnter 'n' to cancel` +
      '```'
  );

  let sizingArray = [];

  const collector2 = message.channel.createMessageCollector((msg) => msg.author.id == message.author.id, {
    time: 30000,
  });

  for await (const msg of collector2) {
    input = msg.content.toLowerCase();
    sizingArray = input.split(' ');

    if (input == 'n') {
      collector2.stop();
      stopped = true;
      console.log('Canceled');
      exit = true;
    } else if (listReq.checkListParams(sizingArray)) {
      collector2.stop();
      stopped = true;
    } else {
      await msg.channel.send(
        '```' +
          `Incorrect format\nCorrect format is:\n\n[<size (num)> REQUIRED,<price (num, 'lowest')> REQUIRED,<amount (num)> OR <listing update rate ('live', 'manual')> OPTIONAL,<listing update rate ('live', 'manual')> OPTIONAL] [] ...\n\nExamples:\n\t[10,lowest]\t[10,500]\t[10,500,live]\t[10,500,manual]\t[10,500,4,live]` +
          '```'
      );
    }
  }

  if (exit) {
    returnObj.returnedEnum = response.EXIT;
    return returnObj;
  } else if (!stopped) {
    returnObj.returnedEnum = response.TIMEOUT;
    return returnObj;
  }

  returnMsg = await message.channel.send('```Listing ...```');

  let { returnedEnum, returnString, lower } = await listReq.doList(
    client,
    user,
    loginToken,
    message,
    searchProduct,
    sizingArray
  );

  returnObj.returnedEnum = returnedEnum;
  returnObj.listString = returnString;
  returnObj.msg = returnMsg;
  returnObj.lower = lower;

  return returnObj;
};
