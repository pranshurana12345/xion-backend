import { supabaseHelpers } from './supabaseHelpers.js';

console.log('Fixing admin user password...');

async function fixAdminUser() {
  try {
    // First, let's see what users exist
    console.log('Current users:');
    const users = await supabaseHelpers.getAllUsers();
    console.log(users);
    
    // Delete the existing admin user if it exists
    const existingUser = await supabaseHelpers.getUserByUsername('xion');
    if (existingUser) {
      console.log('Deleting existing admin user...');
      await supabaseHelpers.deleteUser(existingUser.id);
    }
    
    // Create a new admin user with correct password
    console.log('Creating new admin user...');
    const newUser = await supabaseHelpers.createUser('xion', 'password', 'admin');
    console.log('New admin user created:', newUser);
    
    // Verify the user was created
    const verifyUser = await supabaseHelpers.getUserByUsername('xion');
    console.log('Verified user:', verifyUser);
    
  } catch (error) {
    console.error('Error fixing admin user:', error);
  }
}

fixAdminUser(); 