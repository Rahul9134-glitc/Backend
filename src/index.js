import DBconnect from "./db/index.js";
import dotenv from "dotenv";
import { app } from "./app.js";


dotenv.config({
    path:"./env"
});

DBconnect()
.then(()=>{
   app.listen(process.env.PORT || 8000 , ()=>{
    console.log(`Server is connected ${process.env.PORT}`)
   })
})
.catch((error)=>{
    console.log(`Database  is not Connected ${error}` );
})













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