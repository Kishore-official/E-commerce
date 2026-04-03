import 'reflect-metadata';
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://edwinswanith006:Edwin006@e-commerce.civeh16.mongodb.net/?appName=E-commerce';
const mongoDbName = process.env.MONGODB_DB_NAME || 'E-commerce';

async function checkProductImages() {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db(mongoDbName);
    console.log('✅ Connected to MongoDB\n');

    // Find iPhone 15 Pro
    const product = await db.collection('products').findOne({ slug: 'iphone-15-pro' });
    
    if (!product) {
      console.log('❌ Product not found');
      return;
    }

    console.log('📦 Product:', product.name);
    console.log('   Product ID (id field):', product.id);
    console.log('   Product _id:', product._id.toString());
    console.log('');

    // Check images with product.id
    const imagesWithId = await db.collection('product_images').find({ 
      productId: product.id 
    }).toArray();
    
    console.log(`📸 Images found with productId = product.id (${product.id}):`);
    console.log(`   Count: ${imagesWithId.length}`);
    if (imagesWithId.length > 0) {
      console.log(`   Sample: ${imagesWithId.slice(0, 3).map(img => img.url).join(', ')}`);
    }
    console.log('');

    // Check images with product._id
    const imagesWithObjectId = await db.collection('product_images').find({ 
      productId: product._id.toString() 
    }).toArray();
    
    console.log(`📸 Images found with productId = product._id.toString() (${product._id.toString()}):`);
    console.log(`   Count: ${imagesWithObjectId.length}`);
    if (imagesWithObjectId.length > 0) {
      console.log(`   Sample: ${imagesWithObjectId.slice(0, 3).map(img => img.url).join(', ')}`);
    }
    console.log('');

    // Check what productId values actually exist in product_images
    const allProductImages = await db.collection('product_images').find({}).limit(10).toArray();
    console.log('📋 Sample productId values in product_images collection:');
    const uniqueProductIds = [...new Set(allProductImages.map(img => img.productId))];
    console.log(`   Unique productIds in sample: ${uniqueProductIds.slice(0, 5).join(', ')}`);
    console.log('');

    // Check total images for this product using any matching
    const totalImages = await db.collection('product_images').countDocuments({
      $or: [
        { productId: product.id },
        { productId: product._id.toString() }
      ]
    });
    console.log(`📊 Total images matching product (using $or): ${totalImages}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 Connection closed');
  }
}

checkProductImages().catch(console.error);

