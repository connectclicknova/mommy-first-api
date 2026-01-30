# Products & Collections API Documentation

This document describes all endpoints for fetching products and collections from Shopify.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Products Endpoints](#products-endpoints)
3. [Collections Endpoints](#collections-endpoints)
4. [Response Data Structure](#response-data-structure)
5. [Error Handling](#error-handling)

---

## Authentication

All product and collection endpoints require JWT Bearer token authentication.

**Headers:**
```
Authorization: Bearer your-jwt-token
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

---

## Products Endpoints

### 1. Get Paginated Products List

**Endpoint:** `GET /products` or `GET /products/pg-1`, `/products/pg-2`, etc.

**Description:**
Fetches a paginated list of products (24 products per page).

**Headers:**
```
Authorization: Bearer your-jwt-token
```

**URL Parameters:**
- `page` (optional) - Page number (default: 1)

**Examples:**
```
GET /products
GET /products/pg-1
GET /products/pg-2
```

**Response (200):**
```json
{
  "success": true,
  "page": 1,
  "perPage": 24,
  "totalProducts": 150,
  "hasNextPage": true,
  "hasPreviousPage": false,
  "data": [
    {
      "id": "gid://shopify/Product/123456789",
      "title": "Cotton T-Shirt",
      "handle": "cotton-t-shirt",
      "description": "Comfortable cotton t-shirt",
      "descriptionHtml": "<p>Comfortable cotton t-shirt</p>",
      "productType": "Apparel",
      "vendor": "Brand Name",
      "tags": ["cotton", "casual", "summer"],
      "createdAt": "2026-01-15T10:00:00Z",
      "updatedAt": "2026-01-25T14:30:00Z",
      "publishedAt": "2026-01-15T10:00:00Z",
      "availableForSale": true,
      "onlineStoreUrl": "https://store.myshopify.com/products/cotton-t-shirt",
      "priceRange": {
        "minVariantPrice": {
          "amount": "29.99",
          "currencyCode": "USD"
        },
        "maxVariantPrice": {
          "amount": "39.99",
          "currencyCode": "USD"
        }
      },
      "compareAtPriceRange": {
        "minVariantPrice": {
          "amount": "49.99",
          "currencyCode": "USD"
        },
        "maxVariantPrice": {
          "amount": "59.99",
          "currencyCode": "USD"
        }
      },
      "images": [
        {
          "id": "12345",
          "url": "https://cdn.shopify.com/...",
          "altText": "Cotton T-Shirt Front",
          "width": 1200,
          "height": 1200
        }
      ],
      "variants": [
        {
          "id": "gid://shopify/ProductVariant/987654321",
          "title": "Small / Blue",
          "sku": "CT-SM-BLU",
          "availableForSale": true,
          "requiresShipping": true,
          "weight": 0.5,
          "weightUnit": "POUNDS",
          "price": {
            "amount": "29.99",
            "currencyCode": "USD"
          },
          "compareAtPrice": {
            "amount": "49.99",
            "currencyCode": "USD"
          },
          "selectedOptions": [
            {
              "name": "Size",
              "value": "Small"
            },
            {
              "name": "Color",
              "value": "Blue"
            }
          ],
          "image": {
            "id": "12345",
            "url": "https://cdn.shopify.com/...",
            "altText": "Blue T-Shirt"
          }
        }
      ],
      "options": [
        {
          "id": "111",
          "name": "Size",
          "values": ["Small", "Medium", "Large"]
        },
        {
          "id": "222",
          "name": "Color",
          "values": ["Blue", "Red", "Green"]
        }
      ],
      "metafields": null,
      "seo": {
        "title": "Cotton T-Shirt - Comfortable & Stylish",
        "description": "Shop our comfortable cotton t-shirt..."
      }
    }
  ]
}
```

---

### 2. Get Single Product Details

**Endpoint:** `GET /products/:handle`

**Description:**
Fetches complete details of a single product by its handle.

**Headers:**
```
Authorization: Bearer your-jwt-token
```

**URL Parameters:**
- `handle` (required) - Product handle (e.g., `cotton-t-shirt`)

**Example:**
```
GET /products/cotton-t-shirt
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "gid://shopify/Product/123456789",
    "title": "Cotton T-Shirt",
    "handle": "cotton-t-shirt",
    "description": "Comfortable cotton t-shirt",
    "descriptionHtml": "<p>Comfortable cotton t-shirt</p>",
    "productType": "Apparel",
    "vendor": "Brand Name",
    "tags": ["cotton", "casual", "summer"],
    "createdAt": "2026-01-15T10:00:00Z",
    "updatedAt": "2026-01-25T14:30:00Z",
    "publishedAt": "2026-01-15T10:00:00Z",
    "availableForSale": true,
    "onlineStoreUrl": "https://store.myshopify.com/products/cotton-t-shirt",
    "priceRange": { /* ... */ },
    "compareAtPriceRange": { /* ... */ },
    "images": [ /* ... */ ],
    "variants": [ /* ... */ ],
    "options": [ /* ... */ ],
    "metafields": null,
    "seo": { /* ... */ }
  }
}
```

**Response (404):**
```json
{
  "success": false,
  "message": "Product not found"
}
```

---

## Collections Endpoints

### 1. Get All Collections

**Endpoint:** `GET /collections`

**Description:**
Fetches a list of all collections (both custom and smart collections).

**Headers:**
```
Authorization: Bearer your-jwt-token
```

**Query Parameters:**
- `limit` (optional) - Number of collections to fetch (default: 50)

**Example:**
```
GET /collections
GET /collections?limit=20
```

**Response (200):**
```json
{
  "success": true,
  "totalCollections": 5,
  "data": [
    {
      "id": "gid://shopify/Collection/123456789",
      "legacyResourceId": 123456789,
      "title": "Summer Collection",
      "handle": "summer-collection",
      "description": "Explore our summer essentials",
      "descriptionHtml": "<p>Explore our summer essentials</p>",
      "updatedAt": "2026-01-25T10:00:00Z",
      "image": {
        "id": 98765,
        "url": "https://cdn.shopify.com/...",
        "altText": "Summer Collection Banner",
        "width": 1200,
        "height": 600
      },
      "type": "custom"
    },
    {
      "id": "gid://shopify/Collection/987654321",
      "legacyResourceId": 987654321,
      "title": "Best Sellers",
      "handle": "best-sellers",
      "description": "Our most popular products",
      "descriptionHtml": "<p>Our most popular products</p>",
      "updatedAt": "2026-01-20T14:30:00Z",
      "image": {
        "id": 98766,
        "url": "https://cdn.shopify.com/...",
        "altText": "Best Sellers",
        "width": 1200,
        "height": 600
      },
      "type": "smart"
    }
  ]
}
```

---

### 2. Get Collection with Products

**Endpoint:** `GET /collections/:collectionHandle`

**Description:**
Fetches complete details of a specific collection including all products with full details. Works with both collection handles and GIDs. **Uses Admin API** to fetch all products including bundles and unpublished items.

**Headers:**
```
Authorization: Bearer your-jwt-token
```

**URL Parameters:**
- `collectionHandle` (required) - Collection handle (e.g., `summer-collection`) or GID

**Query Parameters:**
- `limit` (optional) - Number of products to fetch (default: 50)

**Examples:**
```
GET /collections/summer-collection
GET /collections/bundles
GET /collections/bundles?limit=20
GET /collections/gid://shopify/Collection/123456789
```

**Response (200):**
```json
{
  "success": true,
  "collection": {
    "id": "gid://shopify/Collection/123456789",
    "legacyResourceId": 123456789,
    "title": "Bundles",
    "handle": "bundles",
    "description": "Bundle products with savings",
    "descriptionHtml": "<p>Bundle products with savings</p>",
    "updatedAt": "2026-01-25T10:00:00Z",
    "image": {
      "id": 98765,
      "url": "https://cdn.shopify.com/...",
      "altText": "Bundles Collection",
      "width": 1200,
      "height": 600
    },
    "type": "custom",
    "seo": {
      "title": "Product Bundles - Save More",
      "description": "Shop our curated product bundles..."
    }
  },
  "totalProducts": 3,
  "data": [
    {
      "id": "gid://shopify/Product/8179475546182",
      "legacyResourceId": 8179475546182,
      "title": "The First Week Healing System",
      "handle": "the-first-week-healing-system",
      "description": "Complete healing bundle for new moms",
      "descriptionHtml": "<p>Complete healing bundle for new moms</p>",
      "productType": "Bundle",
      "vendor": "Mommy First Dev",
      "tags": ["bundle", "healing", "postpartum"],
      "createdAt": "2026-01-30T08:44:15Z",
      "updatedAt": "2026-01-30T09:28:31Z",
      "publishedAt": "2026-01-30T08:45:19Z",
      "status": "active",
      "availableForSale": true,
      "stockStatus": "in_stock",
      "totalInventory": 10,
      "priceRange": {
        "minVariantPrice": {
          "amount": "89.00",
          "currencyCode": "USD"
        },
        "maxVariantPrice": {
          "amount": "89.00",
          "currencyCode": "USD"
        }
      },
      "compareAtPriceRange": {
        "minVariantPrice": {
          "amount": "89.00",
          "currencyCode": "USD"
        },
        "maxVariantPrice": {
          "amount": "89.00",
          "currencyCode": "USD"
        }
      },
      "images": [
        {
          "id": 37109097300038,
          "url": "https://cdn.shopify.com/s/files/1/0709/6231/5334/files/Witch_Hazel_Combo_v2_1.jpg",
          "altText": null,
          "width": 2160,
          "height": 2160
        }
      ],
      "variants": [
        {
          "id": "gid://shopify/ProductVariant/123",
          "legacyResourceId": 123,
          "title": "Default Title",
          "sku": "BUNDLE-001",
          "availableForSale": true,
          "stockStatus": "in_stock",
          "requiresShipping": true,
          "weight": 1.5,
          "weightUnit": "lb",
          "inventoryQuantity": 10,
          "inventoryPolicy": "deny",
          "price": {
            "amount": "89.00",
            "currencyCode": "USD"
          },
          "compareAtPrice": null,
          "selectedOptions": [
            {
              "name": "Title",
              "value": "Default Title"
            }
          ],
          "image": null
        }
      ],
      "options": [
        {
          "id": 10607426601030,
          "name": "Title",
          "values": ["Default Title"]
        }
      ],
      "bundleComponents": [
        {
          "id": "gid://shopify/Product/111111",
          "legacyResourceId": "111111",
          "title": "Witch Hazel Spray",
          "handle": "witch-hazel-spray",
          "description": "Soothing witch hazel spray",
          "productType": "Personal Care",
          "vendor": "Mommy First",
          "quantity": 2,
          "priceRange": {
            "minVariantPrice": {
              "amount": "19.99",
              "currencyCode": "USD"
            },
            "maxVariantPrice": {
              "amount": "19.99",
              "currencyCode": "USD"
            }
          },
          "images": [
            {
              "id": "img1",
              "url": "https://cdn.shopify.com/...",
              "altText": "Witch Hazel Spray",
              "width": 1200,
              "height": 1200
            }
          ],
          "variants": [
            {
              "id": "gid://shopify/ProductVariant/222",
              "title": "Default Title",
              "price": {
                "amount": "19.99",
                "currencyCode": "USD"
              },
              "availableForSale": true,
              "sku": "WH-SPRAY-001"
            }
          ]
        },
        {
          "id": "gid://shopify/Product/222222",
          "legacyResourceId": "222222",
          "title": "Healing Balm",
          "handle": "healing-balm",
          "description": "Organic healing balm",
          "productType": "Personal Care",
          "vendor": "Mommy First",
          "quantity": 1,
          "priceRange": {
            "minVariantPrice": {
              "amount": "24.99",
              "currencyCode": "USD"
            }
          },
          "images": [ /* ... */ ],
          "variants": [ /* ... */ ]
        }
      ],
      "metafields": null,
      "seo": {
        "title": "The First Week Healing System",
        "description": "Complete healing bundle for new moms"
      }
    }
  ]
}
```

**Response (404):**
```json
{
  "success": false,
  "message": "Collection not found"
}
```

---

## Response Data Structure

### Product Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | GraphQL ID (e.g., `gid://shopify/Product/123`) |
| `legacyResourceId` | Number | Numeric product ID (Admin API only) |
| `title` | String | Product title |
| `handle` | String | URL-friendly handle |
| `description` | String | Plain text description |
| `descriptionHtml` | String | HTML description |
| `productType` | String | Product category/type |
| `vendor` | String | Brand or vendor name |
| `tags` | Array | Array of tag strings |
| `createdAt` | String | ISO 8601 timestamp |
| `updatedAt` | String | ISO 8601 timestamp |
| `publishedAt` | String | ISO 8601 timestamp |
| `status` | String | Product status (Admin API only): `active`, `draft`, `archived` |
| `availableForSale` | Boolean | Whether product can be purchased |
| `stockStatus` | String | Stock status (Admin API only): `in_stock`, `orderable`, `out_of_stock` |
| `totalInventory` | Number | Total inventory across all variants (Admin API only) |
| `onlineStoreUrl` | String | Product URL (Storefront API only) |
| `priceRange` | Object | Min/max price range |
| `compareAtPriceRange` | Object | Min/max compare-at price |
| `images` | Array | Array of image objects |
| `variants` | Array | Array of variant objects |
| `options` | Array | Array of option objects |
| `bundleComponents` | Array\|null | Bundle component products (if applicable) |
| `metafields` | null | Reserved for future use |
| `seo` | Object | SEO title and description |

### Stock Status Values

- **`in_stock`** - Product has inventory available (quantity > 0)
- **`orderable`** - Out of stock BUT allows backorders (inventory_policy: `continue`)
- **`out_of_stock`** - No inventory and doesn't allow backorders

### Bundle Components

For bundle products, the `bundleComponents` array contains the sub-products included in the bundle:

```json
{
  "bundleComponents": [
    {
      "id": "gid://shopify/Product/111",
      "title": "Component Product",
      "handle": "component-product",
      "quantity": 2,
      "priceRange": { /* ... */ },
      "images": [ /* ... */ ],
      "variants": [ /* ... */ ]
    }
  ]
}
```

---

## Error Handling

### Common Error Responses

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

**401 Invalid Token:**
```json
{
  "success": false,
  "message": "Invalid or expired token."
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Product not found"
}
```

**500 Server Error:**
```json
{
  "success": false,
  "message": "Failed to fetch products",
  "error": "Error details..."
}
```

---

## Notes

### Storefront API vs Admin API

- **Products Endpoints** (`/products/*`) use **Storefront API**
  - Only shows published products available on the Online Store channel
  - Limited to products with proper publication status
  - Does not include draft or archived products

- **Collections Endpoints** (`/collections/*`) use **Admin API**
  - Shows ALL products including bundles, drafts, and unpublished items
  - Includes additional fields like `status`, `stockStatus`, `inventoryQuantity`
  - Required for accessing bundle products and their components
  - Includes `legacyResourceId` field

### Pagination

- Products list uses **offset pagination** with 24 items per page
- Collections use `limit` parameter (max 50 items)
- Use `hasNextPage` and `hasPreviousPage` to navigate

### Metafields

- Currently returns `null` for all products
- Shopify Storefront API requires specific metafield identifiers to fetch data
- Can be extended in future to include specific metafields

### Bundle Products

- Bundle products include a `bundleComponents` array
- Each component includes full product details and quantity
- Uses Shopify's native bundle structure via GraphQL
- Only available in collections endpoints (Admin API)

---

## Quick Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/products` | GET | Required | Get paginated products (24/page) |
| `/products/pg-{n}` | GET | Required | Get specific page of products |
| `/products/:handle` | GET | Required | Get single product details |
| `/collections` | GET | Required | Get all collections |
| `/collections/:handle` | GET | Required | Get collection with all products |

---

**Last Updated:** January 30, 2026
