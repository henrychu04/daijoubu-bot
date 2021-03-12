const Listings = require('../../../models/listings.js');

module.exports = async (user, userListings, aliasListings) => {
  let modified = false;

  if (aliasListings.listing) {
    for (let aliasListing of aliasListings.listing) {
      let exist = false;

      for (let userListing of userListings.aliasListings) {
        if (userListing.id == aliasListing.id) {
          exist = true;
          break;
        }
      }

      if (exist) {
        continue;
      }

      modified = true;

      let newListing = {
        id: aliasListing.id,
        name: aliasListing.product.name,
        size: parseFloat(aliasListing.size_option.value),
        price: parseInt(aliasListing.price_cents),
        slug: aliasListing.product.id,
        lowest: parseInt(aliasListing.product.lowest_price_cents),
        setting: user.settings.adjustListing,
      };

      await Listings.updateOne({ d_id: user.d_id }, { $push: { aliasListings: newListing } }).catch((err) =>
        console.log(err)
      );
    }
  }

  return modified;
};
