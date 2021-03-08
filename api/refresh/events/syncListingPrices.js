const Listings = require('../../../models/listings.js');

module.exports = async (userListingsArray, aliasListings) => {
  let modified = false;

  for (let userListing of userListingsArray) {
    if (aliasListings.listing) {
      for (let aliasListing of aliasListings.listing) {
        let crntPrice = parseInt(aliasListing.price_cents);

        if (userListing.id == aliasListing.id && userListing.price != crntPrice) {
          modified = true;

          await Listings.updateOne(
            { 'aliasListings.id': userListing.id },
            { $set: { 'aliasListings.$.price': crntPrice } }
          ).catch((err) => console.log(err));
        }
      }
    }
  }

  return modified;
};
