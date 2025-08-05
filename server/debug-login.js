import { supabaseHelpers } from './supabaseHelpers.js';
import bcrypt from 'bcryptjs';

async function debugLogin() {
  console.log('=== DEBUG LOGIN PROCESS ===');
  
  const username = 'xion';
  const password = 'password';
  
  console.log('1. Testing with credentials:', { username, password });
  
  try {
    // Step 1: Get user from database
    console.log('\n2. Getting user from database...');
    const user = await supabaseHelpers.getUserByUsername(username);
    
    if (!user) {
      console.log('❌ User not found in database');
      return;
    }
    
    console.log('✅ User found:', {
      id: user.id,
      username: user.username,
      role: user.role,
      passwordHash: user.password ? `${user.password.substring(0, 20)}...` : 'null'
    });
    
    // Step 2: Test password comparison
    console.log('\n3. Testing password comparison...');
    const isMatch = await new Promise((resolve, reject) => {
      bcrypt.compare(password, user.password, (err, result) => {
        if (err) {
          console.log('❌ Bcrypt error:', err);
          reject(err);
        } else {
          console.log('✅ Bcrypt result:', result);
          resolve(result);
        }
      });
    });
    
    if (isMatch) {
      console.log('✅ Password matches! Login should succeed.');
    } else {
      console.log('❌ Password does not match!');
    }
    
  } catch (error) {
    console.error('❌ Error during debug:', error);
  }
}

debugLogin(); 