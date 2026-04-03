/**
 * Test the categories endpoint to verify it returns all 14 categories with image counts
 * 
 * Usage: ts-node -r tsconfig-paths/register src/database/test-categories-endpoint.ts
 */

import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3000/api/v1';

async function testCategoriesEndpoint() {
  try {
    console.log('🧪 Testing Categories Endpoint\n');
    console.log(`API URL: ${API_URL}/catalog/categories/all-with-images\n`);

    const response = await axios.get(`${API_URL}/catalog/categories/all-with-images`);
    const categories = response.data;

    console.log(`✅ Successfully fetched ${categories.length} categories\n`);

    // Filter categories with images
    const categoriesWithImages = categories.filter((cat: any) => (cat.imageCount || 0) > 0);
    
    console.log(`📊 Categories with images: ${categoriesWithImages.length}\n`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  CATEGORIES WITH IMAGE COUNTS');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Sort by image count
    categoriesWithImages.sort((a: any, b: any) => (b.imageCount || 0) - (a.imageCount || 0));

    console.log('Rank | Category Name              | Images    | Has Sample Image');
    console.log('─────┼───────────────────────────┼───────────┼─────────────────');

    categoriesWithImages.forEach((cat: any, index: number) => {
      const rank = (index + 1).toString().padStart(4);
      const name = (cat.name || 'N/A').substring(0, 27).padEnd(27);
      const images = (cat.imageCount || 0).toLocaleString().padStart(9);
      const hasImage = (cat.sampleImageUrl || cat.imageUrl) ? '✅ Yes' : '❌ No';
      console.log(`${rank} | ${name} | ${images} | ${hasImage}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════\n');

    // Verify we have all 14 expected categories
    const expectedCategories = [
      'Baby Essentials',
      'Food & Pantry',
      'Toys & Stationery',
      'Kitchen & Storage',
      'Pet Care',
      'Fitness & Gear',
      'Electronics',
      'Beauty & Health',
      'Fashion',
      "Men's Clothing",
      'Personal Care',
      'Smartphones',
      'Laptops',
      'QA Test Category 33c5'
    ];

    const foundCategories = categoriesWithImages.map((cat: any) => cat.name);
    const missingCategories = expectedCategories.filter(name => !foundCategories.includes(name));

    if (missingCategories.length === 0) {
      console.log('✅ All 14 expected categories are present!\n');
    } else {
      console.log(`⚠️  Missing categories: ${missingCategories.join(', ')}\n`);
    }

    // Check sample images
    const categoriesWithSampleImages = categoriesWithImages.filter(
      (cat: any) => cat.sampleImageUrl || cat.imageUrl
    );
    console.log(`📸 Categories with sample images: ${categoriesWithSampleImages.length}/${categoriesWithImages.length}\n`);

    // Test a specific category endpoint
    if (categoriesWithImages.length > 0) {
      const testCategory = categoriesWithImages[0];
      console.log(`\n🔍 Testing category page: ${testCategory.slug}`);
      console.log(`   URL: http://localhost:3001/categories/${testCategory.slug}`);
      console.log(`   Expected images: ${testCategory.imageCount}\n`);
    }

    console.log('✅ Test complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Open http://localhost:3001 in your browser');
    console.log('   2. Scroll to "Shop by Category" section');
    console.log('   3. Verify all 14 categories are displayed');
    console.log('   4. Click on any category to see products with images');
    console.log('   5. Verify images are loading correctly\n');

  } catch (error: any) {
    console.error('❌ Error testing endpoint:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    process.exit(1);
  }
}

testCategoriesEndpoint();

