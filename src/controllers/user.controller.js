import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/apiResponse.js';


const generateAccessTokenAndRefreshAcessToken = async(userId) =>{
   try {

    const user = await User.findById(userId)
    const AccessToken =  user.generateAccessToken()
    const RefreshToken =  user.generateRefreshToken()

    user.RefreshToken = RefreshToken
    await user.save({validateBeforeSave : false});

    return {
      AccessToken,
      RefreshToken
    }
    
   } catch (error) {
     throw new ApiError(500 , "Something went wrogn while generate refresh and acess token")
   }
}

const registerUser = asyncHandler(async (req, res) => {
  const { username, fullname, password, email ,  } = req.body;
    
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

  if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage > 0 ){
     coverImageLocalPath = req.files.coverImage[0].path
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, 'Avatar file is required ');
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  console.log(avatar);

  if (!avatar) {
    throw new  ApiError(400, 'Avatar is required');
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
    throw new  ApiError(500, 'Some went wrong while registering user');
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, 'User register Successfully'));
});

const loginUser = asyncHandler(async(req,res)=>{
   const {username , email , password} = req.body

   if(!username || !email){
     throw new ApiError(400 , "Username or Email is Required")
   }

   const user = await User.findOne({
     $or : [{username} , {email}]
   })

   if(!user){
     throw new ApiError(401 , "User does not exist");
   }

   const isPasswordValid = await user.isPasswordCorrect(password);

   if(!isPasswordValid){
    throw new ApiError(401 , "Invalid Password Crenditial");
   }

  const {AccessToken , RefreshToken}  = await generateAccessTokenAndRefreshAcessToken(user._id);

  const loggedInuser = await User.findById(user._id)
  .select("-password -refreshToken")
   
   // for cookie method

  const options = {
     httpOnly : true,
     secure : true
  }

  return res.
  status(200)
  .cookie("accessToken" , AccessToken , options)
  .cookie("refreshToken" , RefreshToken , options)
  .json(
    new ApiResponse(
      {
        user :loggedInuser, RefreshToken , AccessToken
      },
      "User LoggedIn Successfully"
    )
  )
});

export const logoutUser = asyncHandler(async(req ,res)=>{
    await User.findByIdAndUpdate(
      req.user._id,
      {
         $set : {
            refreshToken : undefined
         }
      },
      {
        new : true
      }
    )

    const options = {
     httpOnly : true,
     secure : true
  }
   
  return res
  .status(200)
  .clearCookie("accessToken" , options)
  .clearCookie("refreshToken" , options)
  .json(new ApiResponse(200 , {} , "User is Logout Successfully"));
})

export { registerUser , loginUser , logoutUser };
