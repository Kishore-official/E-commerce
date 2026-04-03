const https = require('http');

// Check storefront listings
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/v1/storefront/listings?limit=100',
  method: 'GET'
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const response = JSON.parse(data);
    const listings = response.data?.data || [];
    const totalItems = response.data?.meta?.totalItems || 0;
    
    console.log(`\n=== STOREFRONT PRODUCT COUNT ===`);
    console.log(`Total products showing: ${totalItems}`);
    console.log(`Products in current page: ${listings.length}`);
    
    const withImages = listings.filter(p => p.imageUrl).length;
    const withoutImages = listings.filter(p => !p.imageUrl).length;
    
    console.log(`\n=== IMAGE STATUS ===`);
    console.log(`Products with images: ${withImages}`);
    console.log(`Products without images: ${withoutImages}`);
    
    if (withoutImages > 0) {
      console.log(`\nProducts missing images:`);
      listings.filter(p => !p.imageUrl).forEach(p => {
        console.log(`  - ${p.productName} (ID: ${p.productId})`);
      });
    }
    
    // Sample a few image URLs
    console.log(`\n=== SAMPLE IMAGE URLS ===`);
    listings.slice(0, 5).forEach(p => {
      console.log(`${p.productName}: ${p.imageUrl || 'NO IMAGE'}`);
    });
  });
});

req.on('error', (e) => {
  console.error(`Problem: ${e.message}`);
});

req.end();

