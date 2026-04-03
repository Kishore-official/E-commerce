import 'reflect-metadata';
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://edwinswanith006:Edwin006@e-commerce.civeh16.mongodb.net/?appName=E-commerce';
const mongoDbName = process.env.MONGODB_DB_NAME || 'E-commerce';

async function listUsersAndVendors() {
  console.log('🔍 Connecting to MongoDB...\n');
  
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    const db = client.db(mongoDbName);
    
    // Get users
    console.log('📋 USERS:');
    console.log('─'.repeat(80));
    const users = await db.collection('users').find({}).toArray();
    
    if (users.length === 0) {
      console.log('  No users found.\n');
    } else {
      users.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.firstName} ${user.lastName}`);
        console.log(`     Email: ${user.email}`);
        console.log(`     Role: ${user.role}`);
        console.log(`     Active: ${user.isActive ? 'Yes' : 'No'}`);
        console.log(`     ID: ${user._id || user.id}`);
        console.log('');
      });
    }
    
    // Get vendors
    console.log('🏪 VENDORS:');
    console.log('─'.repeat(80));
    const vendors = await db.collection('vendors').find({}).toArray();
    
    if (vendors.length === 0) {
      console.log('  No vendors found.\n');
    } else {
      for (const vendor of vendors) {
        // Get user info for this vendor
        const userId = vendor.userId || vendor._id;
        const user = await db.collection('users').findOne({ _id: userId });
        
        console.log(`  Business Name: ${vendor.businessName}`);
        console.log(`  Slug: ${vendor.slug}`);
        console.log(`  Status: ${vendor.status}`);
        if (user) {
          console.log(`  Owner: ${user.firstName} ${user.lastName} (${user.email})`);
        }
        console.log(`  Business Email: ${vendor.businessEmail}`);
        console.log(`  Country: ${vendor.countryCode}`);
        console.log(`  Commission Rate: ${vendor.commissionRate}%`);
        console.log(`  ID: ${vendor._id || vendor.id}`);
        console.log('');
      }
    }
    
    console.log(`\n✅ Total Users: ${users.length}`);
    console.log(`✅ Total Vendors: ${vendors.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 Connection closed');
  }
}

listUsersAndVendors().catch(console.error);

