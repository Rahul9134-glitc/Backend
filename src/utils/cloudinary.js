import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localpath) => {
  try {
    if (!localpath) return null;
     //upload file on cloudinary 

     const response = await cloudinary.uploader.upload(localpath, {
      resource_type: 'auto',
    });
    // File has been upload sucessfully

    console.log("File upload on cloudinary" , response.url);

    return response;

  } catch (error) {
    fs.unlinkSync(localpath); //remove the locally saved temprory as the operation got failed
    console.error("❌ Cloudinary upload failed" , error.message);
    return null;
  }
  finally{
      //always doing localfile clear .
      if (fs.existsSync(localpath)) fs.unlinkSync(localpath);
  }
};


const deleteCloudinary = async (publicId)=>{
   if(!publicId){
     console.log("PublicID is missing . Cannot delete resource");
     return null;
   }

   try{
     const result = await cloudinary.uploader.destroy(publicId);
     console.log(`Resource with publicId ${publicId} delete Successfully` , result);
     return result

   }catch(error){  
    console.error(`While deleting resources from cloudinary with publicId ${publicId}`, error.message)
    return null;
   }
}


export {uploadOnCloudinary , deleteCloudinary}