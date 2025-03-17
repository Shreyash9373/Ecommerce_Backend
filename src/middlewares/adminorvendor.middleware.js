import { verifyJwtAdmin } from "./admin.middleware.js";
import { verifyJwtVendor } from "./vendor.middleware.js";

const verifyJwtVendorOrAdmin = (req, res, next) => {
  verifyJwtVendor(req, res, (err) => {
    if (!err) return next(); // If vendor check passes, proceed

    // If vendor check fails, try admin check
    verifyJwtAdmin(req, res, (err) => {
      if (!err) return next(); // If admin check passes, proceed

      // If both fail, return an unauthorized response
      return res.status(403).json({ message: "Access Denied" });
    });
  });
};

export default verifyJwtVendorOrAdmin;
