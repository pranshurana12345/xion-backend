import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Simple admin credentials (in production, use database)
const ADMIN_USERNAME = 'xion';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync('password', 10);

// JWT Secret
const JWT_SECRET = 'your-secret-key';

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Admin login
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  
  console.log('Login attempt:', { username, password });
  
  try {
    // Check if username matches
    if (username !== ADMIN_USERNAME) {
      console.log('Username does not match');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    console.log('Password match:', isMatch);
    
    if (!isMatch) {
      console.log('Password does not match');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign({ username: ADMIN_USERNAME, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    
    console.log('Login successful!');
    res.json({ 
      token, 
      user: { username: ADMIN_USERNAME, role: 'admin' } 
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

app.listen(PORT, () => {
  console.log(`Simple server running on port ${PORT}`);
  console.log(`Admin credentials: username=xion, password=password`);
}); 