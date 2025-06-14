import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const db_connection = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    console.log("db host:", connectionInstance.connection.host);
  } catch (error) {
    console.log("mongodb connection failed!!", error);
    process.exit(1);
  }
};

export default db_connection;
