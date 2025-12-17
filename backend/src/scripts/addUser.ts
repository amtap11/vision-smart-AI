import dotenv from 'dotenv';
import { UserModel } from '../models/User';

dotenv.config();

async function addUser() {
  try {
    const email = 'mohammed.alnjjar.ma@gmail.com';
    const password = 'M#trimed33';
    const name = 'Mohammed Alnjjar';
    
    console.log('Checking if user exists...');
    const existingUser = await UserModel.findByEmail(email);
    
    if (existingUser) {
      console.log('✅ User already exists:');
      console.log(`   ID: ${existingUser.id}`);
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Name: ${existingUser.name}`);
      console.log('\n⚠️  If you need to reset the password, you can delete and recreate the user.');
      process.exit(0);
    }
    
    console.log('Creating user...');
    const user = await UserModel.create({
      email,
      password,
      name,
    });
    
    console.log('✅ User created successfully:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      if (error.message.includes('relation "users" does not exist')) {
        console.error('\n⚠️  Database tables not created. Run: npm run build && npm run db:migrate');
      } else if (error.message.includes('password authentication failed')) {
        console.error('\n⚠️  Database connection failed. Check DATABASE_URL in .env file.');
      }
    }
  }
  process.exit(0);
}

addUser();

