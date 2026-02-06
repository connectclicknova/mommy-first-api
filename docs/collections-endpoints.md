# Collections API Documentation

Base URL: `/collections`

All endpoints require Bearer token authentication.

---

## 1. Get All Collections

Fetch list of all collections with metafields.

### Endpoint
```
GET /collections
```

### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Number of collections to fetch (max 250) |

### Example Request
```
GET /collections?limit=20
Authorization: Bearer <token>
```

### Response
```json
{
  "data": {
    "collections": {
      "edges": [
        {
          "node": {
            "id": "gid://shopify/Collection/123456789",
            "title": "All Products",
            "handle": "all-products",
            "description": "Collection description",
            "descriptionHtml": "<p>Collection description</p>",
            "updatedAt": "2026-01-15T10:30:00Z",
            "image": {
              "url": "https://cdn.shopify.com/...",
              "altText": "Collection image",
              "width": 1200,
              "height": 800
            },
            "metafields": [
              {
                "namespace": "custom",
                "key": "banner_image",
                "value": "https://cdn.shopify.com/...",
                "type": "single_line_text_field"
              }
            ]
          }
        }
      ]
    }
  }
}
```

---

## 2. Get Collection Products

Fetch products from a specific collection with pagination, filtering, and sorting.

### Endpoints
```
GET /collections/:collectionHandle
GET /collections/:collectionHandle/pg-:page
```

### URL Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `collectionHandle` | string | The collection handle (e.g., "all-products") |
| `page` | number | Page number (default: 1) |

### Query Parameters - Filters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `price_min` | number | Minimum price | `price_min=100` |
| `price_max` | number | Maximum price | `price_max=500` |
| `vendor` | string | Product vendor (comma-separated for multiple) | `vendor=Nike,Adidas` |
| `product_type` | string | Product type (comma-separated for multiple) | `product_type=Shirts,Pants` |
| `tag` | string | Product tags (comma-separated for multiple) | `tag=sale,new,featured` |
| `available` | boolean | Filter by availability | `available=true` |
| `color` | string | Color option (comma-separated for multiple) | `color=Red,Blue,Green` |
| `size` | string | Size option (comma-separated for multiple) | `size=S,M,L,XL` |
| `option` | string | Custom variant option in format "name:value" | `option=Material:Cotton` |

