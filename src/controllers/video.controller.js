import { Video } from '../models/video.model';
import { User } from '../models/user.model';
import { uploadOnCloudinary, deleteCloudinary } from '../utils/cloudinary';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { isValidObjectId } from 'mongoose';

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  const pipeline = [];

  if (userId) {
    if (!isValidObjectId(userId)) {
      throw new ApiError(400, 'Invalid userId');
    }
  }

  pipeline.push({
    $match: {
      owner: new mongoose.Types.ObjectId(userId),
    },
  });

  if (query) {
    pipeline.push({
      $match: {
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
        ],
      },
    });
  }

  pipeline.push({
    $match: { isPublished: true },
  });

  pipeline.push({
    $lookup: {
      from: 'users',
      localField: 'owner',
      foreignField: '_id',
      as: 'ownerDetails',
      pipeline: [
        {
          $project: {
            username: 1,
            avatar: 1,
          },
        },
      ],
    },
  });

  pipeline.push({
    $unwind: '$ownerDetails',
  });

  if (sortBy && sortType) {
    pipeline.push({
      $sort: {
        [sortBy]: sortType === 'asc' ? 1 : -1,
      },
    });
  }

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const videos = await Video.aggregatePaginate(pipeline, options);

  return res
    .status(200)
    .json(new ApiResponse(200, videos, 'Videos fetched successfully'));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    throw new ApiError(400, 'Tittle and description is Important');
  }

  const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoFileLocalPath || !thumbnailLocalPath) {
    throw new ApiError(400, 'Thumbnail and videofile is important');
  }

  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoFile || !thumbnail) {
    throw new ApiError(
      500,
      'Something went wrong when video uploading on cloudinary'
    );
  }

  const video = await Video.create({
    title,
    description,
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    duration: videoFile.duration,
    owner: req.user?._id,
    isPublished: true,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, video, 'Video uplaoded succesfully'));
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video are missing");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            video,
            "Video recieved succesfully"
        )
    );
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;
    const thumbnailLocalPath = req.file?.path;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    if (!(title || description || thumbnailLocalPath)) {
        throw new ApiError(400, "tittle and description is important for field");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "no any video");
    }

    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You do not update video");
    }

    let updatedThumbnail;
    if (thumbnailLocalPath) {
        if (video.thumbnail) {
            const publicId = video.thumbnail.split('/').pop().split('.')[0];
            await deleteCloudinary(publicId);
        }
        updatedThumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: updatedThumbnail?.url || video.thumbnail,
            },
        },
        { new: true }
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            updatedVideo,
            "Video updated Successfully"
        )
    );
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video are missing");
    }


    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "Only delete owner of this video");
    }

    if (video.videoFile) {
        const videoPublicId = video.videoFile.split('/').pop().split('.')[0];
        await deleteCloudinary(videoPublicId);
    }
    if (video.thumbnail) {
        const thumbnailPublicId = video.thumbnail.split('/').pop().split('.')[0];
        await deleteCloudinary(thumbnailPublicId);
    }

    await Video.findByIdAndDelete(videoId);
    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Video deleted Successfully"
        )
    );
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video are missing");
    }

    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "Only for owner");
    }

    video.isPublished = !video.isPublished;
    await video.save({ validateBeforeSave: false });
    
    return res.status(200).json(
        new ApiResponse(
            200,
            video.isPublished,
            "Video status change successfully"
        )
    );
});


export{
    updateVideo,
    deleteVideo,
    publishAVideo,
    getAllVideos,
    togglePublishStatus,
    getVideoById
}
