import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadCloudinary = async (localfilePath) => {
  try {
    if (!localfilePath) return null;
    const response = await cloudinary.uploader.upload(localfilePath, {
      resource_type: "auto",
    });
    fs.unlinkSync(localfilePath); //delete file from local storage after uploading on cloudinary
    return response; // response, which contains details such as the uploaded file’s URL
  } catch (error) {
    fs.unlinkSync(localfilePath);
    return null;
  }
};
export { uploadCloudinary };