### Query Parameters - Sorting

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sort` | string | `FEATURED` | Sort order |

**Sort Options:**

| Value | Description |
|-------|-------------|
| `FEATURED` | Manual/Featured order (default) |
| `BEST_SELLING` | Best selling products first |
| `TITLE_ASC` | Alphabetically A-Z |
| `TITLE_DESC` | Alphabetically Z-A |
| `PRICE_ASC` | Price low to high |
| `PRICE_DESC` | Price high to low |
| `DATE_ASC` | Date old to new |
| `DATE_DESC` | Date new to old |

### Example Requests

**Basic - First page:**
```
GET /collections/all-products
Authorization: Bearer <token>
```

**Page 2:**
```
GET /collections/all-products/pg-2
Authorization: Bearer <token>
```

**With price filter:**
```
GET /collections/all-products?price_min=100&price_max=500
Authorization: Bearer <token>
```

**With availability filter:**
```
GET /collections/all-products?available=true
Authorization: Bearer <token>
```

**With sorting:**
```
GET /collections/all-products?sort=PRICE_ASC
Authorization: Bearer <token>
```

**Multiple filters + sorting + pagination:**
```
GET /collections/all-products/pg-2?price_min=50&price_max=200&vendor=Nike,Adidas&tag=sale&available=true&sort=PRICE_DESC
Authorization: Bearer <token>
```

**Color and size filters:**
```
GET /collections/all-products?color=Red,Blue&size=M,L
Authorization: Bearer <token>
```

**Custom option filter:**
```
GET /collections/all-products?option=Material:Cotton,Fit:Slim
Authorization: Bearer <token>
```

### Response
```json
{
  "data": {
    "collection": {
      "id": "gid://shopify/Collection/123456789",
      "title": "All Products",
      "handle": "all-products",
      "description": "Collection description",
      "descriptionHtml": "<p>Collection description</p>",
      "image": {
        "url": "https://cdn.shopify.com/...",
        "altText": "Collection image"
      },
      "metafields": [
        {
          "namespace": "custom",
          "key": "banner_image",
          "value": "https://cdn.shopify.com/...",
          "type": "single_line_text_field"
        }
      ],
      "filters": [
        {
          "id": "filter.v.availability",
          "label": "Availability",
          "type": "LIST",
          "values": [
            {
              "id": "filter.v.availability.1",
              "label": "In stock",
              "count": 45,
              "input": "{\"available\":true}"
            },
            {
              "id": "filter.v.availability.0",
              "label": "Out of stock",
              "count": 5,
              "input": "{\"available\":false}"
            }
          ]
        },
        {
          "id": "filter.v.price",
          "label": "Price",
          "type": "PRICE_RANGE",
          "values": [
            {
              "id": "filter.v.price",
              "label": "Price",
              "count": 50,
              "input": "{\"price\":{\"min\":0,\"max\":1000}}"
            }
          ]
        }
      ],
      "products": [
        {
          "cursor": "eyJsYXN0X...",
          "node": {
            "id": "gid://shopify/Product/123456789",
            "title": "Product Name",
            "handle": "product-name",
            "description": "Product description",
            "vendor": "Vendor Name",
            "productType": "Category",
            "tags": ["tag1", "tag2"],
            "availableForSale": true,
            "priceRange": {
              "minVariantPrice": {
                "amount": "99.00",
                "currencyCode": "USD"
              },
              "maxVariantPrice": {
                "amount": "149.00",
                "currencyCode": "USD"
              }
            },
            "compareAtPriceRange": {
              "minVariantPrice": {
                "amount": "129.00",
                "currencyCode": "USD"
              },
              "maxVariantPrice": {
                "amount": "179.00",
                "currencyCode": "USD"
              }
            },
            "images": {
              "nodes": [
                {
                  "url": "https://cdn.shopify.com/...",
                  "altText": "Product image"
                }
              ]
            },
            "variants": {
              "nodes": [
                {
                  "id": "gid://shopify/ProductVariant/123456789",
                  "title": "Small / Red",
                  "availableForSale": true,
                  "price": {
                    "amount": "99.00",
                    "currencyCode": "USD"
                  },
                  "compareAtPrice": {
                    "amount": "129.00",
                    "currencyCode": "USD"
                  },
                  "selectedOptions": [
                    {
                      "name": "Size",
                      "value": "Small"
                    },
                    {
                      "name": "Color",
                      "value": "Red"
                    }
                  ]
                }
              ]
            }
          }
        }
      ]
    }
  },
  "appliedFilters": {
    "price_min": "100",
    "price_max": "500",
    "vendor": "Nike,Adidas",
    "product_type": null,
    "tag": "sale",
    "available": "true",
    "color": null,
    "size": null,
    "option": null,
    "sort": "PRICE_DESC"
  },
  "pagination": {
    "currentPage": 2,
    "totalPages": 5,
    "productsPerPage": 24,
    "totalProducts": 100,
    "currentPageProducts": 24,
    "displayedSoFar": 48,
    "remainingProducts": 52,
    "hasNextPage": true,
    "hasPreviousPage": true,
    "startCursor": "eyJsYXN0X...",
    "endCursor": "eyJsYXN0X..."
  }
}
```

---

## Pagination Explained

| Field | Description |
|-------|-------------|
| `currentPage` | Current page number |
| `totalPages` | Total number of pages |
| `productsPerPage` | Products per page (24) |
| `totalProducts` | Total products matching filters |
| `currentPageProducts` | Products returned in this page |
| `displayedSoFar` | Total products displayed up to this page |
| `remainingProducts` | Products remaining after this page |
| `hasNextPage` | Whether there's a next page |
| `hasPreviousPage` | Whether there's a previous page |
| `startCursor` | Cursor for the first item |
| `endCursor` | Cursor for the last item |

---

## Error Responses

### Collection Not Found
```json
{
  "success": false,
  "message": "Collection not found"
}
```
**Status Code:** 404

### Server Error
```json
{
  "success": false,
  "message": "Failed to fetch collection",
  "error": "Error message details"
}
```
**Status Code:** 500

---

## Filter Combination Examples

### E-commerce Use Cases

**Sale items under $50:**
```
/collections/all-products?tag=sale&price_max=50&sort=PRICE_ASC
```

**In-stock Nike products sorted by newest:**
```
/collections/all-products?vendor=Nike&available=true&sort=DATE_DESC
```

**Medium size red items:**
```
/collections/all-products?size=M&color=Red
```

**Best selling maternity products:**
```
/collections/maternity?sort=BEST_SELLING&available=true
```

**Price range with multiple vendors (page 3):**
```
/collections/all-products/pg-3?price_min=100&price_max=300&vendor=Nike,Adidas,Puma&sort=PRICE_DESC
```
