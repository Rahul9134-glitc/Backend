import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import { Comment } from "../models/comment.model";
import { Video } from "../models/video.model";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import mongoose ,{isValidObjectId} from "mongoose";


//adding comment for my videos 

const addComment = asyncHandler(async(req ,res)=>{
    const {videoId} = req.params
    const {content} = req.body

    if(!isValidObjectId(videoId)){
        throw new ApiError (400 , "Invalid video Id")
    }

    if(!content){
        throw new ApiError(400 , "contents are very important of comment")
    }

    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(404 , "Video is missing")
    }

    const comment = await Comment.create({
        content,
        video : videoId,
        owner : req.user._id
    })

    if(!comment){
        throw new ApiError(500 , "Something are error while you adding your comment")
    }

    return res
    .status(201)
    .json(new ApiResponse(201 , comment , "Comment added successfullly"))
});
const getVideoComment = asyncHandler(async(req ,res)=>{
    const {videoId} = req.params
    const {page = 1 , limit = 10} = req.query

    if(!isValidObjectId(videoId)){
        throw new ApiError(400 , "Invalid video ID");
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(404 , "Video are missing")
    }

    const commentAggregate = Comment.aggregate([
        {
            $match : {
                video : new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup : {
                from : "users",
                localField : "owner",
                foreignField : "_id",
                as : "owner",
                pipeline : [
                    {
                        $project : {
                            username : 1,
                            fullname : 1,
                            avatar : 1
                        }
                    }
                ]
            }
        },
        {
            $unwind : "$owner",
        },
        {
            $sort : {
                createdAt : -1
            }
        }
    ])

    const options = {
        page : parseInt(page , 10),
        limit : parseInt(limit , 10)
    }

    const comment = await Comment.aggregatePaginate(commentAggregate , options);

    if(!comment){
        throw new ApiError(500 , "Invalid comment")
    }

    return res 
    .status(201)
    .json(new ApiResponse(201 , comment , "Comment are created succesfully and taken comment successfully "))
})

const updateComment = asyncHandler(async(req ,res)=>{
    const {commentId} = req.params
    const {content} = req.body

    if(!isValidObjectId(commentId)){
        throw new ApiError(400 , "Invalid comment ID")
    }

    if(!content){
        throw new ApiError(400 , "Content is Important")
    }

    const comment = await Comment.findById(commentId);

    if(!comment){
        throw new ApiError(404 , "Not found")
    }

    if(comment.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(403 , "Only owner update this comment");
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set : {
                content,
            }
        },
        {
            new : true
        }
    )


    return res
    .status(200)
    .json(new ApiResponse(200 , updatedComment , "Comment is updated successfully"));
})

const deleteComment = asyncHandler(async(req ,res)=>{
     const {commentId} = req.params
     
    if(!isValidObjectId(commentId)){
        throw new ApiError(400 , "Invalid comment ID")
    }

    const comment = await Comment.findById(commentId);

    if(!comment){
        throw new ApiError(404 , "No any comment")
    }
    
     if(comment.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(403 , "Only owner update this comment");
    }

    await Comment.findByIdAndDelete(commentId)

    return res
    .status(200)
    .json(new ApiResponse(200 , {} , "Comment is deleted succesfully"))

})
export {
  addComment,
  getVideoComment,
  updateComment,
  deleteComment
} 