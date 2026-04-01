import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import jwt from 'jsonwebtoken';

const generateAccessAndRefreshToken = async (user) => {
    try {

        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validationBeforeSave: false }); // validationBeforeSave: false add here....

        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "Something went wronge while generating access and refresh token");
    }
}

const registerUser = asyncHandler(async (req, res) => {

    const { fullName, email, username, password } = req.body;

    if (
        [fullName, email, username, password].some((field) =>
            !field || field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({ $or: [{ email }, { username }] });

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;

    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required");
    }

    const user = await User.create({
        fullName,
        email,
        username: username,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registring the user");
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registed successfully")
    )

});

const loginUser = asyncHandler(async (req, res) => {

    const { email, username, password } = req.body;

    if (!email && !username) {
        throw new ApiError(400, "username or email one is required");
    }

    if (!password) {
        throw new ApiError(400, "password is required");
    }

    const user = await User.findOne({ $or: [{ email }, { username }] });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user);

    const options = {
        httpOnly: true,
        secure: true
    }

    const { password: _, refreshToken: __, ...safeUser } = user.toObject();

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, { user: safeUser, accessToken, refreshToken }, "User logged in succesfully")
        )

});


const logoutUser = asyncHandler(async (req, res) => {

    await User.findByIdAndUpdate(
        req.user._id,
        { $unset: { refreshToken: 1 } }
    );

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User Logged Out"))

});

const refressAccessToken = asyncHandler(async (req, res) => {

    try {
        const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken;

        if (!incomingRefreshToken) {
            throw new ApiError(401, "Unauthorize request");
        }

        const decodedRefreshToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

        const user = await User.findById(decodedRefreshToken?._id);

        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token")
        }

        if (user.refreshToken !== incomingRefreshToken) {
            throw new ApiError(401, "Invalid Refresh Token")
        }

        const { refreshToken: _, password: __, safeUser } = user.toObject();

        const { accessToken, newRefreshToken } = generateAccessAndRefreshToken(safeUser);

        const options = {
            httpOnly: true,
            secire: true
        }

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(new ApiResponse(200, { accessToken, newRefreshToken, user: safeUser }, "Access Token Refreshed successfully"));
    } catch (error) {
        throw new ApiError(400, error?.message || "Invalid Refresh Token")
    }

});

const changeCurrentPassword = asyncHandler(async (req, res) => {

    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Old password is wronge");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "password is update successfully")
        )

});

const getCurrentUser = asyncHandler(async (req, res) => {

    return res
        .status(200)
        .json(
            new ApiResponse(200, req.user, "User data get successfully")
        )

});

const updateAccountDetails = asyncHandler(async (req, res) => {

    const { fullName, email } = req.body;

    if (!fullName || !email) {
        throw new ApiError(400, "email and fullname are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: fullName, email },
        { new: true }
    )

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "User data updated successfully")
        );

});

const updateUserAvatar = asyncHandler(async (req, res) => {

    const avatarLocalPath = req.file?.avatar[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar?.url) {
        throw new ApiError(400, "Error while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { avatar: avatar.url } },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Avatar image updated successfully")
        );

});

const updateUserCoverImage = asyncHandler(async (req, res) => {

    const coverImageLocalPath = req.file?.coverImage[0]?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is required")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage?.url) {
        throw new ApiError(400, "Error while uploading cover image")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { coverImage: coverImage.url } },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Cover image updated successfully")
        );

});

export {
    registerUser,
    loginUser,
    logoutUser,
    refressAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
};