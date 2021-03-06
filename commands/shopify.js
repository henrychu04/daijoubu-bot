const fetch = require('node-fetch');
const AbortController = require('abort-controller');
const url = require('url');
const Discord = require('discord.js');

exports.run = async (client, message, args) => {
  try {
    let controller = new AbortController();
    setTimeout(() => controller.abort(), 1000);

    function timeoutPromise(ms, promise) {
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('timeout'));
        }, ms);
        promise.then(
          (res) => {
            clearTimeout(timeoutId);
            resolve(res);
          },
          (err) => {
            clearTimeout(timeoutId);
            reject(err);
          }
        );
      });
    }

    let link = message.content.slice(9);

    if (link.length == 0) {
      throw new Error('Empty commnad');
    }

    let domain = url.parse(link).host;

    let data = await fetch(`${link}.json`, { headers: client.config.headers })
      .then((res) => {
        if (res.status == 403) {
          throw new Error('Banned');
        }

        return res.json();
      })
      .catch((err) => {
        if (err.message.includes('invalid json response body')) {
          throw new Error('invalid json');
        } else if (err.message.includes('timeout')) {
          throw new Error('timeout');
        } else {
          throw new Error(err.message);
        }
      });

    let vars = '';

    for (let variant of data.product.variants) {
      vars += `${variant.title} - ${variant.id}\n`;
    }

    vars += '\n';

    let image = '';

    if (data['product']['image']['src'] != undefined) {
      image = data['product']['image']['src'];
    }

    const embed = new Discord.MessageEmbed()
      .setColor(16777214)
      .setTitle(data['product']['title'])
      .setURL(link)
      .setThumbnail(image != '' ? image : null)
      .addFields(
        { name: 'Price', value: `$${data['product']['variants'][0]['price']}`, inline: true },
        { name: 'Site', value: domain, inline: true },
        { name: 'Variants', value: '```' + vars + '```' }
      );

    message.channel
      .send(embed)
      .then(console.log(`${message} completed\n`))
      .catch((err) => {
        console.log(err);
        throw new Error('Unable to send embed');
      });
  } catch (err) {
    console.log(err);

    if (err.message == 'Empty command') {
      message.channel.send('```Command is missing valid shopify link```');
    } else if (err.message == 'invalid json') {
      message.channel.send('```Error retrieving variants```');
    } else if (err.message == 'timeout') {
      message.channel.send('```Site has proxy protection enabled```');
    } else if (err.message == 'Unable to send embed') {
      message.channel.send('```Unexpected Error```');
    } else if (err.message == 'Banned') {
      message.channel.send('```Error 403 - Banned```');
    } else {
      message.channel.send('```Unexpected Error```');
    }
  }
};
