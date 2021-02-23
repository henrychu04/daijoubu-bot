const Listings = require('../../../models/listings.js');

module.exports = async (user, userListingsArray, aliasListings) => {
  for (let userListing of userListingsArray) {
    let crnt = userListing;
    let deleted = true;

    if (aliasListings.listing) {
      aliasListings.listing.forEach((listing) => {
        if (crnt.id == listing.id) {
          deleted = false;
        }
      });
    }

    if (!deleted) {
      continue;
    }

    await Listings.updateOne({ d_id: user.d_id }, { $pull: { aliasListings: { id: crnt.id } } }).catch((err) =>
      console.log(err)
    );
  }
};
