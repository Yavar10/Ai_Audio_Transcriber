import { auth } from './lib/auth.js';
import * as dotenv from 'dotenv';

// Load .env.local explicitly
dotenv.config({ path: '.env.local' });

async function seed() {
  console.log('Seeding admin user...');
  try {
    const user = await auth.api.signUpEmail({
      body: {
        email: 'admin@example.com',
        password: 'password123',
        name: 'Admin'
      }
    });
    console.log('Admin user created successfully');
  } catch (error) {
    if (error.message && error.message.includes('already exists')) {
      console.log('Admin user already exists');
    } else {
      console.error('Error creating admin user:', error);
    }
  }
  process.exit(0);
}

seed();
