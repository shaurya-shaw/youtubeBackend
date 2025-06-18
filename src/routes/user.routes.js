import { Router } from "express";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateAvatar,
  updateCoverImage,
  updatePassword,
  updateUserDetails,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

// router.route("/login").post(loginUser);

router.route("/login").post(
  upload.none(), // This will parse form-data without expecting files
  loginUser
);

router.route("/refreshAccessToken").post(refreshAccessToken);

//secured routes

router.route("/logoutUser").post(verifyJwt, logoutUser);
router.route("/updatePassword").post(verifyJwt, updatePassword);
router.route("/getCurrentUser").post(verifyJwt, getCurrentUser);
router.route("/updateUserDetails").post(verifyJwt, updateUserDetails);
router.route("/updateAvatar").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
  ]),
  verifyJwt,
  updateAvatar
);
router
  .route("/updateCoverImage")
  .post(
    upload.fields([{ name: "coverImage", maxCount: 1 }]),
    verifyJwt,
    updateCoverImage
  );

export default router;
