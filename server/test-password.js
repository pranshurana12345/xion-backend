import bcrypt from 'bcryptjs';
import { supabaseHelpers } from './supabaseHelpers.js';

async function testPassword() {
  console.log('Testing password hashing and comparison...');
  
  try {
    // Get the user from database
    const user = await supabaseHelpers.getUserByUsername('xion');
    console.log('User found:', user ? 'Yes' : 'No');
    
    if (user) {
      console.log('Stored password hash length:', user.password.length);
      
      // Test password comparison
      const testPassword = 'password';
      console.log('Testing password:', testPassword);
      
      bcrypt.compare(testPassword, user.password, (err, isMatch) => {
        console.log('Bcrypt compare result:', { err, isMatch });
        
        if (isMatch) {
          console.log('✅ Password matches!');
        } else {
          console.log('❌ Password does not match');
          
          // Generate a new hash for comparison
          const newHash = bcrypt.hashSync(testPassword, 10);
          console.log('New hash for "password":', newHash);
          console.log('Hash lengths - Stored:', user.password.length, 'New:', newHash.length);
        }
      });
    }
    
  } catch (error) {
    console.error('Error testing password:', error);
  }
}

testPassword(); 