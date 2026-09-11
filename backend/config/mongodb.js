import mongoose from "mongoose";
import dns from "dns";

// Set reliable public DNS servers to resolve MongoDB SRV records on Windows/local networks
dns.setServers(['8.8.8.8', '1.1.1.1']);

const connectDB = async () => {
    try {
        mongoose.connection.on('connected', () => console.log("Database Connected"));
        mongoose.connection.on('error', (err) => console.error("Database connection error:", err));

        // Connect with dbName option so query parameters in MONGODB_URI are preserved
        await mongoose.connect(process.env.MONGODB_URI, {
            dbName: 'prescripto'
        });
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error.message);
    }
};

export default connectDB;

