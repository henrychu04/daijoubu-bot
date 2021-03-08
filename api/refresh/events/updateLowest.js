const getAllListings = require('../../requests/getAllListings.js');
const updateReq = require('../../requests/updateReq.js');
const getProductAvailability = require('../../requests/getProductAvailability.js');

const Listings = require('../../../models/listings.js');

module.exports = async (client, user, loginToken, allListings) => {
  const userListings = await Listings.find({ d_id: user.d_id });
  const userListingsArray = userListings[0].aliasListings;

  let liveString = 'Listings Updated:\n';
  let live = 0;
  let unadjustedLiveString = `Live Listings Not Updated:\nNew lowest ask out of range of Max Price Adjustment Range - '${user.settings.maxAdjust}'\n`;
  let unadjustedLive = 0;
  let manualString = 'Listings With a New Lowest Ask:\n';
  let manual = 0;

  for (let listing of userListingsArray) {
    if (allListings.has(listing.slug)) {
      let existing = allListings.get(listing.slug);

      for (size of existing.availability) {
        if (size.size == listing.size && size.lowest_price_cents) {
          let lowest = parseInt(size.lowest_price_cents);
          let changed = false;

          if (lowest != listing.lowest) {
            if (listing.setting == 'manual') {
              manualString += `\t${manual}. ${listing.name} - ${listing.size} $${listing.price / 100}\n\t\t$${
                listing.lowest / 100
              } => $${lowest / 100}\n`;
              manual++;
            }

            await Listings.updateOne(
              { 'aliasListings.id': listing.id },
              { $set: { 'aliasListings.$.lowest': lowest } }
            ).catch((err) => console.log(err));

            changed = true;
          }

          if (listing.setting == 'live' && lowest != listing.price) {
            if (parseInt(listing.price) - parseInt(lowest) <= user.settings.maxAdjust * 100) {
              await updateListing(client, loginToken, lowest, listing);

              liveString += `\t${live}. ${listing.name} - ${listing.size} $${listing.price / 100}\n\t\t$${
                listing.price / 100
              } => $${lowest / 100}\n`;
              live++;
            } else {
              if (changed) {
                unadjustedLiveString += `\t${unadjustedLive}. ${listing.name} - ${listing.size} $${
                  listing.price / 100
                }\n\t\tNew lowest ask: $${lowest / 100}\n`;
                unadjustedLive++;
              }
            }
          }
        }
      }
    } else {
      let pageData = await getProductAvailability(client, listing.slug);

      allListings.set(listing.slug, pageData);

      for (size of pageData.availability) {
        if (size.size == listing.size && size.lowest_price_cents) {
          let lowest = parseInt(size.lowest_price_cents);
          let changed = false;

          if (lowest != listing.lowest) {
            if (listing.setting == 'manual') {
              manualString += `\t${manual}. ${listing.name} - ${listing.size} $${listing.price / 100}\n\t\t$${
                listing.lowest / 100
              } => $${lowest / 100}\n`;
              manual++;
            }

            await Listings.updateOne(
              { 'aliasListings.id': listing.id },
              { $set: { 'aliasListings.$.lowest': lowest } }
            ).catch((err) => console.log(err));

            changed = true;
          }

          if (listing.setting == 'live' && lowest != listing.price) {
            if (parseInt(listing.price) - parseInt(lowest) <= user.settings.maxAdjust * 100) {
              await updateListing(client, loginToken, lowest, listing);

              liveString += `\t${live}. ${listing.name} - ${listing.size} $${listing.price / 100}\n\t\t$${
                listing.price / 100
              } => $${lowest / 100}\n`;
              live++;
            } else {
              if (changed) {
                unadjustedLiveString += `\t${unadjustedLive}. ${listing.name} - ${listing.size} $${
                  listing.price / 100
                }\n\t\tNew lowest ask: $${lowest / 100}\n`;
                unadjustedLive++;
              }
            }
          }
        }
      }
    }
  }

  if (user.webhook.length != 0) {  
    if (live > 0) {
      return [{ title: 'Listing Updates', body: '```' + liveString + '```' }];
    }
    
    if (unadjustedLive > 0) {
      return [{ title: 'Listing Updates', body: '```' + unadjustedLiveString + '```' }];
    }
    
    if (manual > 0 && user.settings.manualNotif) {
      return [{ title: 'Listing Updates', body: '```' + manualString + '```' }];
    }
  }
};

async function updateListing(client, loginToken, lowest, listing) {
  let listings = await getAllListings(client, loginToken);
  let obj = {};

  for (let i = 0; i < listings.listing.length; i++) {
    if (listings.listing[i].id == listing.id) {
      obj = listings.listing[i];
      break;
    }
  }

  obj.price_cents = lowest.toString();

  await updateReq(client, loginToken, obj);

  await Listings.updateOne(
    { 'aliasListings.id': listing.id },
    { $set: { 'aliasListings.$.price': lowest } }
  ).catch((err) => console.log(err));
}
