# Search API Documentation

## Overview
The Search API allows you to search for products across multiple fields including product ID, title, description, product type, vendor, tags, and SKU. All search endpoints require authentication.

## Authentication
All search endpoints require a valid Bearer token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

---

## Endpoints

### 1. Search Products

**Endpoint:** `GET /search/:query`

**Description:** Search for products by query string. The search is performed across multiple product fields including ID, title, description (HTML-stripped), product type, vendor, tags, and variant SKUs.

**Authentication:** Required (Bearer token)

**URL Parameters:**
- `query` (required): The search term (e.g., "peri bottle", "baby", "diaper")

**Query Parameters:**
- `limit` (optional): Maximum number of results to return (default: 50)

**Search Fields:**
The search query will match products if found in any of these fields:
- Product ID (legacy resource ID)
- Product title
- Product description (HTML tags stripped)
- Product type
- Vendor name
- Product tags
- Variant SKU
- Variant barcode (if available)

**Search Behavior:**
- Case-insensitive matching
- Partial word matching (e.g., "bottle" matches "Peri Bottle" and "Water Bottle")
- Searches across all active products in your Shopify store
- Results are filtered client-side for comprehensive matching

---

### Examples

#### Example 1: Search for "peri bottle"

**Request:**
```bash
GET /search/peri bottle
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "success": true,
  "query": "peri bottle",
  "totalResults": 3,
  "data": [
    {
      "id": "gid://shopify/Product/8234567890",
      "legacyResourceId": 8234567890,
      "title": "Peri Bottle for Postpartum Care",
      "handle": "peri-bottle-postpartum",
      "description": "Gentle cleansing solution for new moms. Easy-to-use peri bottle designed for postpartum recovery.",
      "descriptionHtml": "<p>Gentle cleansing solution for new moms...</p>",
      "productType": "Postpartum Care",
      "vendor": "Mommy First",
      "tags": ["postpartum", "peri bottle", "new mom", "recovery"],
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2025-01-20T14:22:00Z",
      "publishedAt": "2025-01-15T10:30:00Z",
      "status": "active",
      "availableForSale": true,
      "stockStatus": "in_stock",
      "totalInventory": 45,
      "priceRange": {
        "minVariantPrice": {
          "amount": "12.99",
          "currencyCode": "USD"
        },
        "maxVariantPrice": {
          "amount": "12.99",
          "currencyCode": "USD"
        }
      },
      "compareAtPriceRange": {
        "minVariantPrice": {
          "amount": "16.99",
          "currencyCode": "USD"
        },
        "maxVariantPrice": {
          "amount": "16.99",
          "currencyCode": "USD"
        }
      },
      "images": [
        {
          "id": 39234567890,
          "url": "https://cdn.shopify.com/s/files/1/0xxx/xxxx/products/peri-bottle.jpg",
          "altText": "Peri Bottle for Postpartum Care",
          "width": 1200,
          "height": 1200
        }
      ],
      "variants": [
        {
          "id": "gid://shopify/ProductVariant/43234567890",
          "legacyResourceId": 43234567890,
          "title": "Default Title",
          "sku": "PERI-BOTTLE-001",
          "availableForSale": true,
          "stockStatus": "in_stock",
          "requiresShipping": true,
          "weight": 0.3,
          "weightUnit": "lb",
          "inventoryQuantity": 45,
          "inventoryPolicy": "deny",
          "price": {
            "amount": "12.99",
            "currencyCode": "USD"
          },
          "compareAtPrice": {
            "amount": "16.99",
            "currencyCode": "USD"
          },
          "selectedOptions": [],
          "image": null
        }
      ],
      "options": [
        {
          "id": 10234567890,
          "name": "Title",
          "values": ["Default Title"]
        }
      ],
      "metafields": null,
      "seo": {
        "title": "Peri Bottle for Postpartum Care",
        "description": "Gentle cleansing solution for new moms. Easy-to-use peri bottle designed for postpartum recovery."
      }
    }
  ]
}
```

#### Example 2: Search for "bottle" with limit

**Request:**
```bash
GET /search/bottle?limit=20
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "success": true,
  "query": "bottle",
  "totalResults": 8,
  "data": [
    {
      "id": "gid://shopify/Product/8234567890",
      "legacyResourceId": 8234567890,
      "title": "Peri Bottle for Postpartum Care",
      ...
    },
    {
      "id": "gid://shopify/Product/8234567891",
      "legacyResourceId": 8234567891,
      "title": "Baby Milk Bottle Set",
      ...
    },
    {
      "id": "gid://shopify/Product/8234567892",
      "legacyResourceId": 8234567892,
      "title": "Water Bottle - Insulated",
      ...
    }
  ]
}
```

#### Example 3: Search by SKU

**Request:**
```bash
GET /search/PERI-001
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "success": true,
  "query": "PERI-001",
  "totalResults": 1,
  "data": [
    {
      "id": "gid://shopify/Product/8234567890",
      "title": "Peri Bottle for Postpartum Care",
      "variants": [
        {
          "sku": "PERI-BOTTLE-001",
          ...
        }
      ],
      ...
    }
  ]
}
```

