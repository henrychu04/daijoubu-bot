const encryption = require('../scripts/encryption.js');
const aliasClass = require('../api/alias/index.js');

const consign = require('../api/requests/consign.js');
const help = require('../api/requests/help.js');
const aliasSearch = require('../api/requests/aliasSearch.js');

const Users = require('../models/users');

const response = {
  SUCCESS: 'success',
  NO_ITEMS: 'no_items',
  NO_CHANGE: 'no_change',
  EXIT: 'exit',
  TIMEOUT: 'timeout',
  ERROR: 'error',
};

exports.run = async (client, message, args) => {
  if (args.length == 0) {
    console.log();
    return message.channel.send('```Command is missing parameters```');
  }

  const query = message.content.slice(7);
  const command = args[0].toLowerCase();
  const id = message.author.id;
  let aliasObj;

  if (
    command == 'login' ||
    command == 'check' ||
    command == 'match' ||
    command == 'listings' ||
    command == 'delete' ||
    command == 'edit' ||
    command == 'orders' ||
    command == 'confirm' ||
    command == 'settings' ||
    command == 'list' ||
    command == 'me' ||
    command == 'earnings' ||
    command == 'cashout' ||
    command == 'generate' ||
    command == 'cancel'
  ) {
    let userArray = await Users.find({ d_id: id });

    if (userArray.length == 0) {
      console.log();
      return message.channel.send(
        '```Command not available\nPlease login via daijoubu DMS with the format:\n\t!alias login <email> <password>```'
      );
    }

    let user = userArray[0];
    let loginToken = encryption.decrypt(user.aliasLogin);
    aliasObj = new aliasClass(client, user, loginToken, message);
  }

  let toReturn = '';

  try {
    switch (command) {
      case 'login':
        if (message.channel.type == 'dm') {
          if (args.length == 3) {
            await aliasObj.aliasLogin(args[1], args[2]);
          } else {
            await message.channel.send('```Incorrect format\nCorrect format is !login <email> <password>```');
          }
        } else {
          await message.channel.send(
            '```To login to alias, send a dm to daijoubu in the format:\n!login <email> <password>```'
          );
        }
        break;
      case 'check':
        if (args.length > 1) {
          throw new Error('Too many parameters');
        }

        let checkResponse = await aliasObj.check();

        if (checkResponse.returnedEnum == response.SUCCESS) {
          for (let i = 0; i < checkResponse.newLowestAsksArray.length; i++) {
            if (i == 0) {
              let initialString = 'Current Listings With a Lower Ask:';
              initialString += checkResponse.newLowestAsksArray[i];
              await message.channel.send('```' + initialString + '```');
            } else {
              await message.channel.send('```' + checkResponse.newLowestAsksArray[i] + '```');
            }
          }
          console.log(`${message.content} completed\n`);
        } else if (checkResponse.returnedEnum == response.NO_CHANGE) {
          toReturn = '```All listing(s) match their lowest asks```';
        } else if (checkResponse.returnedEnum == response.NO_ITEMS) {
          toReturn = '```Account currently has no items listed```';
        }
        break;
      case 'match':
        if (args.length > 1) {
          throw new Error('Too many parameters');
        }

        let matchResponse = await aliasObj.match();

        if (matchResponse.returnedEnum == response.SUCCESS) {
          if (matchResponse.all) {
            await matchResponse.msg
              .edit('```All listing(s) updated successfully```')
              .then(console.log(`${message.content} completed\n`));
          } else {
            await matchResponse.msg
              .edit('```Specified listing(s) updated successfully```')
              .then(console.log(`${message.content} completed\n`));
          }
        } else if (matchResponse.returnedEnum == response.NO_CHANGE) {
          toReturn = '```All listing(s) already match their lowest asks```';
        } else if (matchResponse.returnedEnum == response.NO_ITEMS) {
          toReturn = '```Account currently has no Items listed```';
        } else if (matchResponse.returnedEnum == response.EXIT) {
          toReturn = '```Canceled```';
        } else if (matchResponse.returnedEnum == response.TIMEOUT) {
          toReturn = '```Command timed out```';
        } else if (matchResponse.returnedEnum == response.ERROR) {
          throw new Error();
        }
        break;
      case 'listings':
        if (args.length > 1) {
          throw new Error('Too many parameters');
        }

        let listingsResponse = await aliasObj.mongoListings();

        if (listingsResponse.returnedEnum == response.SUCCESS) {
          for (let i = 0; i < listingsResponse.listingArray.length; i++) {
            if (i == 0) {
              let initialString = 'Current Listings:';
              initialString += listingsResponse.listingArray[i];
              await message.channel.send('```' + initialString + '```');
            } else {
              await message.channel.send('```' + listingsResponse.listingArray[i] + '```');
            }
          }
          console.log(`${message.content} completed\n`);
        } else if (listingsResponse.returnedEnum == response.NO_ITEMS) {
          toReturn = '```Account currently has no items listed```';
        }
        break;
      case 'delete':
        if (args.length > 1) {
          throw new Error('Too many parameters');
        }

        let deleteResponse = await aliasObj.delete();

        if (deleteResponse.returnedEnum == response.SUCCESS) {
          if (deleteResponse.all) {
            await deleteResponse.msg.edit('```All listing(s) deleted successfully```');
          } else {
            await deleteResponse.msg.edit('```Specified listing(s) deleted successfully```');
          }
          console.log(`${message.content} completed\n`);
        } else if (deleteResponse.returnedEnum == response.NO_ITEMS) {
          toReturn = '```Account currently has no items listed```';
        } else if (deleteResponse.returnedEnum == response.EXIT) {
          toReturn = '```Canceled```';
        } else if (deleteResponse.returnedEnum == response.TIMEOUT) {
          toReturn = '```Command timed out```';
        } else if (deleteResponse.returnedEnum == response.ERROR) {
          throw new Error();
        }
        break;
      case 'edit':
        if (args.length > 1) {
          throw new Error('Too many parameters');
        }

        let editResponse = aliasObj.edit();

        if (editResponse.returnedEnum == response.SUCCESS) {
          if (editResponse.editOthers) {
            await editResponse.msg.edit('```All listings edited successfully```');
          } else {
            await editResponse.msg.edit('```Listing edited successfully```');
          }
          console.log(`${message.content} completed\n`);
        } else if (editResponse.returnedEnum == response.EXIT) {
          toReturn = '```Canceled```';
        } else if (editResponse.returnedEnum == response.TIMEOUT) {
          toReturn = '```Command timed out```';
        } else if (editResponse.returnedEnum == response.ERROR) {
          throw new Error();
        }
        break;
      case 'orders':
        if (args.length > 1) {
          throw new Error('Too many parameters');
        }

        let getOrdersResponse = await aliasObj.getOrders();

        if (getOrdersResponse.returnedEnum == response.SUCCESS) {
          let orderReturnString = 'Current Open Orders:\n';
          let orderCounter = 0;

          for (type of getOrdersResponse.orderArray) {
            if (type.value.length != 0) {
              orderReturnString += `\t${type.name}:\n`;

              for (order of type.value) {
                orderReturnString += order.string + '\n';

                orderCounter++;

                if (orderCounter == 15) {
                  await message.channel.send('```' + orderReturnString + '```');

                  orderReturnString = '';
                  orderCounter = 0;
                }
              }
            }
          }

          toReturn = '```' + orderReturnString + '```';
        } else if (getOrdersResponse.returnedEnum == response.NO_ITEMS) {
          toReturn = '```Account currently has no open orders```';
        }
        break;
      case 'confirm':
        if (args.length > 1) {
          throw new Error('Too many parameters');
        }

        let confirmRes = await aliasObj.confirm();

        if (confirmRes.returnedEnum == response.SUCCESS) {
          if (confirmRes.all) {
            await confirmRes.msg.edit('```All orders(s) confirmed successfully```');
          } else {
            await confirmRes.msg.edit('```Specified orders(s) confirmed successfully```');
          }
          console.log(`${message.content} completed\n`);
        } else if (confirmRes.returnedEnum == response.NO_ITEMS) {
          toReturn = '```Currently no order(s) on account```';
        } else if (confirmRes.returnedEnum == response.NO_CHANGE) {
          toReturn = '```Currently all open order(s) are confirmed```';
        } else if (confirmRes.returnedEnum == response.EXIT) {
          toReturn = '```Canceled```';
        } else if (confirmRes.returnedEnum == response.TIMEOUT) {
          toReturn = '```Command timed out```';
        } else if (confirmRes.returnedEnum == response.ERROR) {
          throw new Error();
        }
        break;
      case 'generate':
        if (args.length > 1) {
          throw new Error('Too many parameters');
        }

        let generateRes = await aliasObj.generate();

        if (generateRes.returnedEnum == response.SUCCESS) {
          if (generateRes.all) {
            await generateRes.msg.edit('```All shipping label(s) generated successfully```');
          } else {
            await generateRes.msg.edit('```Specified shipping label(s) generated successfully```');
          }
          console.log(`${message.content} completed\n`);
        } else if (generateRes.returnedEnum == response.NO_ITEMS) {
          toReturn = '```Currently no order(s) on account```';
        } else if (generateRes.returnedEnum == response.NO_CHANGE) {
          toReturn = '```Currently no order(s) need a shipping label to generate```';
        } else if (generateRes.returnedEnum == response.EXIT) {
          toReturn = '```Canceled```';
        } else if (generateRes.returnedEnum == response.TIMEOUT) {
          toReturn = '```Command timed out```';
        } else if (generateRes.returnedEnum == response.ERROR) {
          throw new Error();
        }
        break;
      case 'settings':
        let edit = false;

        if (args.length > 2) {
          throw new Error('Too many parameters');
        } else if (args[1] && args[1].toLowerCase() == 'edit') {
          edit = true;
        } else if (args.length != 1) {
          throw new Error('Incorrect format');
        }

        let settingsRes = await aliasObj.settings(edit);

        if (settingsRes.returnedEnum == response.SUCCESS) {
          toReturn = settingsRes.userSettings;
        } else if (settingsRes.returnedEnum == response.EXIT) {
          toReturn = '```Canceled```';
        } else if (settingsRes.returnedEnum == response.TIMEOUT) {
          toReturn = '```Command timed out```';
        } else if (settingsRes.returnedEnum == response.NO_ITEMS) {
          toReturn = '```Account currently has no items listed```';
        }
        break;
      case 'list':
        let listQuery = message.content.slice(12);

        let listRes = await aliasObj.list(listQuery);

        if (listRes.returnedEnum == response.SUCCESS) {
          if (!listRes.lower) {
            await listRes.msg
              .edit('```' + listRes.listString + '```')
              .then(console.log(`${message.content} completed\n`));
          } else {
            toReturn = '```' + listRes.listString + '```';
          }
        } else if (listRes.returnedEnum == response.EXIT) {
          toReturn = '```Canceled```';
        } else if (listRes.returnedEnum == response.NO_CHANGE) {
          toReturn = '```No new items listed```';
        } else if (listRes.returnedEnum == response.TIMEOUT) {
          toReturn = '```Command timed out```';
        }
        break;
      case 'me':
        toReturn = await aliasObj.me();
        break;
      case 'consign':
        let searchQuery = query.slice(8);

        if (searchQuery.length == 0) {
          throw new Error('Empty command');
        }

        toReturn = await consign(client, searchQuery);
        break;
      case 'earnings':
        let earningsRes = await aliasObj.earnings();

        toReturn = '```' + earningsRes.returnString + '```';
        break;
      case 'cashout':
        if (args.length > 1) {
          throw new Error('Too many parameters');
        }

        let cashOutRes = await aliasObj.cashOut();

        if (cashOutRes.returnedEnum == response.SUCCESS) {
          await cashOutRes.msg.edit('```' + 'Cash out successful' + '```');
          toReturn =
            '```' +
            `Current Available Earnings: $${(cashOutRes.newAmount / 100).toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}` +
            '```';
        } else if (cashOutRes.returnedEnum == response.EXIT) {
          toReturn = '```Canceled```';
        } else if (cashOutRes.returnedEnum == response.TIMEOUT) {
          toReturn = '```Command timed out```';
        } else if (cashOutRes.returnedEnum == response.NO_CHANGE) {
          toReturn = '```No earnings available for cash out```';
        }
        break;
      case 'cancel':
        if (args.length > 1) {
          throw new Error('Too many parameters');
        }

        let cancelRes = await aliasObj.cancel();

        if (cancelRes.returnedEnum == response.SUCCESS) {
          await cancelRes.msg.edit('```Specified orders(s) canceled successfully```');
          console.log(`${message.content} completed\n`);
        } else if (cancelRes.returnedEnum == response.NO_ITEMS) {
          toReturn = '```Currently no order(s) to cancel on account```';
        } else if (cancelRes.returnedEnum == response.EXIT) {
          toReturn = '```Canceled```';
        } else if (cancelRes.returnedEnum == response.TIMEOUT) {
          toReturn = '```Command timed out```';
        } else if (cancelRes.returnedEnum == response.ERROR) {
          throw new Error();
        }
        break;
      case 'help':
        if (args.length > 1) {
          throw new Error('Too many parameters');
        } else {
          toReturn = help();
        }
        break;
      default:
        toReturn = await aliasSearch(client, query);
        break;
    }

    if (toReturn != '') {
      await message.channel
        .send(toReturn)
        .then(console.log(`${message.content} completed\n`))
        .catch((err) => {
          throw new Error(err);
        });
    }
  } catch (err) {
    console.log(err);
    console.log();

    switch (err.message) {
      case 'No hits':
        message.channel.send('```No products found matching search parameters```');
        break;
      case 'Not exist':
        message.channel.send('```Fetch error - Page does not exist```');
        break;
      case 'Login expired':
        message.channel.send('```Login expired```');
        break;
      case 'No data':
        message.channel.send('```Matched product has no data```');
        break;
      case 'No lowest ask':
        message.channel.send(
          '```' +
            'One or more listing sizes does not have a lowest asking price\nPlease check prices again and adjust accordingly' +
            '```'
        );
        break;
      case 'Error listing':
        message.channel.send('```Error listing item(s)```');
        break;
      case 'Error editing listing update rate':
        message.channel.send('```Error editing listing update rate```');
        break;
      case 'Max retries':
        message.channel.send('```Request error - Max retries reached```');
        break;
      case 'Missing phone number':
        message.channel.send('```Account is missing phone number\nCommand not available until one is added```');
        break;
      case 'Invalid size':
        message.channel.send('```Listing parameters has one or more non-existing sizes```');
        break;
      case 'Too many parameters':
        message.channel.send('```Command has too many parameters```');
        break;
      case 'Incorrect format':
        message.channel.send('```Incorrect format```');
        break;
      case 'No query':
        message.channel.send('```Command is missing search parameters```');
        break;
      default:
        message.channel.send('```Unexpected Error```');
        break;
    }
  }
};
