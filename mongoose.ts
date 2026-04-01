import mongoose from "mongoose";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const MONGODB_URL = process.env.MONGODB_URL;

if (!MONGODB_URL) {
  throw new Error("Missing MONGODB_URL in environment variables.");
}

const mongoUrl: string = MONGODB_URL;

mongoose.set("strictQuery", true);

const cache: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };
global.mongooseCache = cache;

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cache.conn) {
    return cache.conn;
  }

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(mongoUrl, {
        bufferCommands: false,
      })
      .then((instance) => instance)
      .catch((error: unknown) => {
        cache.promise = null;
        const message = error instanceof Error ? error.message : "Unknown MongoDB connection error";
        throw new Error(`Failed to connect to MongoDB: ${message}`);
      });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}
