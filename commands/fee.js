const Money = require('js-money');
const sendWebhook = require('./sendWebhook');

exports.run = async (client, message, args) => {
  let num = Money.fromDecimal(parseInt(message.content.slice(5)), 'USD');

  let StockXFee1 = num.multiply(0.09, Math.ceil);
  let StockXFee2 = num.multiply(0.03, Math.ceil);
  StockXFee1 = StockXFee1.add(StockXFee2);
  let StockXRevenue = num.subtract(StockXFee1, Math.ceil);

  let GoatFee1 = num.multiply(0.095, Math.ceil);
  GoatFee1 = GoatFee1.add(new Money(500, Money.USD));
  let GoatFee2 = num.subtract(GoatFee1, Math.ceil);
  GoatFee2 = GoatFee2.multiply(0.029, Math.ceil);
  GoatFee1 = GoatFee1.add(GoatFee2, Math.ceil);
  let GoatRevenue = num.subtract(GoatFee1, Math.ceil);

  let SGFee = num.multiply(0.2, Math.ceil);
  let SGRevenue = num.subtract(SGFee, Math.ceil);

  let fee = {
    username: 'Fee Calculator',
    embeds: [
      {
        title: 'Fee for $' + num,
        color: 16777214,
        fields: [
          {
            name: 'Marketplace',
            value: 'StockX',
            inline: true,
          },
          {
            name: 'Fee',
            value: '$' + StockXFee1,
            inline: true,
          },
          {
            name: 'Revenue',
            value: '$' + StockXRevenue,
            inline: true,
          },
          {
            name: 'Marketplace',
            value: 'Goat',
            inline: true,
          },
          {
            name: 'Fee',
            value: '$' + GoatFee1,
            inline: true,
          },
          {
            name: 'Revenue',
            value: '$' + GoatRevenue,
            inline: true,
          },
          {
            name: 'Marketplace',
            value: 'Stadium Goods',
            inline: true,
          },
          {
            name: 'Fee',
            value: '$' + SGFee,
            inline: true,
          },
          {
            name: 'Revenue',
            value: '$' + SGRevenue,
            inline: true,
          },
        ],
      },
    ],
  };

  await sendWebhook(fee).then(console.log(`${message} completed`));
};