#### Example 4: Empty search query

**Request:**
```bash
GET /search/
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "success": false,
  "message": "Search query is required"
}
```

**Status Code:** `400 Bad Request`

---

## Response Fields

### Success Response
- `success` (boolean): Indicates if the search was successful
- `query` (string): The search term that was used
- `totalResults` (number): Number of products matching the search
- `data` (array): Array of product objects matching the search

### Product Object Fields
Each product in the `data` array contains:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Shopify GraphQL global ID |
| `legacyResourceId` | number | Shopify Admin API numeric ID |
| `title` | string | Product title |
| `handle` | string | URL-friendly product handle |
| `description` | string | Plain text description (HTML stripped) |
| `descriptionHtml` | string | Original HTML description |
| `productType` | string | Product category/type |
| `vendor` | string | Product vendor/brand |
| `tags` | array | Array of product tags |
| `createdAt` | string | ISO 8601 timestamp |
| `updatedAt` | string | ISO 8601 timestamp |
| `publishedAt` | string | ISO 8601 timestamp |
| `status` | string | Product status (active, draft, archived) |
| `availableForSale` | boolean | Whether product can be purchased |
| `stockStatus` | string | Stock status: `in_stock`, `orderable`, `out_of_stock` |
| `totalInventory` | number | Total inventory across all variants |
| `priceRange` | object | Min/max pricing information |
| `compareAtPriceRange` | object | Min/max compare-at pricing |
| `images` | array | Product images |
| `variants` | array | Product variants with pricing and inventory |
| `options` | array | Product options (size, color, etc.) |
| `metafields` | null | Custom metafields (currently null) |
| `seo` | object | SEO title and description |

### Stock Status Values
- `in_stock`: Product has inventory available
- `orderable`: Product allows backorders (inventory may be 0)
- `out_of_stock`: Product is not available for purchase

---

## Error Responses

### 400 Bad Request
**Cause:** Empty or missing search query

**Response:**
```json
{
  "success": false,
  "message": "Search query is required"
}
```

### 401 Unauthorized
**Cause:** Missing or invalid Bearer token

**Response:**
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

### 500 Internal Server Error
**Cause:** Server error while searching products

**Response:**
```json
{
  "success": false,
  "message": "Failed to search products",
  "error": "Error message details"
}
```

---

## Search Tips

### Best Practices
1. **Use specific terms:** More specific queries return more relevant results
2. **Try variations:** Search for singular/plural forms if needed
3. **Use SKU for exact matches:** SKU search is very precise for known products
4. **Limit results:** Use the `limit` parameter for large result sets
5. **Product IDs:** You can search by numeric product ID

### Search Examples
- Search by product name: `/search/diaper bag`
- Search by category: `/search/postpartum`
- Search by brand: `/search/mommy first`
- Search by SKU: `/search/MB-001`
- Search by tag: `/search/new mom`
- Search by partial word: `/search/bot` (matches "bottle", "robot", etc.)

### Performance Notes
- Maximum of 50 products returned by default
- Increase limit for more results: `/search/baby?limit=100`
- Search is performed client-side after fetching from Shopify
- HTML is stripped from descriptions for clean text searching
- Case-insensitive matching for better user experience

---

## Quick Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/search/:query` | GET | Required | Search products by query string |

**Query Parameters:**
- `limit` - Max results (default: 50)

**Search Fields:**
Product ID, Title, Description, Product Type, Vendor, Tags, SKU

---

## Integration Example

### JavaScript/Fetch
```javascript
async function searchProducts(query, limit = 50) {
  try {
    const response = await fetch(
      `https://your-api.com/search/${encodeURIComponent(query)}?limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${yourJwtToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`Found ${data.totalResults} products for "${data.query}"`);
      return data.data;
    } else {
      console.error('Search failed:', data.message);
      return [];
    }
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

// Usage
const results = await searchProducts('peri bottle');
```

### Axios
```javascript
import axios from 'axios';

const searchProducts = async (query, limit = 50) => {
  try {
    const { data } = await axios.get(
      `/search/${encodeURIComponent(query)}`,
      {
        params: { limit },
        headers: {
          Authorization: `Bearer ${yourJwtToken}`
        }
      }
    );
    
    return data;
  } catch (error) {
    console.error('Search error:', error.response?.data || error.message);
    throw error;
  }
};

// Usage
const results = await searchProducts('bottle', 20);
console.log(`Found ${results.totalResults} products`);
```

---

## Notes

1. **Authentication Required:** All search requests must include a valid JWT Bearer token
2. **URL Encoding:** Special characters in search queries should be URL-encoded
3. **Case Insensitive:** Search is not case-sensitive for better usability
4. **Partial Matching:** Search finds products containing the query term anywhere in the searchable fields
5. **Multiple Words:** Queries with spaces search for that exact phrase
6. **HTML Stripping:** Product descriptions have HTML tags removed before searching
7. **SKU Search:** Variant SKUs are included in the search for precise product identification

---

**Last Updated:** January 30, 2026
