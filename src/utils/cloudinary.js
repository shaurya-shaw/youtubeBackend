import { configDotenv } from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { ApiError } from "./ApiError.js";

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
    fs.unlinkSync(localFilePath);
    // console.log(response);

    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    return "file nahi ho rha";
  }
};

const deleteOnCloudinary = async (cloudFilePath) => {
  try {
    if (!cloudFilePath) {
      throw new ApiError(404, "wrong file path name");
    }

    await cloudinary.uploader.destroy(cloudFilePath, {
      resource_type: "image",
    });

    console.log("file is successfully deleted from cloudinary");
  } catch (error) {
    console.log(error);

    throw new ApiError(500, "not able to upload on cloudinary");
  }
};

export { uploadOnCloudinary, deleteOnCloudinary };
