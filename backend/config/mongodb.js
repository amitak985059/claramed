import mongoose from "mongoose";
import dns from "dns";

// Set public DNS servers for Node.js (c-ares) to resolve MongoDB SRV records correctly on all networks
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const connectDB = async () => {
    mongoose.connection.on('connected', () => console.log("Database Connected"))
    
    let uri = process.env.MONGODB_URI;
    if (uri.includes('?')) {
        const [base, query] = uri.split('?');
        const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
        uri = `${cleanBase}/prescripto?${query}`;
    } else {
        const cleanUri = uri.endsWith('/') ? uri.slice(0, -1) : uri;
        uri = `${cleanUri}/prescripto`;
    }
    
    await mongoose.connect(uri);
}

export default connectDB;

