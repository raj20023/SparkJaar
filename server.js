require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
// In a real environment, you will set MONGO_URI in Render's environment variables.
// Since the user is setting this up, we'll try to connect but won't crash if it fails immediately, 
// to allow the app to boot up and show instructions if DB is missing.
const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            console.warn('WARNING: MONGO_URI is not set. Database operations will fail.');
            return;
        }
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected successfully.');
    } catch (error) {
        console.error('MongoDB connection error:', error);
    }
};
connectDB();

// Schemas
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    date: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

const settingSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: String, required: true }
});
const Setting = mongoose.model('Setting', settingSchema);

// Admin Auth Middleware
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const checkAdminAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    
    // We expect a simple Bearer token holding the password for this simple setup
    const token = authHeader.split(' ')[1];
    if (token !== ADMIN_PASSWORD) {
        return res.status(403).json({ error: 'Forbidden: Incorrect password' });
    }
    next();
};

// --- API ROUTES ---

// 1. Submit Name & Email and get Google Drive Link
app.post('/api/claim-resource', async (req, res) => {
    try {
        const { name, email } = req.body;
        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required.' });
        }

        if (process.env.MONGO_URI) {
            // Save user
            await User.create({ name, email });
            
            // Get link
            let driveLinkSetting = await Setting.findOne({ key: 'google_drive_link' });
            let link = driveLinkSetting ? driveLinkSetting.value : '#';
            return res.json({ success: true, link });
        } else {
            return res.status(500).json({ error: 'Database not configured yet. Set MONGO_URI.' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// 2. Admin: Get all emails and current link
app.get('/api/admin/data', checkAdminAuth, async (req, res) => {
    try {
        if (!process.env.MONGO_URI) {
            return res.json({ users: [], currentLink: 'Database not configured. Set MONGO_URI.' });
        }
        const users = await User.find().sort({ date: -1 });
        const driveLinkSetting = await Setting.findOne({ key: 'google_drive_link' });
        const currentLink = driveLinkSetting ? driveLinkSetting.value : '';
        
        res.json({ users, currentLink });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// 3. Admin: Update Google Drive link
app.post('/api/admin/link', checkAdminAuth, async (req, res) => {
    try {
        const { link } = req.body;
        if (!link) return res.status(400).json({ error: 'Link is required.' });

        if (!process.env.MONGO_URI) {
            return res.status(500).json({ error: 'Database not configured. Set MONGO_URI.' });
        }

        await Setting.findOneAndUpdate(
            { key: 'google_drive_link' },
            { value: link },
            { upsert: true, new: true }
        );
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin verification endpoint
app.post('/api/admin/verify', checkAdminAuth, (req, res) => {
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
