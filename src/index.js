import { configDotenv } from "dotenv";
import { app } from "./app.js";
import db_connection from "./db/index.js";

configDotenv({
  path: "./.env",
});

db_connection()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`server is running on port ${process.env.PORT}`);
      console.log(process.env.CLOUDINARY_CLOUD_NAME);
    });
  })
  .catch((err) => {
    console.log("mongodb connection error", err);
  });

// import express from "express";
// const app = express();

// (async () => {
//   try {
//     await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//     app.on("error", (error) => {
//       console.log("error", error);
//       throw error;
//     });
//     app.listen(`server is listeneing on port:${process.env.PORT}`);
//   } catch (error) {
//     console.log(error);
//     throw error;
//   }
// })();
