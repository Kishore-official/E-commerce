import 'reflect-metadata';
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://edwinswanith006:Edwin006@e-commerce.civeh16.mongodb.net/?appName=E-commerce';
const mongoDbName = process.env.MONGODB_DB_NAME || 'E-commerce';

// Baby Products category ID
const BABY_PRODUCTS_CATEGORY_ID = 'd017dbf2-7828-423c-addd-aa3aa82cddf2';

async function updateBabyProductsCategory() {
  console.log('🚀 Starting baby products category update...\n');
  
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    const db = client.db(mongoDbName);
    console.log('✅ Connected to MongoDB\n');
    
    // Find all products with "Baby" in the name
    const products = await db.collection('products')
      .find({ 
        name: { $regex: /Baby/i }
      })
      .toArray();
    
    console.log(`📦 Found ${products.length} baby products to update\n`);
    
    if (products.length === 0) {
      console.log('⚠️  No baby products found.\n');
      return;
    }
    
    let updatedCount = 0;
    
    for (const product of products) {
      const productId = product.id || product._id;
      
      try {
        // Update product category to Baby Products
        const result = await db.collection('products').updateOne(
          { id: productId },
          { 
            $set: { 
              categoryId: BABY_PRODUCTS_CATEGORY_ID,
              updatedAt: new Date()
            }
          }
        );
        
        if (result.modifiedCount > 0) {
          console.log(`✅ Updated category for: ${product.name}`);
          updatedCount++;
        }
        
      } catch (error) {
        console.error(`❌ Failed to update product ${product.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`✅ Updated: ${updatedCount} products`);
    console.log('='.repeat(80));
    console.log('\n🎉 All baby products are now in the Baby Products category!\n');
    console.log('   They should now appear when clicking "Baby Products" in the dropdown.\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Connection closed');
  }
}

updateBabyProductsCategory().catch(console.error);

