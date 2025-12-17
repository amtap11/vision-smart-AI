import dotenv from 'dotenv';
import { UserModel } from '../models/User';

dotenv.config();

async function checkUser() {
  try {
    const email = 'mohammed.alnjjar.ma@gmail.com';
    
    console.log('Checking database connection...');
    const user = await UserModel.findByEmail(email);
    
    if (user) {
      console.log('✅ User found in database:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Created: ${user.created_at}`);
    } else {
      console.log('❌ User NOT found in database.');
      console.log(`   Email: ${email}`);
      console.log('\nTo add the user, run: npm run add-user');
    }
  } catch (error) {
    console.error('❌ Database error:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
  }
  process.exit(0);
}

checkUser();

