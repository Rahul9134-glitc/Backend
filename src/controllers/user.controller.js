import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/apiResponse.js';

const registerUser = asyncHandler(async (req, res) => {
  const { username, fullname, password, email } = req.body;
  console.log(fullname);
  console.log(password);

  if (
    [fullname, username, password, email].some(
      (feilds) => feilds?.trim() === ''
    )
  ) {
    throw new ApiError(400, 'All feilds are required');
  }

  const ExistsUser = User.findOne({
    $or: [{ username }, { email }],
  });

  if (ExistsUser) {
    throw ApiError(409, 'Username and email aleady exist');
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, 'Avatar file is required ');
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw ApiError(400, 'Avatar is required');
  }

  const user = await User.create({
    fullname,
    password,
    email,
    username: username.toLowerCase(),
    avatar: avatar.url,
    coverImage: coverImage?.url || '',
  });

  const createdUser = await User.findById(user._id).select(
    '-password -refreshToken'
  );
  if (!createdUser) {
    throw ApiError(500, 'Some went wrong while registering user');
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, 'User register Successfully'));
});

export { registerUser };
