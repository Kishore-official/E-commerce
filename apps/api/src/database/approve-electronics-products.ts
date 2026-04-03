import 'reflect-metadata';
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://edwinswanith006:Edwin006@e-commerce.civeh16.mongodb.net/?appName=E-commerce';
const mongoDbName = process.env.MONGODB_DB_NAME || 'E-commerce';

// Electronics category ID
const ELECTRONICS_CATEGORY_ID = '7e46e126-9a92-42ce-86b5-6bc4a49c1e9f';

async function approveElectronicsProducts() {
  console.log('🚀 Approving Electronics products for storefront display...\n');
  
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    const db = client.db(mongoDbName);
    console.log('✅ Connected to MongoDB\n');
    
    // Find the 10 products we created
    const products = await db.collection('products').find({
      categoryId: ELECTRONICS_CATEGORY_ID,
      name: { $regex: /^(Wireless Bluetooth|Smart Fitness|Portable Bluetooth|USB-C Fast|Wireless Ergonomic|Mechanical Gaming|Adjustable Tablet|Protective Phone|High Capacity|Ergonomic Laptop)/ }
    }).toArray();
    
    console.log(`📦 Found ${products.length} products to approve\n`);
    
    if (products.length === 0) {
      console.log('⚠️  No products found to approve.\n');
      return;
    }
    
    // Update products to approved status
    const productIds = products.map(p => p.id);
    const result = await db.collection('products').updateMany(
      { id: { $in: productIds } },
      {
        $set: {
          status: 'approved',
          updatedAt: new Date(),
        }
      }
    );
    
    console.log(`✅ Approved ${result.modifiedCount} products\n`);
    
    // Also activate offers
    const offerResult = await db.collection('offers').updateMany(
      { productId: { $in: productIds } },
      {
        $set: {
          status: 'active',
          updatedAt: new Date(),
        }
      }
    );
    
    console.log(`✅ Activated ${offerResult.modifiedCount} offers\n`);
    
    console.log('='.repeat(80));
    console.log('✅ Products are now approved and will appear in the storefront!');
    console.log('='.repeat(80));
    console.log('\n📋 Approved Products:');
    products.forEach((p, idx) => {
      console.log(`${idx + 1}. ${p.name}`);
    });
    console.log('\n⚠️  NOTE: Restart your API server if it\'s running to ensure images load correctly.\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Connection closed');
  }
}

approveElectronicsProducts().catch(console.error);

