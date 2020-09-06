const Money = require('js-money');

exports.run = async (client, message, args) => {
  try {
    if (args.length == 0) {
      throw new Error('Empty command');
    } else if (args.length > 1) {
      throw new Error('Too many args');
    }

    if (isNaN(args[0])) {
      throw new Error('Enter num');
    }

    let num = Money.fromDecimal(parseInt(args[0]), 'USD');

    let StockXFee1 = num.multiply(0.095);
    let StockXFee2 = num.multiply(0.09, Math.ceil);
    let StockXFee3 = num.multiply(0.085, Math.ceil);
    let StockXFee4 = num.multiply(0.08, Math.ceil);

    let StockXFeeTransfer = num.multiply(0.03, Math.ceil);

    if (StockXFee1.lessThanOrEqual(new Money(700, Money.USD))) {
      StockXFee1 = new Money(700, Money.USD);
    }
    if (StockXFee2.lessThanOrEqual(new Money(700, Money.USD))) {
      StockXFee2 = new Money(700, Money.USD);
    }
    if (StockXFee3.lessThanOrEqual(new Money(700, Money.USD))) {
      StockXFee3 = new Money(700, Money.USD);
    }
    if (StockXFee4.lessThanOrEqual(new Money(700, Money.USD))) {
      StockXFee4 = new Money(700, Money.USD);
    }

    StockXFee1 = StockXFee1.add(StockXFeeTransfer);
    StockXFee2 = StockXFee2.add(StockXFeeTransfer);
    StockXFee3 = StockXFee3.add(StockXFeeTransfer);
    StockXFee4 = StockXFee4.add(StockXFeeTransfer);

    let StockXRevenue1 = num.subtract(StockXFee1, Math.ceil);
    let StockXRevenue2 = num.subtract(StockXFee2, Math.ceil);
    let StockXRevenue3 = num.subtract(StockXFee3, Math.ceil);
    let StockXRevenue4 = num.subtract(StockXFee4, Math.ceil);

    let GoatFee1 = num.multiply(0.095, Math.ceil);
    GoatFee1 = GoatFee1.add(new Money(500, Money.USD));
    let GoatFee2 = num.subtract(GoatFee1, Math.ceil);
    GoatFee2 = GoatFee2.multiply(0.029, Math.ceil);
    GoatFee1 = GoatFee1.add(GoatFee2, Math.ceil);
    let GoatRevenue = num.subtract(GoatFee1, Math.ceil);

    let SGFee = num.multiply(0.2, Math.ceil);
    let SGRevenue = num.subtract(SGFee, Math.ceil);

    message.channel
      .send({
        embed: {
          title: `Fee for $${num}`,
          color: 16777214,
          fields: [
            // { name: 'Marketplace', value: 'StockX Level 1', inline: true },
            // { name: 'Fee', value: `$${StockXFee1}`, inline: true },
            // { name: 'Revenue', value: `$${StockXRevenue1}`, inline: true },
            { name: 'Marketplace', value: 'StockX Level 2', inline: true },
            { name: 'Fee', value: `$${StockXFee2}`, inline: true },
            { name: 'Revenue', value: `$${StockXRevenue2}`, inline: true },
            // { name: 'Marketplace', value: 'StockX Level 3', inline: true },
            // { name: 'Fee', value: `$${StockXFee3}`, inline: true },
            // { name: 'Revenue', value: `$${StockXRevenue3}`, inline: true },
            // { name: 'Marketplace', value: 'StockX Level 4', inline: true },
            // { name: 'Fee', value: `$${StockXFee4}`, inline: true },
            // { name: 'Revenue', value: `$${StockXRevenue4}`, inline: true },
            { name: 'Marketplace', value: 'Goat', inline: true },
            { name: 'Fee', value: `$${GoatFee1}`, inline: true },
            { name: 'Revenue', value: `$${GoatRevenue}`, inline: true },
            { name: 'Marketplace', value: 'Stadium Goods', inline: true },
            { name: 'Fee', value: `$${SGFee}`, inline: true },
            { name: 'Revenue', value: `$${SGRevenue}`, inline: true },
          ],
        },
      })
      .then(console.log(`${message} completed`));
  } catch (err) {
    console.log(err);

    if (err.message == 'Empty Command') {
      message.channel.send('```Command is missing valid fee```');
    } else if (err.message == 'Enter num') {
      message.channel.send('```Invalid command enter a valid number```');
    } else if (err.message == 'Too many args') {
      message.channel.send('```Command has too many arguments```');
    } else {
      message.channel.send('```Unexpected Error```');
    }
  }
};
