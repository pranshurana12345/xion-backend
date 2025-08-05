-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create content_items table
CREATE TABLE IF NOT EXISTS content_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  author TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  status TEXT DEFAULT 'pending',
  admin_notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if they don't exist
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT '';

-- Create chat_statistics table
CREATE TABLE IF NOT EXISTS chat_statistics (
  id BIGSERIAL PRIMARY KEY,
  total_chats BIGINT DEFAULT 0,
  total_content_ideas BIGINT DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default chat statistics record
INSERT INTO chat_statistics (total_chats, total_content_ideas) 
VALUES (0, 0) 
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_content_items_status ON content_items(status);
CREATE INDEX IF NOT EXISTS idx_content_items_created_at ON content_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_items_category ON content_items(category);
CREATE INDEX IF NOT EXISTS idx_content_items_author ON content_items(author);

-- Enable Row Level Security (RLS) - optional but recommended
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_statistics ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Service role can manage users" ON users
  FOR ALL USING (auth.role() = 'service_role');

-- Create policies for content_items table
CREATE POLICY "Anyone can view approved content" ON content_items
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Anyone can submit content" ON content_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can manage content" ON content_items
  FOR ALL USING (auth.role() = 'service_role');

-- Create policies for chat_statistics table
CREATE POLICY "Anyone can view chat statistics" ON chat_statistics
  FOR SELECT USING (true);

CREATE POLICY "Service role can update chat statistics" ON chat_statistics
  FOR UPDATE USING (auth.role() = 'service_role'); 