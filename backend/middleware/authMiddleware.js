const jwt = require("jsonwebtoken");

/**
 * Protect middleware — verifies the Bearer JWT on the Authorization header
 * and attaches the decoded payload to `req.user` for downstream handlers.
 */
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res
      .status(401)
      .json({
        success: false,
        code: "AUTH_REQUIRED",
        message: "Not authorized — no token provided",
      });
  }

  const match =
    typeof authHeader === "string" && authHeader.trim().match(/^Bearer\s+(\S+)$/i);
  if (!match) {
    return res
      .status(401)
      .json({
        success: false,
        code: "TOKEN_INVALID",
        message: "Not authorized — expected a Bearer token",
      });
  }

  if (!process.env.JWT_SECRET) {
    return res
      .status(500)
      .json({ success: false, message: "Authentication is not configured" });
  }

  let decoded;
  try {
    decoded = jwt.verify(match[1], process.env.JWT_SECRET);
  } catch {
    return res
      .status(401)
      .json({
        success: false,
        code: "TOKEN_INVALID",
        message: "Not authorized — token is invalid or expired",
      });
  }

  if (
    !decoded ||
    typeof decoded !== "object" ||
    typeof decoded.id !== "string" ||
    !/^[\da-f]{24}$/i.test(decoded.id)
  ) {
    return res
      .status(401)
      .json({
        success: false,
        code: "TOKEN_INVALID",
        message: "Not authorized — token is invalid or expired",
      });
  }

  req.user = decoded;
  return next();
};

module.exports = protect;