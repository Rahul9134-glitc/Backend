import DBconnect from "./db/index.js";
import dotenv from "dotenv";


dotenv.config({
    path:"./env"
});

DBconnect();













// (async () => {
//     try{
//        await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)
//         app.on("error" , ()=>{
//             console.log("My database is not talk to express" , error);
//             throw error;
//         });

//         app.listen(process.env.PORT , ()=>{
//             console.log(`Server is started on ${process.env.PORT}`)
//         });
//     }catch(error){
//         console.log(error);
//         throw error;
//     }
// })()