const genAccessAndRefreshTokens = async (admin) => {
  try {
    const accessToken = admin.generateAccessTokens();
    const refreshToken = admin.generateRefreshTokens();

    admin.refreshToken = refreshToken;
    await admin.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    console.log(error);
    throw new Error("Something went wrong while generating tokens");
  }
};

export { genAccessAndRefreshTokens };
