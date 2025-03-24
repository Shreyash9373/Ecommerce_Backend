const DB_NAME = "Ecommerce";

const cookieOptions = (tokenType) => {
  if (!["access", "refresh"].includes(tokenType)) {
    throw new Error("Invalid token type. Must be 'access' or 'refresh'.");
  }

  return {
    httpOnly: true, // Ensures the cookie is only accessible via HTTP(S), not JavaScript
    secure: process.env.PRODUCTION, // Sends cookie over HTTPS in production
    // sameSite: process.env.PRODUCTION ? "strict" : "lax", // Prevents CSRF attacks
    sameSite: 'none', // Prevents CSRF attacks

    // maxAge: maxAgeValues[tokenType], // Sets the expiration time based on the token type
  };
};

export { DB_NAME, cookieOptions };
