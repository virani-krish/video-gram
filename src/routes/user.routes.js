import { Router } from "express";
import { changeCurrentPassword, getCurrentUser, getUserChannelProfile, getUserWatchHistory, loginUser, logoutUser, refressAccessToken, registerUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.post(
    "/register",
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
);

router.post(
    "/login",
    loginUser
);

// secured routes
router.post(
    "/logout",
    verifyJWT,
    logoutUser
)

router.post(
    "/refresh-token",
    refressAccessToken
)

router.post(
    "/update-password",
    verifyJWT,
    changeCurrentPassword
);

router.post(
    "/me",
    verifyJWT,
    getCurrentUser
);

router.patch(
    "/update-profile",
    verifyJWT,
    updateAccountDetails
);

router.patch(
    "/update-avatar",
    verifyJWT,
    upload.single("avatar"),
    updateUserAvatar
);

router.patch(
    "/update-cover-image",
    verifyJWT,
    upload.single("coverImage"),
    updateUserCoverImage
);

router.get(
    "/channel/:username",
    verifyJWT,
    getUserChannelProfile
);

router.get(
    "/watch-history",
    verifyJWT,
    getUserWatchHistory
);

export default router;