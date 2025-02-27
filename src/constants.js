const DB_NAME = "mernyoutube";

const cookieOptions = (tokenType) => {
  if (!["access", "refresh"].includes(tokenType)) {
    throw new Error("Invalid token type. Must be 'access' or 'refresh'.");
  }

  return {
    httpOnly: true, // Ensures the cookie is only accessible via HTTP(S), not JavaScript
    secure: true, // Sends cookie over HTTPS in production
    sameSite: "none", // Prevents CSRF attacks
    // maxAge: maxAgeValues[tokenType], // Sets the expiration time based on the token type
  };
};

export { DB_NAME, cookieOptions };
