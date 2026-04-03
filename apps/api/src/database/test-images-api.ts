import 'reflect-metadata';
import * as http from 'http';
import * as https from 'https';

const baseUrl = 'http://localhost:3000';
const apiPrefix = '/api/v1';
// Try different possible routes
const possibleRoutes = [
  `${baseUrl}${apiPrefix}/storefront/listings?limit=3`,
  `${baseUrl}${apiPrefix}/admin/catalog/products?limit=3`,
  `${baseUrl}${apiPrefix}/catalog/products`,
];

function makeRequest(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function testImagesAPI() {
  console.log('🧪 Testing Images API...\n');
  console.log('='.repeat(80));
  
  try {
    // Test 1: Find the correct API route
    console.log('📡 Test 1: Finding correct API route...\n');
    let apiUrl = '';
    let productsData = '';
    
    for (const route of possibleRoutes) {
      try {
        console.log(`   Trying: ${route}`);
        productsData = await makeRequest(route);
        apiUrl = route;
        console.log(`   ✅ Found working route: ${route}\n`);
        break;
      } catch (error) {
        console.log(`   ❌ ${route} - Not available\n`);
      }
    }
    
    if (!apiUrl) {
      throw new Error('Could not find a working products API route');
    }
    
    // Test 2: Get products with images
    console.log('📡 Test 2: Fetching products from API...');
    console.log(`   URL: ${apiUrl}\n`);
    const response = JSON.parse(productsData);
    
    // Handle nested response format
    const products = response.data?.data || response.data || [];
    const meta = response.data?.meta || response.meta;
    
    if (Array.isArray(products) && products.length > 0) {
      console.log(`✅ Successfully fetched ${products.length} products`);
      if (meta) {
        console.log(`   Total available: ${meta.totalItems} products\n`);
      } else {
        console.log('\n');
      }
      
      // Test each product's images
      for (let i = 0; i < Math.min(products.length, 3); i++) {
        const product = products[i];
        console.log(`\n📦 Product ${i + 1}: ${product.name || product.productName || 'Unknown'}`);
        console.log(`   ID: ${product.id || product.productId}`);
        console.log(`   Slug: ${product.slug || product.productSlug || 'N/A'}`);
        
        // Storefront listings might have imageUrl instead of images array
        const images = product.images || (product.imageUrl ? [{ url: product.imageUrl, isPrimary: true }] : []);
        
        if (images && Array.isArray(images) && images.length > 0) {
          console.log(`   Images: ${images.length} image(s)`);
          
          for (let j = 0; j < images.length; j++) {
            const image = images[j];
            console.log(`\n   🖼️  Image ${j + 1}:`);
            console.log(`      URL: ${image.url}`);
            console.log(`      Primary: ${image.isPrimary ? 'Yes' : 'No'}`);
            console.log(`      Alt Text: ${image.altText || 'N/A'}`);
            
            // Test if image URL is accessible
            try {
              const imageResponse = await makeRequest(image.url);
              console.log(`      ✅ Image accessible (${imageResponse.length} bytes)`);
            } catch (error) {
              console.log(`      ❌ Image NOT accessible: ${error instanceof Error ? error.message : String(error)}`);
            }
          }
        } else {
          console.log(`   ⚠️  No images found for this product`);
        }
      }
      
      // Test 3: Get a specific product
      const firstProduct = products[0];
      const productSlug = firstProduct.slug || firstProduct.productSlug;
      
      if (productSlug) {
        console.log(`\n\n📡 Test 3: Fetching specific product details...`);
        const productUrl = `${baseUrl}${apiPrefix}/storefront/listings/${productSlug}`;
        console.log(`   URL: ${productUrl}\n`);
        
        try {
          const productData = await makeRequest(productUrl);
          const productResponse = JSON.parse(productData);
          const product = productResponse.data || productResponse;
          
          console.log(`✅ Product details fetched`);
          console.log(`   Name: ${product.name || product.productName}`);
          
          const productImages = product.images || (product.imageUrl ? [{ url: product.imageUrl }] : []);
          console.log(`   Images: ${productImages.length} image(s)`);
          
          if (productImages.length > 0) {
            const primaryImage = productImages.find((img: any) => img.isPrimary) || productImages[0];
            console.log(`   Primary Image URL: ${primaryImage.url}`);
            
            // Test image accessibility
            try {
              const imageResponse = await makeRequest(primaryImage.url);
              console.log(`   ✅ Primary image accessible (${imageResponse.length} bytes)`);
            } catch (error) {
              console.log(`   ❌ Primary image NOT accessible: ${error instanceof Error ? error.message : String(error)}`);
            }
          }
        } catch (error) {
          console.log(`   ⚠️  Could not fetch product details: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } else {
      console.log('❌ Unexpected response format');
      console.log(JSON.stringify(response, null, 2));
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ API Testing Complete!');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('\n❌ Error testing API:', error);
    console.log('\n💡 Make sure your API server is running:');
    console.log('   cd apps/api && pnpm dev');
    process.exit(1);
  }
}

testImagesAPI().catch(console.error);

