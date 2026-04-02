import { Router } from "express";
import { changeCurrentPassword, getCurrentUser, loginUser, logoutUser, refressAccessToken, registerUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage } from "../controllers/user.controller.js";
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

router.put(
    "/update-profile",
    verifyJWT,
    updateAccountDetails
);

router.put(
    "/update-avatar",
    upload.single("avatar"),
    verifyJWT,
    updateUserAvatar
);

router.put(
    "/update-cover-image",
    upload.single("coverImage"),
    verifyJWT,
    updateUserCoverImage
);

export default router;