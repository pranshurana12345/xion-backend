import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create database connection
const db = new sqlite3.Database(path.join(__dirname, 'xion_showcase.db'));

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Create tables
const createTables = () => {
  return new Promise((resolve, reject) => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) reject(err);
      
      // Content items table
      db.run(`
        CREATE TABLE IF NOT EXISTS content_items (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          category TEXT NOT NULL,
          author TEXT NOT NULL,
          file_url TEXT,
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) reject(err);
        
        // Insert default admin user if not exists
        db.get('SELECT id FROM users WHERE username = ?', ['xion'], (err, row) => {
          if (err) reject(err);
          
          if (!row) {
            const hashedPassword = bcrypt.hashSync('password', 10);
            db.run(`
              INSERT INTO users (username, password, role) 
              VALUES (?, ?, ?)
            `, ['xion', hashedPassword, 'admin'], (err) => {
              if (err) reject(err);
              console.log('Default admin user created: xion/password');
              resolve();
            });
          } else {
            resolve();
          }
        });
      });
    });
  });
};

// Initialize database
createTables().catch(console.error);

// Database helper functions
export const dbHelpers = {
  // User functions
  getUserByUsername: (username) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
  },

  createUser: (username, password, role = 'user') => {
    return new Promise((resolve, reject) => {
      const hashedPassword = bcrypt.hashSync(password, 10);
      db.run(`
        INSERT INTO users (username, password, role) 
        VALUES (?, ?, ?)
      `, [username, hashedPassword, role], function(err) {
        if (err) reject(err);
        resolve({ id: this.lastID });
      });
    });
  },

  updateUser: (id, updates) => {
    return new Promise((resolve, reject) => {
      const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);
      db.run(`UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [...values, id], (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  },

  deleteUser: (id) => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM users WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  },

  getAllUsers: () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT id, username, role, created_at FROM users', (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
  },

  // Content functions
  createContentItem: (item) => {
    return new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO content_items (id, title, description, category, author, file_url, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [item.id, item.title, item.description, item.category, item.author, item.fileUrl, item.status], (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  },

  getContentItems: (status = null) => {
    return new Promise((resolve, reject) => {
      if (status) {
        db.all('SELECT * FROM content_items WHERE status = ? ORDER BY created_at DESC', [status], (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        });
      } else {
        db.all('SELECT * FROM content_items ORDER BY created_at DESC', (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        });
      }
    });
  },

  getContentItemById: (id) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM content_items WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
  },

  updateContentStatus: (id, status) => {
    return new Promise((resolve, reject) => {
      db.run('UPDATE content_items SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, id], (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  },

  deleteContentItem: (id) => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM content_items WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  },

  // Statistics
  getStats: () => {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          COUNT(*) as total_items,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_items,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_items,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_items
        FROM content_items
      `, (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
  }
};

export default db; 