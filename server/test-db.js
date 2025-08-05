import { supabaseHelpers } from './supabaseHelpers.js';

async function testDatabase() {
  console.log('Testing database connection...');
  
  try {
    // Test getting all users
    console.log('\n1. Getting all users:');
    const users = await supabaseHelpers.getAllUsers();
    console.log('Users found:', users.length);
    users.forEach(user => {
      console.log(`- ID: ${user.id}, Username: ${user.username}, Role: ${user.role}`);
    });
    
    // Test getting specific user
    console.log('\n2. Testing getUserByUsername("xion"):');
    const xionUser = await supabaseHelpers.getUserByUsername('xion');
    if (xionUser) {
      console.log('Found user:', {
        id: xionUser.id,
        username: xionUser.username,
        role: xionUser.role,
        passwordLength: xionUser.password?.length || 0
      });
    } else {
      console.log('User "xion" not found');
    }
    
    // Test creating admin user if it doesn't exist
    console.log('\n3. Testing initializeAdminUser:');
    await supabaseHelpers.initializeAdminUser();
    
    // Test again after initialization
    console.log('\n4. Testing getUserByUsername("xion") after initialization:');
    const xionUserAfter = await supabaseHelpers.getUserByUsername('xion');
    if (xionUserAfter) {
      console.log('Found user after initialization:', {
        id: xionUserAfter.id,
        username: xionUserAfter.username,
        role: xionUserAfter.role,
        passwordLength: xionUserAfter.password?.length || 0
      });
    } else {
      console.log('User "xion" still not found after initialization');
    }
    
  } catch (error) {
    console.error('Error testing database:', error);
  }
}

testDatabase(); 