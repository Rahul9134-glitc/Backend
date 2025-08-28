import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(
  express.json({
    limit: '16kb',
  })
);

app.use(
  express.urlencoded({
    extended : true,
    limit: '16kb',
  })
);

app.use(express.static('public'));
app.use(cookieParser());


//import Router 

import UserRouter from "./routes/user.routes.js"
import CommentRouter from "./routes/comment.routes.js"
import VideoRouter from "./routes/video.routes.js"
app.use("/api/v1/users" , UserRouter);
app.use("/api/v1/comments" , CommentRouter);
app.use("/api/v1/videos" , VideoRouter )


export { app };
