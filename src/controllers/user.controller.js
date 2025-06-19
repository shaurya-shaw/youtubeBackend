import mongoose from "mongoose";
import asynHandler from "../utils/AsyncHandler.js";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";

const generateAccessTokenAndRefreshToken = async (user_id) => {
  try {
    const user = await User.findById(user_id);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    user.save({ validateBeforeSave: false });

    return { refreshToken, accessToken };
  } catch (error) {
    return new ApiError(
      500,
      "generation access token and refresh token failed"
    );
  }
};

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

const loginUser = asynHandler(async (req, res) => {
  //take username email and password
  //find user in the database with it
  //check if the entered password matches with the given password
  //if it doesn't return the error(the paossord)
  //generate access and refresh token
  //save access and refresh token to cookie
  //return res

  console.log(req.body);

  const { userName, email, password } = req.body;

  if (!userName && !email) {
    throw new ApiError(401, "username and email is required");
  }

  const user = await User.findOne({
    $or: [{ userName }, { email }],
  });

  if (!user) {
    throw ApiError(404, "user does not exists");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "password is incorrect");
  }

  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshToken(user._id);

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          refreshToken,
          accessToken,
        },
        "logged in successfully"
      )
    );
});

const logoutUser = asynHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // this removes the field from document
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(200)
    .clearCookie("refreshToken", options)
    .clearCookie("accessToken", options)
    .json(new ApiResponse(200, {}, "logout successfully"));
});

const refreshAccessToken = asynHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken ||
    req.headers("Authorization").replace("Bearer ", "");

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken._id);

    if (!user) {
      throw new ApiError(401, "invalid refesh token");
    }

    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(404, "refresh token expired");
    }

    const { refreshToken, accessToken } =
      await generateAccessTokenAndRefreshToken(user._id);

    const options = {
      httpOnly: true,
      secure: true,
    };

    res
      .status(200)
      .cookie("refreshToken", refreshToken, options)
      .cookie("accessToken", accessToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "invalid refresh token");
  }
});

const updatePassword = asynHandler(async (req, res) => {
  //get  oldpassword newpassword
  //apply user method is password correct giving oldpass
  //if wrong give error
  //set newpassword to user model and save it
  //return res

  const { oldPassword, newPassword } = req.body;

  const user = req.user;

  if (!user) {
    throw new ApiError(500, "cannot get existing user");
  }

  const isPasswordValid = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordValid) {
    throw new ApiError(401, "wrong password entered");
  }

  user.password = newPassword;
  user.save({ validateBeforeSave: false });

  res.status(200).json(new ApiResponse(200, "password changed successfully"));
});

const getCurrentUser = asynHandler(async (req, res) => {
  const user = await User.findById(req.user?._id).select(
    "-password -refreshToken"
  );

  res
    .status(200)
    .json(
      new ApiResponse(200, { user: user }, "got current user Successfully")
    );
});

const updateUserDetails = asynHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(401, "enter your fullname and email");
  }

  const UpdatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { fullName, email },
    },
    { new: true }
  ).select("-password -refreshToken");

  res
    .status(200)
    .json(new ApiResponse(200, UpdatedUser, "user details updated"));
});

const updateAvatar = asynHandler(async (req, res) => {
  const oldUser = req.user;

  const avatarLocalPath = req.files?.avatar[0]?.path;

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar) {
    throw new ApiError(500, "upload failed");
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { avatar: avatar.url },
    },
    { new: true }
  ).select("-password -refreshToken");

  if (!updatedUser) {
    throw new ApiError(500, "avatar updation failed");
  }

  const oldCloudFilePath = oldUser.avatar;
  console.log(oldCloudFilePath);
  let fileOriginalName = oldCloudFilePath.split("/").pop();
  fileOriginalName = fileOriginalName.split(".")[0];

  await deleteOnCloudinary(fileOriginalName);

  res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "avatar updated successfully"));
});
const updateCoverImage = asynHandler(async (req, res) => {
  const oldUser = req.user;

  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage) {
    throw new ApiError(500, "upload failed");
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { coverImage: coverImage.url },
    },
    { new: true }
  ).select("-password -refreshToken");

  if (!updatedUser) {
    throw new ApiError(500, "coverImage updation failed");
  }

  const oldCloudFilePath = oldUser.coverImage;
  console.log(oldCloudFilePath);
  let fileOriginalName = oldCloudFilePath.split("/").pop();
  fileOriginalName = fileOriginalName.split(".")[0];

  await deleteOnCloudinary(fileOriginalName);

  res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "coverImage updated successfully"));
});

const getUserChannelProfile = asynHandler(async (req, res) => {
  const { userName } = req.params;

  if (!userName) {
    throw new ApiError(401, "username is missing");
  }

  const channel = await User.aggregate([
    {
      $match: {
        userName: userName?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscriberCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            $if: { $in: [req.user._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        userName: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "channel does not exists");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "user channel fetched successfully")
    );
});

const getWatchHistory = asynHandler(async (req, res) => {
  const user = User.aggregate([
    {
      $match: {
        _id: mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    userName: 1,
                    fullName: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(200, user[0].watchHistory, "watchHistory fetched successfully");
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  updatePassword,
  getCurrentUser,
  updateUserDetails,
  updateAvatar,
  updateCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
