# Search API Documentation

## Overview
The Search API allows you to search for products using Shopify's native Storefront API GraphQL search functionality. The search query uses Shopify's powerful search engine that searches across product titles, descriptions, tags, SKUs, and other product attributes with relevance-based sorting. All search endpoints require authentication.

## Authentication
All search endpoints require a valid Bearer token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

---

## Endpoints

### 1. Search Products

**Endpoint:** `GET /search/:query` or `GET /search/:query/pg-:page`

**Description:** Search for products using Shopify's native search API with GraphQL. The search is performed by Shopify's search engine and returns relevance-sorted results.

**Authentication:** Required (Bearer token)

**URL Parameters:**
- `query` (required): The search term (e.g., "peri bottle", "baby", "diaper")
- `page` (optional): Page number for pagination (default: 1)

**Query Parameters:**
- `limit` (optional): Products per page (default: 24, max: 250)

**Search Capabilities:**
The Shopify search query automatically searches across:
- Product title
- Product description
- Product tags
- Variant SKUs
- Product type
- Vendor name
- Results sorted by RELEVANCE

**Pagination:**
- Default: 24 products per page
- Access pages: `/search/query` (page 1), `/search/query/pg-2` (page 2), etc.
- Page info includes: currentPage, totalPages, totalResults, hasNextPage, hasPreviousPage

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
  "pageInfo": {
    "currentPage": 1,
    "totalPages": 1,
    "productsPerPage": 24,
    "totalResults": 3,
    "hasNextPage": false,
    "hasPreviousPage": false,
    "startCursor": 1,
    "endCursor": 3
  },
  "data": [
    {
      "id": "gid://shopify/Product/8234567890",
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
      "availableForSale": true,
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
      "images": {
        "edges": [
          {
            "node": {
              "id": "gid://shopify/ProductImage/39234567890",
              "url": "https://cdn.shopify.com/s/files/1/0xxx/xxxx/products/peri-bottle.jpg",
              "altText": "Peri Bottle for Postpartum Care",
              "width": 1200,
              "height": 1200
            }
          }
        ]
      },
      "variants": {
        "edges": [
          {
            "node": {
              "id": "gid://shopify/ProductVariant/43234567890",
              "title": "Default Title",
              "sku": "PERI-BOTTLE-001",
              "availableForSale": true,
              "requiresShipping": true,
              "weight": 0.3,
              "weightUnit": "POUNDS",
              "quantityAvailable": 45,
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
          }
        ]
      },
      "options": [
        {
          "id": "gid://shopify/ProductOption/10234567890",
          "name": "Title",
          "values": ["Default Title"]
        }
      ],
      "seo": {
        "title": "Peri Bottle for Postpartum Care",
        "description": "Gentle cleansing solution for new moms. Easy-to-use peri bottle designed for postpartum recovery."
      }
    }
  ]
}
```

#### Example 2: Search for "bottle" with pagination

**Request:**
```bash
GET /search/bottle/pg-2?limit=10
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "success": true,
  "query": "bottle",
  "pageInfo": {
    "currentPage": 2,
    "totalPages": 3,
    "productsPerPage": 10,
    "totalResults": 28,
    "hasNextPage": true,
    "hasPreviousPage": true,
    "startCursor": 11,
    "endCursor": 20
  },
  "data": [
    {
      "id": "gid://shopify/Product/8234567891",
      "title": "Baby Milk Bottle Set",
      ...
    }
  ]
}
```

#### Example 3: Empty search query

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

## Response Structure

### Success Response
- `success` (boolean): Indicates if the search was successful
- `query` (string): The search term that was used
- `pageInfo` (object): Pagination information
  - `currentPage` (number): Current page number
  - `totalPages` (number): Total number of pages available
  - `productsPerPage` (number): Number of products per page
  - `totalResults` (number): Total number of products matching the search
  - `hasNextPage` (boolean): Whether there are more pages after current
  - `hasPreviousPage` (boolean): Whether there are pages before current
  - `startCursor` (number): Starting product number on current page
  - `endCursor` (number): Ending product number on current page
- `data` (array): Array of product objects from Shopify GraphQL API

### Product Object Fields (Shopify GraphQL Format)
Each product in the `data` array is returned in Shopify's native GraphQL format:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Shopify GraphQL global ID |
| `title` | string | Product title |
| `handle` | string | URL-friendly product handle |
| `description` | string | Plain text description |
| `descriptionHtml` | string | HTML description |
| `productType` | string | Product category/type |
| `vendor` | string | Product vendor/brand |
| `tags` | array | Array of product tags |
| `createdAt` | string | ISO 8601 timestamp |
| `updatedAt` | string | ISO 8601 timestamp |
| `publishedAt` | string | ISO 8601 timestamp |
| `availableForSale` | boolean | Whether product can be purchased |
| `totalInventory` | number | Total inventory across all variants |
| `priceRange` | object | Min/max pricing information |
| `compareAtPriceRange` | object | Min/max compare-at pricing |
| `images` | object | GraphQL edges/nodes structure with images |
| `variants` | object | GraphQL edges/nodes structure with variants |
| `options` | array | Product options (size, color, etc.) |
| `seo` | object | SEO title and description |

**Note:** The response uses Shopify's GraphQL structure with `edges` and `nodes` for images and variants.

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
**Cause:** Server error while searching products or GraphQL errors

**Response:**
```json
{
  "success": false,
  "message": "Failed to search products",
  "error": "Error message details"
}
```

**OR (GraphQL errors):**
```json
{
  "success": false,
  "message": "Search failed",
  "errors": [
    {
      "message": "GraphQL error details"
    }
  ]
}
```

---

## Search Tips

### Best Practices
1. **Use natural language:** Shopify's search understands natural queries
2. **Relevance sorting:** Results are automatically sorted by relevance
3. **Multi-word queries:** Shopify handles multi-word searches intelligently
4. **Pagination:** Use pagination for large result sets (default 24 per page)
5. **Custom limit:** Adjust `?limit=` parameter as needed (max 250)

### Search Examples
- Natural language: `/search/baby bottle for newborn`
- Single word: `/search/diaper`
- Multi-word: `/search/postpartum care`
- Brand search: `/search/mommy first`
- Product type: `/search/nursing pillow`
- With pagination: `/search/baby/pg-2`
- Custom limit: `/search/bottle?limit=50`

### Performance Notes
- Uses Shopify's native search engine for accurate results
- Relevance-based sorting ensures best matches appear first
- GraphQL query fetches only needed fields
- Efficient pagination with page info
- Maximum 250 products per page limit
- Search results cached by Shopify for better performance

---

## Quick Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/search/:query` | GET | Required | Search products (page 1, 24 results) |
| `/search/:query/pg-:page` | GET | Required | Search products with pagination |

