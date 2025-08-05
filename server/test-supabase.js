import { supabaseHelpers } from './supabaseHelpers.js';

console.log('Testing Supabase connection...');

// Test creating admin user
async function testSupabase() {
  try {
    console.log('Attempting to create admin user...');
    const result = await supabaseHelpers.initializeAdminUser();
    console.log('Admin user creation result:', result);
    
    // Test fetching users
    console.log('Fetching all users...');
    const users = await supabaseHelpers.getAllUsers();
    console.log('Users found:', users);
    
  } catch (error) {
    console.error('Error testing Supabase:', error);
  }
}

testSupabase(); 