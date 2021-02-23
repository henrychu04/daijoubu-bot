const Listings = require('../../../models/listings.js');

module.exports = async (user, userListingsArray, aliasListings) => {
  if (aliasListings.listing) {
    for (let i = 0; i < aliasListings.listing.length; i++) {
      let crnt = aliasListings.listing[i];
      let exist = false;

      userListingsArray.forEach((listing) => {
        if (listing.id == crnt.id) {
          exist = true;
        }
      });

      if (exist) {
        continue;
      }

      let obj = {
        id: crnt.id,
        name: crnt.product.name,
        size: parseFloat(crnt.size_option.value),
        price: parseInt(crnt.price_cents),
        slug: crnt.product.id,
        lowest: parseInt(crnt.product.lowest_price_cents),
        setting: user.settings.adjustListing,
      };

      await Listings.updateOne({ d_id: user.d_id }, { $push: { aliasListings: obj } }).catch((err) => console.log(err));
    }
  }
};
