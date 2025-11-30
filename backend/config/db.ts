import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

if (!process.env.MONGO_URI) {
  console.error("MONGO_URI hasn't been defined.");
  process.exit(1);
}

const MONGO_URI: string = process.env.MONGO_URI;

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    if (err instanceof Error) {        
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
  }
};

export const disconnectDB = async () => {
    console.log('Disconnecte DB');
    await mongoose.connection.close();
}