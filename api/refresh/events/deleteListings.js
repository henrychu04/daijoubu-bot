const Listings = require('../../../models/listings.js');

module.exports = async (user, userListings, aliasListings) => {
  let modified = false;

  for (let userListing of userListings.aliasListings) {
    let deleted = true;

    if (aliasListings.listing) {
      for (let aliasListing of aliasListings.listing) {
        if (aliasListing.id == userListing.id) {
          deleted = false;
          break;
        }
      }
    }

    if (!deleted) {
      continue;
    }

    modified = true;

    await Listings.updateOne({ d_id: user.d_id }, { $pull: { aliasListings: { id: userListing.id } } }).catch((err) =>
      console.log(err)
    );
  }

  return modified;
};
