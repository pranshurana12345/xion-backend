import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed!'));
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// In-memory storage for content (in production, use a database)
let allContent = [
  {
    id: "1",
    title: "Getting Started with Account Abstraction",
    category: "threads",
    author: "XionDev",
    url: "https://twitter.com/xiondev/status/123456789",
    thumbnail_url: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjNjM2NmYxIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2ZmZmZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkFjY291bnQgQWJzdHJhY3Rpb248L3RleHQ+PC9zdmc+",
    created_at: "2024-01-15T10:30:00Z",
    status: "approved"
  },
  {
    id: "2",
    title: "Gasless Transactions Tutorial",
    category: "videos",
    author: "CryptoCreator",
    url: "https://youtube.com/watch?v=abc123",
    thumbnail_url: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMTBiOTgxIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2ZmZmZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkdhc2xlc3MgVHV0b3JpYWw8L3RleHQ+PC9zdmc+",
    created_at: "2024-01-14T15:45:00Z",
    status: "approved"
  },
  {
    id: "3",
    title: "Xion Ecosystem Overview",
    category: "graphics",
    author: "DesignMaster",
    url: "https://instagram.com/p/xyz789",
    thumbnail_url: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjU5ZTBhIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2ZmZmZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkVjb3N5c3RlbSBPdmVydmlldzwvdGV4dD48L3N2Zz4=",
    created_at: "2024-01-13T09:20:00Z",
    status: "approved"
  }
];

// Content storage with persistence
const CONTENT_FILE = 'content.json';
const STATS_FILE = 'stats.json';

// Stats storage
let stats = {
  total_chats: 150,
  total_content_ideas: 45,
  total_approved_content: 0,
  total_pending_content: 0,
  total_rejected_content: 0,
  total_submissions: 0,
  last_updated: new Date().toISOString()
};

function loadContent() {
  try {
    if (fs.existsSync(CONTENT_FILE)) {
      const data = fs.readFileSync(CONTENT_FILE, 'utf8');
      allContent = JSON.parse(data);
    } else {
      // Save default content to file
      saveContent();
    }
  } catch (error) {
    console.error('Error loading content:', error);
  }
}

function saveContent() {
  try {
    fs.writeFileSync(CONTENT_FILE, JSON.stringify(allContent, null, 2));
  } catch (error) {
    console.error('Error saving content:', error);
  }
}

function loadStats() {
  try {
    if (fs.existsSync(STATS_FILE)) {
      const data = fs.readFileSync(STATS_FILE, 'utf8');
      stats = JSON.parse(data);
    } else {
      // Initialize stats with current content counts
      updateStatsFromContent();
      saveStats();
    }
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

function saveStats() {
  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error('Error saving stats:', error);
  }
}

function updateStatsFromContent() {
  stats.total_approved_content = allContent.filter(item => item.status === 'approved').length;
  stats.total_pending_content = allContent.filter(item => item.status === 'pending').length;
  stats.total_rejected_content = allContent.filter(item => item.status === 'rejected').length;
  stats.total_submissions = allContent.length;
  stats.last_updated = new Date().toISOString();
  
  console.log('Updated stats from content:', {
    total_approved: stats.total_approved_content,
    total_pending: stats.total_pending_content,
    total_rejected: stats.total_rejected_content,
    total_submissions: stats.total_submissions,
    allContent_length: allContent.length
  });
}

// Load data on startup
loadContent();
loadStats();

// Helper function to get approved content
const getApprovedContent = () => {
  return allContent.filter(item => item.status === 'approved');
};

// Helper function to get pending content
const getPendingContent = () => {
  return allContent.filter(item => item.status === 'pending');
};

// Helper function to get rejected content
const getRejectedContent = () => {
  return allContent.filter(item => item.status === 'rejected');
};

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
  console.log('Authenticating request for:', req.path);
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('No valid auth header found');
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    console.log('Authentication successful for:', req.path);
    next();
  } catch (error) {
    console.log('Authentication failed for:', req.path, error.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Admin login endpoint
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  // Simple admin credentials (in production, use proper authentication)
  if ((username === 'xion' || username === 'admin') && password === 'password') {
    const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ 
      success: true, 
      token,
      message: 'Login successful'
    });
  } else {
    res.status(401).json({ 
      success: false, 
      error: 'Invalid credentials' 
    });
  }
});

// Content endpoints
app.get('/api/content/approved', (req, res) => {
  res.json(getApprovedContent());
});

app.post('/api/content/submit', upload.single('thumbnail'), (req, res) => {
  try {
    const { title, category, author, url } = req.body;
    const thumbnail = req.file;

    if (!title || !category || !author) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Create new submission
    const newSubmission = {
      id: Date.now().toString(),
      title,
      category,
      author,
      url,
      thumbnail_url: thumbnail ? `/uploads/${thumbnail.filename}` : "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjNmI3MjgwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2ZmZmZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==",
      status: 'pending',
      created_at: new Date().toISOString()
    };

    // Add to storage
    allContent.push(newSubmission);
    saveContent(); // Save to file
    
    // Update stats
    updateStatsFromContent();
    saveStats();

    console.log('New submission received:', newSubmission);
    console.log(`Total content count after submission: ${allContent.length}`);
    
    res.status(201).json({ 
      message: "Submission received successfully",
      submission: newSubmission
    });
  } catch (error) {
    console.error('Submission error:', error);
    res.status(500).json({ error: "Failed to process submission" });
  }
});

