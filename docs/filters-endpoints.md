# Product Filters API Documentation

This document describes the product filtering endpoints that allow you to get available filters and apply them to products.

---

## Table of Contents
- [Get All Product Filters](#get-all-product-filters)
- [Filter All Products](#filter-all-products)
- [Get Collection Filters](#get-collection-filters)
- [Filter Collection Products](#filter-collection-products)
- [Filter Examples](#filter-examples)

---

## Get All Product Filters

Get available filter options for all products in the store.

### Endpoint
```
GET /products/filters
```

### Headers
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

### Response
```json
{
  "success": true,
  "totalProducts": 45,
  "filters": {
    "availability": {
      "type": "LIST",
      "label": "Availability",
      "values": [
        {
          "label": "In Stock",
          "value": true,
          "count": 38,
          "input": {
            "available": true
          }
        },
        {
          "label": "Out of Stock",
          "value": false,
          "count": 7,
          "input": {
            "available": false
          }
        }
      ]
    },
    "price": {
      "type": "PRICE_RANGE",
      "label": "Price",
      "min": 15.99,
      "max": 299.99,
      "currencyCode": "USD"
    },
    "productType": {
      "type": "LIST",
      "label": "Product Type",
      "values": [
        {
          "label": "Maternity Wear",
          "value": "Maternity Wear",
          "count": 20,
          "input": {
            "productType": "Maternity Wear"
          }
        },
        {
          "label": "Nursing",
          "value": "Nursing",
          "count": 15,
          "input": {
            "productType": "Nursing"
          }
        },
        {
          "label": "Baby Care",
          "value": "Baby Care",
          "count": 10,
          "input": {
            "productType": "Baby Care"
          }
        }
      ]
    },
    "vendor": {
      "type": "LIST",
      "label": "Vendor",
      "values": [
        {
          "label": "Mommy First",
          "value": "Mommy First",
          "count": 30,
          "input": {
            "vendor": "Mommy First"
          }
        },
        {
          "label": "Baby Essentials",
          "value": "Baby Essentials",
          "count": 15,
          "input": {
            "vendor": "Baby Essentials"
          }
        }
      ]
    },
    "tags": {
      "type": "LIST",
      "label": "Tags",
      "values": [
        {
          "label": "organic",
          "value": "organic",
          "count": 25,
          "input": {
            "tags": ["organic"]
          }
        },
        {
          "label": "sale",
          "value": "sale",
          "count": 12,
          "input": {
            "tags": ["sale"]
          }
        },
        {
          "label": "new-arrival",
          "value": "new-arrival",
          "count": 8,
          "input": {
            "tags": ["new-arrival"]
          }
        }
      ]
    },
    "variantOptions": [
      {
        "type": "LIST",
        "label": "Size",
        "name": "Size",
        "values": [
          {
            "label": "S",
            "value": "S",
            "count": 18,
            "input": {
              "variantOption": {
                "name": "Size",
                "value": "S"
              }
            }
          },
          {
            "label": "M",
            "value": "M",
            "count": 22,
            "input": {
              "variantOption": {
                "name": "Size",
                "value": "M"
              }
            }
          },
          {
            "label": "L",
            "value": "L",
            "count": 20,
            "input": {
              "variantOption": {
                "name": "Size",
                "value": "L"
              }
            }
          }
        ]
      },
      {
        "type": "LIST",
        "label": "Color",
        "name": "Color",
        "values": [
          {
            "label": "Black",
            "value": "Black",
            "count": 15,
            "input": {
              "variantOption": {
                "name": "Color",
                "value": "Black"
              }
            }
          },
          {
            "label": "White",
            "value": "White",
            "count": 12,
            "input": {
              "variantOption": {
                "name": "Color",
                "value": "White"
              }
            }
          }
        ]
      }
    ]
  }
}
```

---

## Filter All Products

Apply filters to get a filtered list of products.

### Endpoint
```
POST /products/filter
```

### Headers
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

### Request Body
```json
{
  "filters": {
    "available": true,
    "minPrice": 25.0,
    "maxPrice": 100.0,
    "productType": "Maternity Wear",
    "vendor": "Mommy First",
    "tags": ["organic", "sale"],
    "variantOption": {
      "name": "Size",
      "value": "M"
    }
  },
  "page": 1,
  "limit": 24,
  "sortBy": "price"
}
```

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filters` | object | No | Filter criteria (see below) |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 24) |
| `sortBy` | string | No | Sort option: `price`, `title`, `created`, `updated`, `best_selling` |

### Filter Options

| Filter | Type | Description | Example |
|--------|------|-------------|---------|
| `available` | boolean | Filter by stock availability | `true` or `false` |
| `minPrice` | number | Minimum price | `25.0` |
| `maxPrice` | number | Maximum price | `100.0` |
| `productType` | string or array | Product type(s) | `"Maternity Wear"` or `["Maternity Wear", "Nursing"]` |
| `vendor` | string or array | Vendor name(s) | `"Mommy First"` or `["Mommy First", "Baby Essentials"]` |
| `tags` or `tag` | string or array | Product tags | `["organic", "sale"]` or `"organic"` |
| `variantOption` | object or array | Variant option filter | `{ "name": "Size", "value": "M" }` |

### Response
```json
{
  "success": true,
  "filters": {
    "applied": {
      "available": true,
      "minPrice": 25,
      "maxPrice": 100,
      "productType": "Maternity Wear",
      "vendor": "Mommy First",
      "tags": ["organic", "sale"],
      "variantOption": {
        "name": "Size",
        "value": "M"
      }
    }
  },
  "pageInfo": {
    "currentPage": 1,
    "totalPages": 2,
    "productsPerPage": 24,
    "totalProducts": 35,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "data": [
    {
      "id": "gid://shopify/Product/8234567890",
      "legacyResourceId": 8234567890,
      "title": "Organic Maternity Dress",
      "handle": "organic-maternity-dress",
      "description": "Comfortable organic cotton maternity dress",
      "descriptionHtml": "<p>Comfortable organic cotton maternity dress</p>",
      "productType": "Maternity Wear",
      "vendor": "Mommy First",
      "tags": ["organic", "sale", "maternity"],
      "availableForSale": true,
      "totalInventory": 45,
      "priceRange": {
        "minVariantPrice": {
          "amount": "49.99",
          "currencyCode": "USD"
        },
        "maxVariantPrice": {
          "amount": "89.99",
          "currencyCode": "USD"
        }
      },
      "compareAtPriceRange": {
        "minVariantPrice": {
          "amount": "59.99",
          "currencyCode": "USD"
        },
        "maxVariantPrice": {
          "amount": "99.99",
          "currencyCode": "USD"
        }
      },
      "images": [
        {
          "id": 12345678,
          "url": "https://cdn.shopify.com/s/files/1/.../dress-front.jpg",
          "altText": "Front view of organic maternity dress",
          "width": 1200,
          "height": 1600
        }
      ],
      "variants": [
        {
          "id": "gid://shopify/ProductVariant/45678901",
          "legacyResourceId": 45678901,
          "title": "M / Black",
          "sku": "OMD-M-BLK",
          "availableForSale": true,
          "price": {
            "amount": "49.99",
            "currencyCode": "USD"
          },
          "compareAtPrice": {
            "amount": "59.99",
            "currencyCode": "USD"
          },
          "selectedOptions": [
            {
              "name": "Size",
              "value": "M"
            },
            {
              "name": "Color",
              "value": "Black"
            }
          ]
        }
      ],
      "metafields": [
        {
          "id": 123456,
          "namespace": "custom",
          "key": "fabric",
          "value": "100% Organic Cotton",
          "type": "single_line_text_field"
        }
      ]
    }
  ]
}
```

---

## Get Collection Filters

Get available filter options for products in a specific collection.

### Endpoint
```
GET /collections/:collectionHandle/filters
```

### Example
```
GET /collections/maternity/filters
```

### Headers
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

### Response
```json
{
  "success": true,
  "collection": {
    "handle": "maternity",
    "title": "Maternity Collection"
  },
  "filters": [
    {
      "id": "filter.v.availability",
      "label": "Availability",
      "type": "LIST",
      "values": [
        {
          "id": "filter.v.availability.1",
          "label": "In Stock",
          "count": 15,
          "input": "{\"available\":true}"
        }
      ]
    },
    {
      "id": "filter.v.price",
      "label": "Price",
      "type": "PRICE_RANGE",
      "values": [
        {
          "id": "filter.v.price.0",
          "label": "$0 - $50",
          "count": 8,
          "input": "{\"price\":{\"min\":0,\"max\":50}}"
        }
      ]
    }
  ]
}
```

---

## Filter Collection Products

Apply filters to products in a specific collection.

### Endpoint
```
POST /collections/:collectionHandle/filter
```

### Example
```
POST /collections/maternity/filter
```

### Headers
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

### Request Body
```json
{
  "filters": {
    "available": true,
    "minPrice": 25,
    "maxPrice": 100,
    "productType": "Maternity Wear"
  },
  "page": 1,
  "limit": 24,
  "sortBy": "price"
}
```

### Response
```json
{
  "success": true,
  "collection": {
    "id": "gid://shopify/Collection/123456789",
    "legacyResourceId": 123456789,
    "handle": "maternity",
    "title": "Maternity Collection",
    "type": "custom"
  },
  "filters": {
    "applied": {
      "available": true,
      "minPrice": 25,
      "maxPrice": 100,
      "productType": "Maternity Wear"
    }
  },
  "pageInfo": {
    "currentPage": 1,
    "totalPages": 1,
    "productsPerPage": 24,
    "totalProducts": 12,
    "hasNextPage": false,
    "hasPreviousPage": false
  },
  "data": [
    {
      "id": "gid://shopify/Product/8234567890",
      "title": "Maternity Dress",
      "handle": "maternity-dress",
      "productType": "Maternity Wear",
      "vendor": "Mommy First",
      "availableForSale": true,
      "priceRange": {
        "minVariantPrice": {
          "amount": "49.99",
          "currencyCode": "USD"
        },
        "maxVariantPrice": {
          "amount": "89.99",
          "currencyCode": "USD"
        }
      },
      "images": [],
      "variants": [],
      "metafields": []
    }
  ]
}
```

---

## Filter Examples

### Example 1: Filter by Availability Only
```json
POST /products/filter

{
  "filters": {
    "available": true
  },
  "page": 1,
  "limit": 24
}
```

### Example 2: Filter by Price Range
```json
POST /products/filter

{
  "filters": {
    "minPrice": 20,
    "maxPrice": 50
  },
  "page": 1,
  "limit": 24,
  "sortBy": "price"
}
```

### Example 3: Filter by Multiple Product Types (OR logic)
```json
POST /products/filter

{
  "filters": {
    "productType": ["Maternity Wear", "Nursing", "Baby Care"]
  },
  "page": 1,
  "limit": 24
}
```

### Example 4: Filter by Multiple Tags
```json
POST /products/filter

{
  "filters": {
    "tags": ["organic", "sale", "new-arrival"]
  },
  "page": 1,
  "limit": 24
}
```

### Example 5: Filter by Size Variant Option
```json
POST /products/filter

{
  "filters": {
    "variantOption": {
      "name": "Size",
      "value": "M"
    }
  },
  "page": 1,
  "limit": 24
}
```

### Example 6: Multiple Variant Options
```json
POST /products/filter

{
  "filters": {
    "variantOption": [
      {
        "name": "Size",
        "value": "M"
      },
      {
        "name": "Color",
        "value": "Black"
      }
    ]
  },
  "page": 1,
  "limit": 24
}
```

### Example 7: Combine Multiple Filters (AND logic between different types)
```json
POST /products/filter

{
  "filters": {
    "available": true,
    "minPrice": 25,
    "maxPrice": 100,
    "productType": "Maternity Wear",
    "vendor": "Mommy First",
    "tags": ["organic"],
    "variantOption": {
      "name": "Size",
      "value": "M"
    }
  },
  "page": 1,
  "limit": 24,
  "sortBy": "price"
}
```
**Result:** Products that are:
- In stock AND
- Price between $25-$100 AND
- Product type is "Maternity Wear" AND
- Vendor is "Mommy First" AND
- Tagged with "organic" AND
- Have size "M" available

### Example 8: Sort Options
```json
// Sort by price (low to high)
{
  "filters": {},
  "sortBy": "price"
}

// Sort by title (A-Z)
{
  "filters": {},
  "sortBy": "title"
}

// Sort by newest first
{
  "filters": {},
  "sortBy": "created"
}

// Sort by recently updated
{
  "filters": {},
  "sortBy": "updated"
}

// Sort by best selling (default)
{
  "filters": {},
  "sortBy": "best_selling"
}
```

---

## Filter Logic

### AND Logic (Different Filter Types)
Different filter types are combined with AND logic:
- `productType: "Maternity" AND vendor: "Mommy First"` = Products that are BOTH Maternity type AND from Mommy First

### OR Logic (Same Filter Type with Multiple Values)
Multiple values of the same filter type use OR logic:
- `productType: ["Maternity", "Nursing"]` = Products that are EITHER Maternity OR Nursing
- `tags: ["organic", "sale"]` = Products tagged with organic OR sale

### Price Range Logic
- Product matches if ANY variant price falls within the range
- `minPrice: 25, maxPrice: 100` = Products with at least one variant priced between $25-$100

---

## Error Responses

### Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

### Collection Not Found
```json
{
  "success": false,
  "message": "Collection 'maternity' not found"
}
```

### Invalid Filter
```json
{
  "success": false,
  "message": "Failed to filter products",
  "error": "Invalid filter parameter"
}
```

---

## Workflow

### Typical Implementation Flow:

1. **Get Available Filters**
   ```
   GET /products/filters
   ```
   Use this to build your filter UI (checkboxes, price sliders, etc.)

2. **User Selects Filters**
   User interacts with the UI and selects desired filters

3. **Apply Filters**
   ```
   POST /products/filter
   ```
   Send selected filters to get filtered results

4. **Display Results**
   Show filtered products with pagination

5. **Update Filters** (Optional)
   After filtering, you can call GET filters again to show updated counts based on current selection

---

## Notes

- All endpoints require Bearer token authentication
- Filters are case-insensitive for matching
- Empty filters object returns all products
- Maximum 250 products can be fetched at once (Shopify limitation)
- Price is in USD by default
- Pagination starts at page 1
- Default limit is 24 products per page
