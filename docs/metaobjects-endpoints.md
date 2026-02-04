# Metaobjects API Documentation

This document describes the metaobjects endpoints that allow you to retrieve metaobject definitions and their content.

---

## Table of Contents
- [Get All Metaobject Definitions](#get-all-metaobject-definitions)
- [Get Metaobjects by Type](#get-metaobjects-by-type)
- [Get Individual Metaobject](#get-individual-metaobject)
- [Response Examples](#response-examples)

---

## Get All Metaobject Definitions

Get a list of all metaobject definitions (types) configured in your store.

### Endpoint
```
GET /metaobjects
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
  "count": 3,
  "data": [
    {
      "id": "gid://shopify/MetaobjectDefinition/123456",
      "name": "Testimonials",
      "type": "testimonials",
      "description": "Customer testimonials and reviews",
      "fieldDefinitions": [
        {
          "key": "customer_name",
          "name": "Customer Name",
          "type": {
            "name": "single_line_text_field"
          },
          "required": true,
          "description": "Name of the customer"
        },
        {
          "key": "rating",
          "name": "Rating",
          "type": {
            "name": "number_integer"
          },
          "required": true,
          "description": "Rating out of 5"
        },
        {
          "key": "review_text",
          "name": "Review Text",
          "type": {
            "name": "multi_line_text_field"
          },
          "required": true,
          "description": "Customer review content"
        },
        {
          "key": "product",
          "name": "Product",
          "type": {
            "name": "product_reference"
          },
          "required": false,
          "description": "Related product"
        },
        {
          "key": "customer_image",
          "name": "Customer Image",
          "type": {
            "name": "file_reference"
          },
          "required": false,
          "description": "Customer profile photo"
        }
      ]
    },
    {
      "id": "gid://shopify/MetaobjectDefinition/234567",
      "name": "FAQs",
      "type": "faqs",
      "description": "Frequently asked questions",
      "fieldDefinitions": [
        {
          "key": "question",
          "name": "Question",
          "type": {
            "name": "single_line_text_field"
          },
          "required": true,
          "description": null
        },
        {
          "key": "answer",
          "name": "Answer",
          "type": {
            "name": "rich_text_field"
          },
          "required": true,
          "description": null
        },
        {
          "key": "category",
          "name": "Category",
          "type": {
            "name": "single_line_text_field"
          },
          "required": false,
          "description": null
        }
      ]
    }
  ]
}
```

---

## Get Metaobjects by Type

Get all metaobjects of a specific type.

### Endpoint
```
GET /metaobjects/:type
```

### Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | Yes | The metaobject type (e.g., "testimonials", "faqs") |
| `limit` | number | No | Number of items to return (default: 50, max: 250) |

### Example Request
```
GET /metaobjects/testimonials?limit=10
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
  "type": "testimonials",
  "count": 5,
  "pageInfo": {
    "hasNextPage": false,
    "hasPreviousPage": false
  },
  "data": [
    {
      "id": "gid://shopify/Metaobject/345678",
      "handle": "customer-review-1",
      "type": "testimonials",
      "updatedAt": "2026-02-01T10:30:00Z",
      "fields": {
        "customer_name": {
          "type": "single_line_text_field",
          "value": "Sarah Johnson"
        },
        "rating": {
          "type": "number_integer",
          "value": "5"
        },
        "review_text": {
          "type": "multi_line_text_field",
          "value": "Absolutely love this product! Perfect for expecting moms."
        },
        "product": {
          "type": "product_reference",
          "value": "gid://shopify/Product/8234567890",
          "reference": {
            "id": "gid://shopify/Product/8234567890",
            "title": "Maternity Dress",
            "handle": "maternity-dress",
            "featuredImage": {
              "url": "https://cdn.shopify.com/s/files/1/.../dress.jpg",
              "altText": "Maternity dress"
            }
          }
        },
        "customer_image": {
          "type": "file_reference",
          "value": "gid://shopify/MediaImage/456789",
          "reference": {
            "id": "gid://shopify/MediaImage/456789",
            "image": {
              "url": "https://cdn.shopify.com/s/files/1/.../customer.jpg",
              "altText": "Customer photo",
              "width": 400,
              "height": 400
            }
          }
        }
      }
    },
    {
      "id": "gid://shopify/Metaobject/345679",
      "handle": "customer-review-2",
      "type": "testimonials",
      "updatedAt": "2026-02-02T14:20:00Z",
      "fields": {
        "customer_name": {
          "type": "single_line_text_field",
          "value": "Emily Chen"
        },
        "rating": {
          "type": "number_integer",
          "value": "4"
        },
        "review_text": {
          "type": "multi_line_text_field",
          "value": "Great quality and comfortable. Highly recommend!"
        },
        "product": {
          "type": "product_reference",
          "value": "gid://shopify/Product/8234567891",
          "reference": {
            "id": "gid://shopify/Product/8234567891",
            "title": "Nursing Pillow",
            "handle": "nursing-pillow"
          }
        }
      }
    }
  ]
}
```

---

## Get Individual Metaobject

Get a specific metaobject by type and handle.

### Endpoint
```
GET /metaobjects/:type/:handle
```

### Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | Yes | The metaobject type |
| `handle` | string | Yes | The metaobject handle |

### Example Request
```
GET /metaobjects/testimonials/customer-review-1
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
  "data": {
    "id": "gid://shopify/Metaobject/345678",
    "handle": "customer-review-1",
    "type": "testimonials",
    "displayName": "Sarah Johnson - Review",
    "updatedAt": "2026-02-01T10:30:00Z",
    "fields": {
      "customer_name": {
        "type": "single_line_text_field",
        "value": "Sarah Johnson"
      },
      "rating": {
        "type": "number_integer",
        "value": "5"
      },
      "review_text": {
        "type": "multi_line_text_field",
        "value": "Absolutely love this product! Perfect for expecting moms. The quality is outstanding and it fits perfectly throughout my pregnancy."
      },
      "review_date": {
        "type": "date",
        "value": "2026-01-15"
      },
      "verified_purchase": {
        "type": "boolean",
        "value": "true"
      },
      "product": {
        "type": "product_reference",
        "value": "gid://shopify/Product/8234567890",
        "reference": {
          "id": "gid://shopify/Product/8234567890",
          "title": "Maternity Dress",
          "handle": "maternity-dress",
          "description": "Comfortable maternity dress",
          "featuredImage": {
            "url": "https://cdn.shopify.com/s/files/1/.../dress.jpg",
            "altText": "Maternity dress front view",
            "width": 1200,
            "height": 1600
          },
          "priceRange": {
            "minVariantPrice": {
              "amount": "49.99",
              "currencyCode": "USD"
            },
            "maxVariantPrice": {
              "amount": "89.99",
              "currencyCode": "USD"
            }
          }
        }
      },
      "customer_image": {
        "type": "file_reference",
        "value": "gid://shopify/MediaImage/456789",
        "reference": {
          "id": "gid://shopify/MediaImage/456789",
          "image": {
            "url": "https://cdn.shopify.com/s/files/1/.../customer.jpg",
            "altText": "Customer photo",
            "width": 400,
            "height": 400
          }
        }
      },
      "related_products": {
        "type": "list.product_reference",
        "value": "[\"gid://shopify/Product/8234567890\",\"gid://shopify/Product/8234567891\"]",
        "references": [
          {
            "id": "gid://shopify/Product/8234567890",
            "title": "Maternity Dress",
            "handle": "maternity-dress",
            "description": "Comfortable maternity dress",
            "featuredImage": {
              "url": "https://cdn.shopify.com/s/files/1/.../dress.jpg",
              "altText": "Maternity dress"
            },
            "priceRange": {
              "minVariantPrice": {
                "amount": "49.99",
                "currencyCode": "USD"
              }
            }
          },
          {
            "id": "gid://shopify/Product/8234567891",
            "title": "Nursing Pillow",
            "handle": "nursing-pillow",
            "description": "Supportive nursing pillow",
            "featuredImage": {
              "url": "https://cdn.shopify.com/s/files/1/.../pillow.jpg",
              "altText": "Nursing pillow"
            },
            "priceRange": {
              "minVariantPrice": {
                "amount": "35.99",
                "currencyCode": "USD"
              }
            }
          }
        ]
      }
    }
  }
}
```

---

## Response Examples

### Example: FAQ Metaobject
```json
GET /metaobjects/faqs/shipping-info

{
  "success": true,
  "data": {
    "id": "gid://shopify/Metaobject/567890",
    "handle": "shipping-info",
    "type": "faqs",
    "displayName": "Shipping Information",
    "updatedAt": "2026-01-28T09:15:00Z",
    "fields": {
      "question": {
        "type": "single_line_text_field",
        "value": "What are your shipping options?"
      },
      "answer": {
        "type": "rich_text_field",
        "value": "<p>We offer <strong>free standard shipping</strong> on all orders over $50. Express shipping is available for $9.99.</p><ul><li>Standard: 5-7 business days</li><li>Express: 2-3 business days</li></ul>"
      },
      "category": {
        "type": "single_line_text_field",
        "value": "Shipping"
      },
      "order": {
        "type": "number_integer",
        "value": "1"
      }
    }
  }
}
```

### Example: Banner Metaobject with Media
```json
GET /metaobjects/banners/homepage-hero

{
  "success": true,
  "data": {
    "id": "gid://shopify/Metaobject/678901",
    "handle": "homepage-hero",
    "type": "banners",
    "displayName": "Homepage Hero Banner",
    "updatedAt": "2026-02-03T16:45:00Z",
    "fields": {
      "title": {
        "type": "single_line_text_field",
        "value": "Spring Collection 2026"
      },
      "subtitle": {
        "type": "single_line_text_field",
        "value": "Comfortable & Stylish Maternity Wear"
      },
      "button_text": {
        "type": "single_line_text_field",
        "value": "Shop Now"
      },
      "button_link": {
        "type": "url",
        "value": "/collections/spring-2026"
      },
      "background_image": {
        "type": "file_reference",
        "value": "gid://shopify/MediaImage/789012",
        "reference": {
          "id": "gid://shopify/MediaImage/789012",
          "image": {
            "url": "https://cdn.shopify.com/s/files/1/.../hero-bg.jpg",
            "altText": "Spring collection banner",
            "width": 1920,
            "height": 1080
          }
        }
      },
      "featured_collection": {
        "type": "collection_reference",
        "value": "gid://shopify/Collection/123456789",
        "reference": {
          "id": "gid://shopify/Collection/123456789",
          "title": "Spring 2026",
          "handle": "spring-2026",
          "description": "Fresh styles for the new season",
          "image": {
            "url": "https://cdn.shopify.com/s/files/1/.../collection.jpg",
            "altText": "Spring collection"
          }
        }
      }
    }
  }
}
```

---

## Field Types

Metaobject fields support various types:

### Text Fields
- `single_line_text_field` - Short text
- `multi_line_text_field` - Long text
- `rich_text_field` - HTML formatted text

### Number Fields
- `number_integer` - Whole numbers
- `number_decimal` - Decimal numbers

### Date & Time
- `date` - Date in YYYY-MM-DD format
- `date_time` - Date and time

### Boolean
- `boolean` - true/false values

### References
- `product_reference` - Single product
- `collection_reference` - Single collection
- `page_reference` - Single page
- `file_reference` - Single media file (image, video)
- `metaobject_reference` - Reference to another metaobject

### List References
- `list.product_reference` - Multiple products
- `list.collection_reference` - Multiple collections
- `list.file_reference` - Multiple media files
- `list.metaobject_reference` - Multiple metaobjects

### Other
- `url` - URL field
- `color` - Color value
- `json` - JSON data

---

## Error Responses

### Metaobject Not Found
```json
{
  "success": false,
  "message": "Metaobject 'customer-review-1' of type 'testimonials' not found"
}
```

### Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

### Server Error
```json
{
  "success": false,
  "message": "Failed to fetch metaobjects of type testimonials",
  "error": "GraphQL error message"
}
```

---

## Use Cases

### 1. Display Customer Testimonials
```javascript
// Get all testimonials
GET /metaobjects/testimonials

// Display on homepage
testimonials.data.forEach(review => {
  console.log(review.fields.customer_name.value);
  console.log(review.fields.rating.value + " stars");
  console.log(review.fields.review_text.value);
  console.log(review.fields.customer_image.reference.image.url);
});
```

### 2. Build FAQ Section
```javascript
// Get all FAQs
GET /metaobjects/faqs

// Group by category
const faqsByCategory = {};
faqs.data.forEach(faq => {
  const category = faq.fields.category.value;
  if (!faqsByCategory[category]) {
    faqsByCategory[category] = [];
  }
  faqsByCategory[category].push({
    question: faq.fields.question.value,
    answer: faq.fields.answer.value
  });
});
```

### 3. Dynamic Banner System
```javascript
// Get specific banner
GET /metaobjects/banners/homepage-hero

// Render banner
const banner = response.data;
<div style="background-image: url(${banner.fields.background_image.reference.image.url})">
  <h1>{banner.fields.title.value}</h1>
  <h2>{banner.fields.subtitle.value}</h2>
  <a href="{banner.fields.button_link.value}">
    {banner.fields.button_text.value}
  </a>
</div>
```

---

## Notes

- All endpoints require Bearer token authentication
- Metaobjects must be published to the Storefront API to be accessible
- References (products, collections, etc.) include relevant data automatically
- Field values are returned as strings - parse numbers/booleans as needed
- Maximum 250 metaobjects can be fetched per request
- Use the `type` from metaobject definitions to query specific metaobjects
- Handles are unique within each type