**Query Parameters:**
- `limit` - Products per page (default: 24, max: 250)

**URL Parameters:**
- `query` - Search term (required)
- `page` - Page number (optional, default: 1)

---

## Integration Example

### JavaScript/Fetch
```javascript
async function searchProducts(query, page = 1, limit = 24) {
  try {
    const endpoint = page > 1 
      ? `/search/${encodeURIComponent(query)}/pg-${page}?limit=${limit}`
      : `/search/${encodeURIComponent(query)}?limit=${limit}`;
    
    const response = await fetch(
      `https://your-api.com${endpoint}`,
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
      console.log(`Found ${data.pageInfo.totalResults} products for "${data.query}"`);
      console.log(`Page ${data.pageInfo.currentPage} of ${data.pageInfo.totalPages}`);
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
const results = await searchProducts('peri bottle', 1, 24);
```

### Axios
```javascript
import axios from 'axios';

const searchProducts = async (query, page = 1, limit = 24) => {
  try {
    const endpoint = page > 1 
      ? `/search/${encodeURIComponent(query)}/pg-${page}`
      : `/search/${encodeURIComponent(query)}`;
    
    const { data } = await axios.get(endpoint, {
      params: { limit },
      headers: {
        Authorization: `Bearer ${yourJwtToken}`
      }
    });
    
    return data;
  } catch (error) {
    console.error('Search error:', error.response?.data || error.message);
    throw error;
  }
};

// Usage
const results = await searchProducts('bottle', 2, 20);
console.log(`Found ${results.pageInfo.totalResults} total products`);
console.log(`Showing ${results.data.length} products on page ${results.pageInfo.currentPage}`);
```

---

## Notes

1. **Shopify Native Search:** Uses Shopify's Storefront API GraphQL search for accurate, relevance-sorted results
2. **Authentication Required:** All search requests must include a valid JWT Bearer token
3. **URL Encoding:** Special characters in search queries should be URL-encoded
4. **GraphQL Response Format:** Products returned in Shopify's native GraphQL structure with edges/nodes
5. **Relevance Sorting:** Results automatically sorted by relevance (best matches first)
6. **Pagination Support:** Both `/search/query` and `/search/query/pg-N` formats supported
7. **Performance:** Leverages Shopify's search infrastructure for fast, accurate results
8. **Search Scope:** Searches across titles, descriptions, tags, SKUs, product types, and vendors

---

**Last Updated:** January 30, 2026

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
