import 'reflect-metadata';
import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://edwinswanith006:Edwin006@e-commerce.civeh16.mongodb.net/?appName=E-commerce';
const mongoDbName = process.env.MONGODB_DB_NAME || 'E-commerce';

async function verifyCategoryProducts(categorySlug: string) {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db(mongoDbName);
    console.log('✅ Connected to MongoDB\n');

    // Find category by slug
    const category = await db.collection('categories').findOne({ slug: categorySlug });
    
    if (!category) {
      console.log(`❌ Category with slug '${categorySlug}' not found`);
      return;
    }

    console.log('📂 Category Information:');
    console.log(`   Name: ${category.name}`);
    console.log(`   Slug: ${categorySlug}`);
    console.log(`   Category ID: ${category.id}`);
    console.log('');

    // Find all products in this category (including child categories)
    const childCategories = await db.collection('categories').find({ 
      parentId: category.id 
    }).toArray();
    
    const categoryIds = [category.id, ...childCategories.map(c => c.id)];
    
    const products = await db.collection('products').find({
      categoryId: { $in: categoryIds },
      status: 'approved'
    }).toArray();

    console.log(`📦 Products in Category: ${products.length}\n`);

    if (products.length === 0) {
      console.log('⚠️  No products found in this category');
      return;
    }

    // For each product, count images
    const productImageCounts = [];
    
    for (const product of products) {
      const imageQuery = {
        $or: [
          { productId: product.id },
          { productId: product._id },
        ],
      };
      
      const imageCount = await db.collection('product_images').countDocuments(imageQuery);
      
      productImageCounts.push({
        name: product.name,
        slug: product.slug,
        productId: product.id,
        imageCount: imageCount
      });
    }

    // Summary
    const totalImages = productImageCounts.reduce((sum, p) => sum + p.imageCount, 0);
    const productsWithImages = productImageCounts.filter(p => p.imageCount > 0).length;
    const productsWithoutImages = productImageCounts.filter(p => p.imageCount === 0).length;
    const avgImagesPerProduct = products.length > 0 ? (totalImages / products.length).toFixed(2) : 0;

    console.log('📊 Category Image Summary:');
    console.log(`   Total Products: ${products.length}`);
    console.log(`   Products with Images: ${productsWithImages}`);
    console.log(`   Products without Images: ${productsWithoutImages}`);
    console.log(`   Total Images: ${totalImages}`);
    console.log(`   Average Images per Product: ${avgImagesPerProduct}\n`);

    console.log('📋 Product Image Details:');
    productImageCounts.forEach((p, idx) => {
      console.log(`   ${idx + 1}. ${p.name}`);
      console.log(`      Slug: ${p.slug}`);
      console.log(`      Images: ${p.imageCount}`);
    });

    return {
      categoryName: category.name,
      totalProducts: products.length,
      totalImages: totalImages,
      productsWithImages: productsWithImages,
      productImageCounts: productImageCounts
    };

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 Connection closed');
  }
}

// Get category slug from command line argument
const categorySlug = process.argv[2] || 'electronics';
verifyCategoryProducts(categorySlug).catch(console.error);

