import 'reflect-metadata';
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://edwinswanith006:Edwin006@e-commerce.civeh16.mongodb.net/?appName=E-commerce';
const mongoDbName = process.env.MONGODB_DB_NAME || 'E-commerce';

// Fashion category ID
const FASHION_CATEGORY_ID = '169a01d2-6a75-42b5-992c-edfbc9619690';

async function approveBabyProductFashionItems() {
  console.log('🚀 Starting baby product fashion items approval...\n');
  
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    const db = client.db(mongoDbName);
    console.log('✅ Connected to MongoDB\n');
    
    // Find all draft products in Fashion category that are baby products (by SKU pattern or name)
    const products = await db.collection('products')
      .find({ 
        categoryId: FASHION_CATEGORY_ID,
        status: 'draft',
        $or: [
          { name: { $regex: /baby/i } },
          { slug: { $regex: /baby/i } }
        ]
      })
      .toArray();
    
    console.log(`📦 Found ${products.length} draft baby product items in Fashion category\n`);
    
    if (products.length === 0) {
      console.log('⚠️  No draft baby product items found to approve.\n');
      return;
    }
    
    let approvedCount = 0;
    let activatedCount = 0;
    
    for (const product of products) {
      const productId = product.id || product._id;
      
      try {
        // Update product status to approved
        await db.collection('products').updateOne(
          { id: productId },
          { 
            $set: { 
              status: 'approved',
              updatedAt: new Date()
            }
          }
        );
        console.log(`✅ Approved product: ${product.name}`);
        approvedCount++;
        
        // Find and activate associated offers
        const offers = await db.collection('offers')
          .find({ productId: productId })
          .toArray();
        
        for (const offer of offers) {
          await db.collection('offers').updateOne(
            { id: offer.id || offer._id },
            {
              $set: {
                status: 'active',
                updatedAt: new Date()
              }
            }
          );
          console.log(`   ✅ Activated offer for product: ${product.name}`);
          activatedCount++;
        }
        
      } catch (error) {
        console.error(`❌ Failed to approve product ${product.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`✅ Approved: ${approvedCount} products`);
    console.log(`✅ Activated: ${activatedCount} offers`);
    console.log('='.repeat(80));
    console.log('\n🎉 All baby product fashion items are now visible in the storefront!\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Connection closed');
  }
}

approveBabyProductFashionItems().catch(console.error);

