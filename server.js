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
    resourceSlug: { type: String, default: 'default' },
    date: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

const settingSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: String, required: true }
});
const Setting = mongoose.model('Setting', settingSchema);

const resourceSchema = new mongoose.Schema({
    slug: { type: String, required: true, unique: true },
    driveUrl: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const Resource = mongoose.model('Resource', resourceSchema);

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
        const { name, email, resourceSlug } = req.body;
        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required.' });
        }

        if (process.env.MONGO_URI) {
            // Save user
            const slugToSave = resourceSlug || 'default';
            await User.create({ name, email, resourceSlug: slugToSave });
            
            // Get link
            let link = '#';
            if (resourceSlug) {
                const resource = await Resource.findOne({ slug: resourceSlug });
                if (resource) {
                    link = resource.driveUrl;
                }
            }
            
            // Fallback to default if no resource found or no slug provided
            if (link === '#') {
                let driveLinkSetting = await Setting.findOne({ key: 'google_drive_link' });
                if (driveLinkSetting) {
                    link = driveLinkSetting.value;
                }
            }
            
            return res.json({ success: true, link });
        } else {
            return res.status(500).json({ error: 'Database not configured yet. Set MONGO_URI.' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// 2. Admin: Get all emails, current default link, and custom resources
app.get('/api/admin/data', checkAdminAuth, async (req, res) => {
    try {
        if (!process.env.MONGO_URI) {
            return res.json({ users: [], currentLink: 'Database not configured.', resources: [] });
        }
        const users = await User.find().sort({ date: -1 });
        const driveLinkSetting = await Setting.findOne({ key: 'google_drive_link' });
        const currentLink = driveLinkSetting ? driveLinkSetting.value : '';
        const resources = await Resource.find().sort({ createdAt: -1 });
        
        res.json({ users, currentLink, resources });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// 3. Admin: Update Default Google Drive link
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

// 4. Admin: Create Custom Resource
app.post('/api/admin/resource', checkAdminAuth, async (req, res) => {
    try {
        const { slug, driveUrl } = req.body;
        if (!slug || !driveUrl) return res.status(400).json({ error: 'Slug and URL are required.' });
        
        if (!process.env.MONGO_URI) {
            return res.status(500).json({ error: 'Database not configured.' });
        }

        await Resource.create({ slug, driveUrl });
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        if (error.code === 11000) return res.status(400).json({ error: 'Slug already exists.' });
        res.status(500).json({ error: 'Server error' });
    }
});

// 5. Admin: Delete Custom Resource
app.delete('/api/admin/resource/:slug', checkAdminAuth, async (req, res) => {
    try {
        if (!process.env.MONGO_URI) {
            return res.status(500).json({ error: 'Database not configured.' });
        }
        await Resource.findOneAndDelete({ slug: req.params.slug });
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
