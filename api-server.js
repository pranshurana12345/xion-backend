import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseHelpers } from './server/supabaseHelpers.js';
import supabase from './server/supabaseClient.js';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// File upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'server', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Gemini AI setup
const DEMO_KEY = "AIzaSyDepiRCs9vSA1T9MYHmtFRzhSvgborZKuc";
const API_KEY = process.env.GEMINI_API_KEY || DEMO_KEY;

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Local storage for chat statistics
const statsFile = path.join(process.cwd(), 'chat-stats.json');

// Load stats from file or create default
const loadStats = () => {
  try {
    if (fs.existsSync(statsFile)) {
      const data = fs.readFileSync(statsFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('Error loading stats file:', error.message);
  }
  
  return {
    total_chats: 0,
    total_content_ideas: 0,
    last_updated: new Date().toISOString()
  };
};

// Save stats to file
const saveStats = (stats) => {
  try {
    fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
  } catch (error) {
    console.warn('Error saving stats file:', error.message);
  }
};

let localStats = loadStats();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Admin login endpoint
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    console.log('Login attempt for username:', username);

    // Try to get user from database
    let user = null;
    try {
      user = await supabaseHelpers.getUserByUsername(username);
    } catch (dbError) {
      console.warn('Database error during login:', dbError.message);
    }

    // If user not found in database, check for default admin
    if (!user) {
      if (username === 'xion' && password === 'password') {
        user = {
          id: 1,
          username: 'xion',
          role: 'admin'
        };
      } else {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    } else {
      // Verify password for database user
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Login successful for user:', user.username);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Protected admin endpoint example
app.get('/api/admin/profile', authenticateToken, (req, res) => {
  res.json({
    user: req.user,
    message: 'Admin profile accessed successfully'
  });
});

// Chat API endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    console.log('Received message:', message);

    // Increment chat count
    localStats.total_chats++;
    localStats.last_updated = new Date().toISOString();
    saveStats(localStats);

    // Try to update database as well
    try {
      await supabaseHelpers.incrementChatCount();
    } catch (dbError) {
      console.warn('Database error, using local storage:', dbError.message);
    }

    // Check if this is a content-related question
    const contentKeywords = ['content', 'create', 'idea', 'video', 'tutorial', 'thread', 'post', 'article', 'blog'];
    const isContentRelated = contentKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    if (isContentRelated) {
      localStats.total_content_ideas++;
      saveStats(localStats);
      
      try {
        await supabaseHelpers.incrementContentIdeasCount();
      } catch (dbError) {
        console.warn('Database error for content ideas:', dbError.message);
      }
    }

    // Build conversation history - map "assistant" to "model" for Gemini
    const chat = model.startChat({
      history: history.map((msg) => ({
        role: msg.role === "assistant" ? "model" : msg.role,
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
    
  } catch (error) {
    console.error("Chat API error:", error);
    
    if (error.message?.includes("429")) {
      return res.status(429).json({ error: "Rate limit exceeded" });
    }
    
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get chat statistics endpoint
app.get('/api/chat-stats', async (req, res) => {
  try {
    // Try to get stats from database first
    const dbStats = await supabaseHelpers.getChatStatistics();
    if (dbStats && dbStats.total_chats > 0) {
      res.json(dbStats);
    } else {
      // Use local stats if database is empty or unavailable
      res.json(localStats);
    }
  } catch (error) {
    console.error("Error fetching chat stats from database, using local storage:", error);
    res.json(localStats);
  }
});

// Test endpoint for database connection
app.get('/api/test-db', async (req, res) => {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('content_items')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Database connection error:', error);
      return res.status(500).json({ 
        error: 'Database connection failed', 
        details: error.message 
      });
    }
    
    console.log('Database connection successful');
    res.json({ 
      message: 'Database connection successful',
      data: data,
      columns: data.length > 0 ? Object.keys(data[0]) : []
    });
    
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({ 
      error: 'Database test failed', 
      details: error.message 
    });
  }
});

// Test endpoint for content submission (JSON only)
app.post('/api/content/submit-test', async (req, res) => {
  try {
    const { title, category, url, author } = req.body;

    // Validate required fields
    if (!title || !category || !author) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate unique ID for content
    const contentId = uuidv4();

    // Try with minimal fields first
    const minimalItem = {
      id: contentId,
      title: title,
      category: category,
      author: author,
      description: '' // Required by database schema
    };

    console.log('Attempting to save minimal content item:', minimalItem);

    // Test direct Supabase insertion with minimal fields
    const { data, error } = await supabase
      .from('content_items')
      .insert([minimalItem])
      .select()
      .single();

    if (error) {
      console.error('Direct Supabase error:', error);
      return res.status(500).json({ 
        error: 'Failed to save content', 
        details: error.message 
      });
    }

    console.log('Content submitted successfully:', contentId);

    res.status(201).json({
      message: 'Content submitted successfully',
      content: data
    });

  } catch (error) {
    console.error('Content submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Content submission endpoint
app.post('/api/content/submit', upload.single('thumbnail'), async (req, res) => {
  try {
    const { title, category, url, author } = req.body;
    const thumbnailFile = req.file;

    // Validate required fields
    if (!title || !category || !author) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate unique ID for content
    const contentId = uuidv4();

    // Handle thumbnail upload
    let thumbnailUrl = null;
    if (thumbnailFile) {
      // In production, upload to Supabase Storage or cloud storage
      // For now, store locally and serve via static route
      thumbnailUrl = `/uploads/${thumbnailFile.filename}`;
    }

    // Create content item
    const contentItem = {
      id: contentId,
      title,
      category,
      author,
      url: url || '', // Save the submitted URL
      description: '', // Required by database schema
      file_url: thumbnailUrl, // Save thumbnail URL to database (using file_url field)
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Attempting to save content item:', contentItem);

    // Save to database
    const savedItem = await supabaseHelpers.createContentItem(contentItem);

    if (!savedItem) {
      console.error('Failed to save content item to database');
      return res.status(500).json({ error: 'Failed to save content' });
    }

    console.log('Content submitted successfully:', contentId);

    res.status(201).json({
      message: 'Content submitted successfully',
      content: savedItem
    });

  } catch (error) {
    console.error('Content submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pending content (admin only)
app.get('/api/content/pending', authenticateToken, async (req, res) => {
  try {
    const pendingContent = await supabaseHelpers.getContentItems('pending');
    res.json(pendingContent);
  } catch (error) {
    console.error('Error fetching pending content:', error);
    res.status(500).json({ error: 'Failed to fetch pending content' });
  }
});

// Get approved content (public)
app.get('/api/content/approved', async (req, res) => {
  try {
    const approvedContent = await supabaseHelpers.getContentItems('approved');
    res.json(approvedContent);
  } catch (error) {
    console.error('Error fetching approved content:', error);
    res.status(500).json({ error: 'Failed to fetch approved content' });
  }
});

// Approve content (admin only)
app.put('/api/content/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const updatedItem = await supabaseHelpers.updateContentStatus(id, 'approved');

    if (!updatedItem) {
      return res.status(404).json({ error: 'Content not found' });
    }

    console.log('Content approved:', id);
    res.json({ message: 'Content approved successfully', content: updatedItem });
  } catch (error) {
    console.error('Error approving content:', error);
    res.status(500).json({ error: 'Failed to approve content' });
  }
});

// Reject content (admin only)
app.put('/api/content/:id/reject', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const updatedItem = await supabaseHelpers.updateContentStatus(id, 'rejected');

    if (!updatedItem) {
      return res.status(404).json({ error: 'Content not found' });
    }

    console.log('Content rejected:', id, reason);
    res.json({ message: 'Content rejected successfully', content: updatedItem });
  } catch (error) {
    console.error('Error rejecting content:', error);
    res.status(500).json({ error: 'Failed to reject content' });
  }
});

// Update content thumbnail (admin only)
app.put('/api/content/:id/thumbnail', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { file_url } = req.body;

    const updatedItem = await supabaseHelpers.updateContentThumbnail(id, file_url);

    if (!updatedItem) {
      return res.status(404).json({ error: 'Content not found' });
    }

    console.log('Content thumbnail updated:', id, file_url);
    res.json({ message: 'Content thumbnail updated successfully', content: updatedItem });
  } catch (error) {
    console.error('Error updating content thumbnail:', error);
    res.status(500).json({ error: 'Failed to update content thumbnail' });
  }
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'server', 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`API Server running on port ${PORT}`);
  console.log(`Chat API available at http://localhost:${PORT}/api/chat`);
  console.log(`Content submission available at http://localhost:${PORT}/api/content/submit`);
  console.log(`Admin login available at http://localhost:${PORT}/api/admin/login`);
  console.log(`Current local stats: ${localStats.total_chats} chats, ${localStats.total_content_ideas} content ideas`);
}); 