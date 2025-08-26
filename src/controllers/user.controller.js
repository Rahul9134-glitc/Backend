import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary , deleteCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/apiResponse.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const generateAccessTokenAndRefreshAcessToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return {
      accessToken,
      refreshToken,
    };
  } catch (error) {
    throw new ApiError(
      500,
      'Internal Server Error : Unable to generate tokens' 
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { username, fullname, password, email } = req.body;

  if (
    [fullname, username, password, email].some(
      (feilds) => feilds?.trim() === ''
    )
  ) {
    throw new ApiError(400, 'All feilds are required');
  }

  const ExistsUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (ExistsUser) {
    throw new ApiError(400, 'Username and email aleady exist');
  }

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage?.[0]?.path;  //that is optional this logic already work
  let coverImageLocalPath;

  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, 'Avatar file is required ');
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  console.log(avatar);

  if (!avatar) {
    throw new ApiError(400, 'Avatar is required');
  }

  const user = await User.create({
    fullname,
    password,
    email,
    username: username.toLowerCase(),
    avatar: {
      url : avatar.url,
      public_id : avatar.public_id
    },
    coverImage: coverImage
    ?{
      url : coverImage.url,
      public_id : coverImage.public_id
    }  
    :
    {
      url : '',
      public_id :''
    }
  });

  const createdUser = await User.findById(user._id).select(
    '-password -refreshToken'
  );
  if (!createdUser) {
    throw new ApiError(500, 'Some went wrong while registering user');
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, 'User register Successfully'));
});

const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!(username || email)) {
    throw new ApiError(400, 'Username or Email is Required');
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(401, 'User does not exist');
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid Credentials');
  }

  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshAcessToken(user._id);

  const loggedInuser = await User.findById(user._id).select(
    '-password -refreshToken'
  );

  // for cookie method

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie('accessToken', accessToken, options)
    .cookie('refreshToken', refreshToken, options)
    .json(
      new ApiResponse(
        {
          user: loggedInuser,
          refreshToken,
          accessToken,
        },
        'User LoggedIn Successfully'
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
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

  return res
    .status(200)
    .clearCookie('accessToken', options)
    .clearCookie('refreshToken', options)
    .json(new ApiResponse(200, {}, 'User is Logout Successfully'));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, 'Unauthorized request');
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, 'Invalid refresh token');
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, 'Refresh Token is expired or use');
    }

    const option = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessTokenAndRefreshAcessToken(user._id);

    return res
      .status(200)
      .cookie('accessToken', accessToken, option)
      .cookie('refreshToken', newRefreshToken, option)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          'Access Token Refreshed Sucessfully'
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.messge || 'Invalid refresh Token');
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, 'Invalid old Password');
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Password Succesfully Changed'));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json(
    new ApiResponse (200 , [req.user.fullname , req.user.username , req.user.email] , "Current user fetch successfully")
  );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;
  if (!fullname && !email) {
    throw new ApiError(400, 'Fullname and Email required for updation');
  }

  const updateUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email,
      },
    },
    {
      new: true,
    }
  ).select('-password');

  return res
    .status(200)
    .json(
      new ApiResponse(200, updateUser, 'Account details updated successfully')
    );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
   const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, 'Avatar file is missing ');
  }
    
  const user = await User.findById(req.user._id)

  if (user.avatar && user.avatar.public_id) {
        await deleteCloudinary(user.avatar.public_id);
  }


  const newAvatar = await uploadOnCloudinary(avatarLocalPath);

   if (!newAvatar || !newAvatar.url || !newAvatar.public_id) {
        throw new ApiError(500, 'Error while uploading new avatar');
    }

  const updateAvatar = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar:{
          url : newAvatar.url,
          public_id : newAvatar.public_id
        }
      },
    },
    {
      new: true,
    }
  ).select('-password');


  return res
  .status(200)
  .json( 
    new ApiResponse (200 ,updateAvatar,"Avatar is Updated Succesfully")
  );
});

const updateUserCoverImage = asyncHandler(async(req ,res)=>{
  const coverImageLocalPath = req.file?.path;

  if(!coverImageLocalPath){
    throw new ApiError(400 , "CoverImage is missing")
  }

  const user = await User.findById(req.user._id)
  if (user.coverImage && user.coverImage.public_id) {
        await deleteCloudinary(user.coverImage.public_id);
  }

    const newCoverImage = await uploadOnCloudinary(coverImageLocalPath)
   
   if (!newCoverImage || !newCoverImage.url || !newCoverImage.public_id) {
        throw new ApiError(500, "Error while uploading new cover image");
    }


  const updateCoverImage = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set : {
        coverImage : {
          url : newCoverImage.url,
          public_id : newCoverImage.public_id,
        }
      }
    },
    {
      new : true
    }
  ).select("-password")

  return res
  .status(200)
  .json(
    new ApiResponse(200, updateCoverImage, "Cover Image updated successfully")
  );

})

const getUserChannelProfile = asyncHandler(async(req ,res)=>{
  const {username} = req.params;
  
  if(!username?.trim()){
    throw new ApiError(400 , "username is missing");
  }     

  const channel = await User.aggregate([
    {
      $match : {
        username : username?.toLowerCase()
      }
    },
    {
      $lookup : {
        from : "subscriptions",
        localField : "_id",
        foreignField : "channel",
        as : "subscribers"
      }
    },
    {
      $lookup : {
        from : "subscriptions",
        localField : "_id",
        foreignField : "subscriber",
        as : "subscribedTo"
      }
    },
    {
      $addFields : {
        subscribersCount : {
          $size : "$subscribers"
        },
        channelsSubscribedCount : {
          $size : "$subscribedTo"
        },
        isSubscribed : {
          $cond : {
            if : {$in : [req.user?._id , "$subscribers.subscriber"]},
            then : true,
            else : false
          }
        }
      }
    },
    {
      $project : {
        fullname : 1,
        username : 1,
        subscribersCount : 1,
        channelsSubscribedCount : 1,
        isSubscribed : 1,
        avatar : 1,
        coverImage : 1,
        email : 1
      }
    }
  ])
  if(!channel?.length){
    throw new ApiError(400 , "Channel does not exist");
  }
  return res
  .status(200)
  .json(new ApiResponse (200 , channel[0] , "User channel fetched succesfully"))   
})

const getWatchHistory = asyncHandler(async(req ,res)=>{
  const user = await User.aggregate([
    {
      $match : {
        _id : new mongoose.Types.ObjectId(req.user._id)
      }
    },
    {
      $lookup : {
        from : "videos",
        localField : "watchHistory",
        foreignField : "_id",
        as : "watchHistory",
        pipeline : [
          {
            $lookup : {
              from : "users",
              localField :"owner",
              foreignField : "_id",
              as : "owner",
              pipeline : [
                {
                  $project : {
                    fullname : 1,
                    username : 1,
                    avatar : 1
                  }
                }
              ]
            }
          },
          {
            $addFields : {
              owner : {
                $first : "$owner"
              }
            }
          }
        ]
         
    }
    }
    

  ])

  return res
  .status(200)
  .json(
    new ApiResponse(200 , user[0].watchHistory , "Watch history fetch successfully")
  )
})

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory
};



