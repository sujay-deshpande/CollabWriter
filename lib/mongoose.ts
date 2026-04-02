import mongoose from 'mongoose'

let isConnected = false;
let connectingPromise: Promise<typeof mongoose> | null = null;

export const connectToDB = async () => {
    mongoose.set('strictQuery', true);

    if (!process.env.MONGODB_URL) {
        throw new Error('MONGODB_URL not found');
    }

    // Reuse existing established mongoose connection.
    if (isConnected || mongoose.connection.readyState === 1) {
        isConnected = true;
        return;
    }

    // If a connect attempt is already in-flight, await it instead of creating another.
    if (connectingPromise) {
        await connectingPromise;
        isConnected = true;
        return;
    }

    try {
        connectingPromise = mongoose.connect(process.env.MONGODB_URL);
        await connectingPromise;

        isConnected = true;

        console.log('Connected to MongoDB');
    } catch (error) {
        isConnected = false;
        throw error;
    } finally {
        connectingPromise = null;
    }
}