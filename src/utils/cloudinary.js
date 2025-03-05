import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

const extractPublicId = (fileUrl) => {
  if (!fileUrl) return null;
  const match = fileUrl.match(/\/upload\/(?:v\d+\/)?([^\.]+)/);
  return match ? match[1] : null;
};

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
    console.log(error);
    fs.unlinkSync(localfilePath);
    return null;
  }
};

const deleteInCloudinary = async (fileUrl) => {
  try {
    console.log("fileUrl: ", fileUrl);
    if (!fileUrl) {
      return null;
    }

    const publicId = extractPublicId(fileUrl);

    console.log("publicId: ", publicId);
    if (!publicId) {
      return null;
    }

    let resourceType = "image"; // Default to image

    if (fileUrl.match(/\.(mp4|mkv|mov|avi)$/)) {
      resourceType = "video";
    } else if (fileUrl.match(/\.(mp3|wav)$/)) {
      resourceType = "raw"; // For audio or other file types
    }
    console.log("resourceType: ", resourceType);
    const res = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    console.log("res: ", res);
    return res;
  } catch (error) {
    return null;
  }
};

export { uploadCloudinary, deleteInCloudinary };
