import 'reflect-metadata';
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://edwinswanith006:Edwin006@e-commerce.civeh16.mongodb.net/?appName=E-commerce';
const mongoDbName = process.env.MONGODB_DB_NAME || 'E-commerce';

async function checkProductImageCount(productSlug: string) {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db(mongoDbName);
    console.log('✅ Connected to MongoDB\n');

    // Find product by slug
    const product = await db.collection('products').findOne({ slug: productSlug });
    
    if (!product) {
      console.log(`❌ Product with slug '${productSlug}' not found`);
      return;
    }

    console.log('📦 Product Information:');
    console.log(`   Name: ${product.name}`);
    console.log(`   Slug: ${product.slug}`);
    console.log(`   Product ID (id field): ${product.id}`);
    console.log(`   Product _id: ${product._id.toString()}`);
    console.log('');

    // Check images with product.id (UUID)
    const imagesWithId = await db.collection('product_images').find({ 
      productId: product.id 
    }).toArray();
    
    // Check images with product._id (ObjectId)
    const imagesWithObjectId = await db.collection('product_images').find({ 
      productId: product._id.toString() 
    }).toArray();

    // Check total using $or query (like the API does now)
    const totalImages = await db.collection('product_images').find({
      $or: [
        { productId: product.id },
        { productId: product._id.toString() }
      ]
    }).toArray();

    console.log('📸 Image Counts:');
    console.log(`   Images with productId = product.id (UUID): ${imagesWithId.length}`);
    console.log(`   Images with productId = product._id (ObjectId): ${imagesWithObjectId.length}`);
    console.log(`   Total images (using $or query): ${totalImages.length}`);
    console.log('');

    if (totalImages.length > 0) {
      console.log('📋 Sample Images (first 5):');
      totalImages.slice(0, 5).forEach((img, idx) => {
        console.log(`   ${idx + 1}. ${img.url}`);
        console.log(`      productId: ${img.productId}`);
        console.log(`      isPrimary: ${img.isPrimary}`);
        console.log(`      sortOrder: ${img.sortOrder}`);
      });
    }

    return {
      productName: product.name,
      productId: product.id,
      productObjectId: product._id.toString(),
      totalImages: totalImages.length,
      imagesWithId: imagesWithId.length,
      imagesWithObjectId: imagesWithObjectId.length
    };

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 Connection closed');
  }
}

// Get product slug from command line argument
const productSlug = process.argv[2] || 'iphone-15-pro';
checkProductImageCount(productSlug).catch(console.error);

