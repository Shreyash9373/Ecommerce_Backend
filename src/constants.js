const DB_NAME = "Ecommerce";
production = process.env.PRODUCTION;

const cookieOptions = (tokenType) => {
  if (!["access", "refresh"].includes(tokenType)) {
    throw new Error("Invalid token type. Must be 'access' or 'refresh'.");
  }

  return {
    httpOnly: true, // Ensures the cookie is only accessible via HTTP(S), not JavaScript
    secure: production, // Sends cookie over HTTPS in production
    sameSite: production ? "strict" : "lax", // Prevents CSRF attacks
    // maxAge: maxAgeValues[tokenType], // Sets the expiration time based on the token type
  };
};

export { DB_NAME, cookieOptions };