app.get('/api/content/pending', authenticateAdmin, (req, res) => {
  res.json(getPendingContent());
});

app.get('/api/content/rejected', authenticateAdmin, (req, res) => {
  const rejectedContent = getRejectedContent();
  console.log('Rejected content requested, returning:', rejectedContent.length, 'items');
  console.log('Rejected content IDs:', rejectedContent.map(item => item.id));
  res.json(rejectedContent);
});

app.put('/api/content/:id/status', authenticateAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  console.log(`Updating content ${id} status to ${status}`);
  
  // Find and update the content
  const contentIndex = allContent.findIndex(item => item.id === id);
  if (contentIndex !== -1) {
    const oldStatus = allContent[contentIndex].status;
    allContent[contentIndex].status = status;
    saveContent(); // Save to file
    
    // Update stats
    updateStatsFromContent();
    saveStats();
    
    console.log(`Updated content ${id} status from ${oldStatus} to ${status}`);
    console.log(`Current content count: ${allContent.length}`);
    res.json({ message: "Status updated successfully" });
  } else {
    console.log(`Content ${id} not found`);
    res.status(404).json({ error: "Content not found" });
  }
});

// Edit content endpoint
app.put('/api/content/:id', authenticateAdmin, upload.single('thumbnail'), (req, res) => {
  const { id } = req.params;
  const { title, category, author, url } = req.body;
  const thumbnail = req.file;
  
  console.log(`Editing content ${id}`);
  
  // Find and update the content
  const contentIndex = allContent.findIndex(item => item.id === id);
  if (contentIndex !== -1) {
    // Update the content
    allContent[contentIndex] = {
      ...allContent[contentIndex],
      title: title || allContent[contentIndex].title,
      category: category || allContent[contentIndex].category,
      author: author || allContent[contentIndex].author,
      url: url || allContent[contentIndex].url,
      thumbnail_url: thumbnail ? `/uploads/${thumbnail.filename}` : allContent[contentIndex].thumbnail_url,
      updated_at: new Date().toISOString()
    };
    
    saveContent(); // Save to file
    console.log(`Updated content ${id}`);
    res.json({ 
      message: "Content updated successfully",
      content: allContent[contentIndex]
    });
  } else {
    console.log(`Content ${id} not found`);
    res.status(404).json({ error: "Content not found" });
  }
});

// Delete content endpoint
app.delete('/api/content/:id', authenticateAdmin, (req, res) => {
  const { id } = req.params;
  
  console.log(`Deleting content ${id}`);
  
  // Find and remove the content
  const contentIndex = allContent.findIndex(item => item.id === id);
  if (contentIndex !== -1) {
    const deletedContent = allContent[contentIndex];
    allContent.splice(contentIndex, 1);
    saveContent(); // Save to file
    
    // Update stats
    updateStatsFromContent();
    saveStats();
    
    console.log(`Deleted content ${id}`);
    res.json({ 
      message: "Content deleted successfully",
      deletedContent
    });
  } else {
    console.log(`Content ${id} not found`);
    res.status(404).json({ error: "Content not found" });
  }
});

// Gemini AI setup
const DEMO_KEY = "AIzaSyDepiRCs9vSA1T9MYHmtFRzhSvgborZKuc";
const API_KEY = process.env.GEMINI_API_KEY || DEMO_KEY;

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Chat API endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Build conversation history with correct role mapping
    const chat = model.startChat({
      history: history.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : msg.role,
        parts: [{ text: msg.content }],
      })),
    });

    // Set headers for streaming
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Create stream
    const result = await chat.sendMessageStream(message);
    
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        res.write(`data: ${JSON.stringify({ delta: chunkText })}\n\n`);
      }
    }
    
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
    
    // Increment chat stats
    stats.total_chats++;
    saveStats();
    
  } catch (error) {
    console.error("Chat API error:", error);
    
    // Check if response has already been sent
    if (!res.headersSent) {
      if (error.message?.includes("429")) {
        return res.status(429).json({ error: "Rate limit exceeded" });
      }
      
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Chat stats endpoint
app.get('/api/chat-stats', (req, res) => {
  // Update stats from current content before returning
  updateStatsFromContent();
  console.log('Sending stats response:', stats);
  res.json({
    ...stats,
    activeUsers: 25,
    averageResponseTime: 2.3,
    popularTopics: ['account abstraction', 'gasless transactions', 'ambassador program']
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Chat API available at http://localhost:${PORT}/api/chat`);
  console.log(`Content API available at http://localhost:${PORT}/api/content/approved`);
  console.log(`Admin login: username=xion, password=password`);
}); 