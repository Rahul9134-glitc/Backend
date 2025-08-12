import mongoose from 'mongoose';
import  DB_NAME  from '../contants.js';

const DBconnect = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGO_URI}/${DB_NAME}`
    );
    console.log(`\n DB is connected !! DB:HOST on ${connectionInstance.connection.host}`);
  } catch (error) {
    console.log('Something went error in Database connection : ', error);
    process.exit(1);
  }
};


export default DBconnect;