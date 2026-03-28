import mongoose from 'mongoose';

const connectDB = async (retryCount = 5): Promise<void> => {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/virtuallab';
    
    for (let i = 0; i < retryCount; i++) {
        try {
            await mongoose.connect(mongoURI);
            console.log('✅ MongoDB connected successfully');
            return;
        } catch (error) {
            console.error(`❌ MongoDB connection attempt ${i + 1} failed:`, error);
            if (i < retryCount - 1) {
                console.log(`Retrying in 5 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 5000));
            } else {
                throw error;
            }
        }
    }
};

export default connectDB;
