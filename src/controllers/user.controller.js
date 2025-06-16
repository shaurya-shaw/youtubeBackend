import mongoose from "mongoose";
import asynHandler from "../utils/AsyncHandler.js";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const registerUser = asynHandler(async (req, res) => {
  //get user data from the body
  //validate the data is not empty
  //check if user already exits:username,email
  //checks for images,checks for avatar
  //upload it on cloudinary
  //create user object ,entry in db
  //remove password and refresh token field from response
  //check for user creation
  //return res
  console.log(req.body);

  const { userName, email, password, fullName } = req.body;
  console.log(userName);

  if (
    [userName, email, password, fullName].some((field) => {
      field.trim() == "";
    })
  ) {
    throw new ApiError(404, "all fields are required");
  }

  const exisitedUser = await User.findOne({
    $or: [{ userName }, { email }],
  });

  if (exisitedUser) {
    throw new ApiError(409, "user already exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  console.log(avatarLocalPath);

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(409, "avatar required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  console.log(avatar);

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    userName: userName.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "something went wrong while creating a user");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, createdUser, "user registered successfully"));
});

export { registerUser };
