import 'reflect-metadata';
import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://edwinswanith006:Edwin006@e-commerce.civeh16.mongodb.net/?appName=E-commerce';
const mongoDbName = process.env.MONGODB_DB_NAME || 'E-commerce';

async function checkElectronicsFull() {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db(mongoDbName);
    console.log('✅ Connected to MongoDB\n');

    // Find Electronics category
    const category = await db.collection('categories').findOne({ slug: 'electronics' });
    
    if (!category) {
      console.log('❌ Electronics category not found');
      return;
    }

    console.log('📂 Electronics Category:');
    console.log(`   ID: ${category.id}`);
    console.log(`   Name: ${category.name}`);
    console.log(`   Slug: ${category.slug}\n`);

    // Find child categories (like Smartphones, Laptops under Electronics)
    const childCategories = await db.collection('categories').find({ 
      parentId: category.id 
    }).toArray();

    console.log(`📁 Child Categories: ${childCategories.length}`);
    childCategories.forEach(cat => {
      console.log(`   - ${cat.name} (${cat.slug})`);
    });
    console.log('');

    // Get all category IDs (parent + children)
    const categoryIds = [category.id, ...childCategories.map(c => c.id)];
    console.log(`📋 Total Category IDs to search: ${categoryIds.length}\n`);

    // Find all products in Electronics and its child categories
    const products = await db.collection('products').find({
      categoryId: { $in: categoryIds },
      status: 'approved'
    }).toArray();

    console.log(`📦 Total Products in Electronics + Child Categories: ${products.length}\n`);

    // For each product, check offers and determine if it will show
    const productsWithDetails = [];
    
    for (const product of products) {
      const productCategory = await db.collection('categories').findOne({ id: product.categoryId });
      
      const activeOffers = await db.collection('offers').find({
        productId: product.id,
        status: 'active'
      }).toArray();

      productsWithDetails.push({
        name: product.name,
        slug: product.slug,
        categoryName: productCategory?.name || 'Unknown',
        categorySlug: productCategory?.slug || 'Unknown',
        offerCount: activeOffers.length,
        willShow: activeOffers.length > 0
      });
    }

    console.log('📋 All Products in Electronics Category Tree:\n');
    productsWithDetails.forEach((p, idx) => {
      const status = p.willShow ? '✅' : '❌';
      console.log(`${status} ${idx + 1}. ${p.name}`);
      console.log(`      Category: ${p.categoryName}`);
      console.log(`      Active Offers: ${p.offerCount}`);
      if (!p.willShow) {
        console.log(`      ⚠️  Won't show in storefront (no active offers)`);
      }
      console.log('');
    });

    const showingProducts = productsWithDetails.filter(p => p.willShow);
    const notShowingProducts = productsWithDetails.filter(p => !p.willShow);

    console.log('📊 Summary:');
    console.log(`   Total Products: ${products.length}`);
    console.log(`   Products with Active Offers (will show): ${showingProducts.length}`);
    console.log(`   Products without Active Offers (won't show): ${notShowingProducts.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 Connection closed');
  }
}

checkElectronicsFull().catch(console.error);

