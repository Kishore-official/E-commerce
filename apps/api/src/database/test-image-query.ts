import 'reflect-metadata';
import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://edwinswanith006:Edwin006@e-commerce.civeh16.mongodb.net/?appName=E-commerce';
const mongoDbName = process.env.MONGODB_DB_NAME || 'E-commerce';

async function testImageQuery() {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db(mongoDbName);
    console.log('✅ Connected to MongoDB\n');

    const product = await db.collection('products').findOne({ slug: 'iphone-15-pro' });
    
    if (!product) {
      console.log('❌ Product not found');
      return;
    }

    console.log('📦 Product:', product.name);
    console.log('   Product ID (id):', product.id);
    console.log('   Product _id:', product._id.toString());
    console.log('   Product _id type:', product._id instanceof ObjectId ? 'ObjectId' : typeof product._id);
    console.log('');

    // Test query with ObjectId directly (the fix)
    const queryWithObjectId = {
      $or: [
        { productId: product.id },
        { productId: product._id }, // ObjectId object
      ],
    };
    
    const totalImages = await db.collection('product_images').find(queryWithObjectId).toArray();
    console.log(`✅ Total images with ObjectId query: ${totalImages.length}`);
    
    if (totalImages.length > 0) {
      console.log(`\n📋 First 5 images:`);
      totalImages.slice(0, 5).forEach((img, idx) => {
        console.log(`   ${idx + 1}. ${img.url}`);
        console.log(`      productId: ${img.productId} (type: ${typeof img.productId}, isObjectId: ${img.productId instanceof ObjectId})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 Connection closed');
  }
}

testImageQuery().catch(console.error);

