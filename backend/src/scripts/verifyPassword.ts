import dotenv from 'dotenv';
import { UserModel } from '../models/User';

dotenv.config();

async function verifyPassword() {
  try {
    const email = 'mohammed.alnjjar.ma@gmail.com';
    const testPassword = 'M#trimed33';
    
    console.log('Checking user and password...');
    const user = await UserModel.findByEmail(email);
    
    if (!user) {
      console.log('❌ User not found in database.');
      process.exit(1);
    }
    
    console.log('✅ User found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    
    console.log('\nVerifying password...');
    const isValid = await UserModel.verifyPassword(user, testPassword);
    
    if (isValid) {
      console.log('✅ Password is CORRECT!');
      console.log('   The password hash matches the provided password.');
    } else {
      console.log('❌ Password is INCORRECT!');
      console.log('   The password hash does NOT match the provided password.');
      console.log('\nTo reset the password, run: npm run add-user');
      console.log('   (This will recreate the user with the correct password)');
    }
  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
  }
  process.exit(0);
}

verifyPassword();

