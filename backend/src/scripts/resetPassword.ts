import dotenv from 'dotenv';
import { UserModel } from '../models/User';
import pool from '../config/database';

dotenv.config();

async function resetPassword() {
  try {
    const email = 'mohammed.alnjjar.ma@gmail.com';
    const newPassword = 'M#trimed33';
    
    console.log('Finding user...');
    const user = await UserModel.findByEmail(email);
    
    if (!user) {
      console.log('❌ User not found in database.');
      console.log('   Run: npm run add-user to create the user');
      process.exit(1);
    }
    
    console.log('✅ User found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    
    console.log('\nResetting password hash...');
    await UserModel.updatePassword(user.id, newPassword);
    
    console.log('✅ Password hash updated successfully!');
    
    console.log('\nVerifying new password...');
    const updatedUser = await UserModel.findByEmail(email);
    if (updatedUser) {
      const isValid = await UserModel.verifyPassword(updatedUser, newPassword);
      if (isValid) {
        console.log('✅ Password verification successful!');
        console.log('   You can now log in with:');
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${newPassword}`);
      } else {
        console.log('❌ Password verification failed after reset!');
        console.log('   This is unexpected. Please check the hashing implementation.');
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
  }
  process.exit(0);
}

resetPassword();

