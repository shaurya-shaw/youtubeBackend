import { configDotenv } from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

configDotenv({
  path: "./.env",
});

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return console.log("no localFilePath");
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    console.log("file is uploaded on cloudinary successsfully");

    // console.log(response);

    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    return "file nahi ho rha";
  }
};

export { uploadOnCloudinary };
