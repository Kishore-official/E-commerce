import 'reflect-metadata';
import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://edwinswanith006:Edwin006@e-commerce.civeh16.mongodb.net/?appName=E-commerce';
const mongoDbName = process.env.MONGODB_DB_NAME || 'E-commerce';

async function checkElectronicsProducts() {
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

    console.log('📂 Category: Electronics');
    console.log(`   Category ID: ${category.id}\n`);

    // Find all products in this category
    const products = await db.collection('products').find({
      categoryId: category.id,
      status: 'approved'
    }).toArray();

    console.log(`📦 Total Products in MongoDB: ${products.length}\n`);

    // For each product, check if it has active offers
    for (const product of products) {
      const activeOffers = await db.collection('offers').find({
        productId: product.id,
        status: 'active'
      }).toArray();

      const activeVariants = await db.collection('variants').find({
        productId: product.id,
        isActive: true
      }).toArray();

      console.log(`📱 ${product.name}`);
      console.log(`   Slug: ${product.slug}`);
      console.log(`   Status: ${product.status}`);
      console.log(`   Active Variants: ${activeVariants.length}`);
      console.log(`   Active Offers: ${activeOffers.length}`);
      
      if (activeOffers.length === 0) {
        console.log(`   ⚠️  NO ACTIVE OFFERS - This product won't show in storefront!`);
      }
      console.log('');
    }

    // Check what the storefront query would return
    console.log('🔍 Storefront Query Analysis:\n');
    
    // Get products with active offers (this is what storefront shows)
    const productsWithOffers = [];
    for (const product of products) {
      const offers = await db.collection('offers').find({
        productId: product.id,
        status: 'active'
      }).toArray();
      
      if (offers.length > 0) {
        productsWithOffers.push({
          name: product.name,
          slug: product.slug,
          offerCount: offers.length
        });
      }
    }

    console.log(`✅ Products with Active Offers (will show in storefront): ${productsWithOffers.length}`);
    productsWithOffers.forEach((p, idx) => {
      console.log(`   ${idx + 1}. ${p.name} (${p.offerCount} offers)`);
    });

    console.log(`\n❌ Products WITHOUT Active Offers (won't show): ${products.length - productsWithOffers.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 Connection closed');
  }
}

checkElectronicsProducts().catch(console.error);

