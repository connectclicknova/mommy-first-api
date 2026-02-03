# Orders Endpoints

This document describes the API endpoints for managing and retrieving customer orders with full details including metafields.

## Authentication

All orders endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Get Customer Orders

Retrieve all orders for a specific customer with metafields.

**Endpoint:** `GET /orders/customer/:customerId`

**Parameters:**
- `customerId` (path parameter, required): The Shopify customer ID

**Query Parameters:**
- `limit` (optional): Maximum number of orders to return (default: 50, max: 250)
- `status` (optional): Filter by order status. Options: `open`, `closed`, `cancelled`, `any` (default: `any`)

**Request Example:**
```http
GET /orders/customer/6987654321?limit=10&status=any
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 5123456789,
      "order_number": 1001,
      "name": "#1001",
      "email": "customer@example.com",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:35:00Z",
      "currency": "USD",
      "total_price": "149.99",
      "subtotal_price": "129.99",
      "financial_status": "paid",
      "fulfillment_status": "fulfilled",
      "items_count": 2,
      "customer": {
        "id": 6987654321,
        "first_name": "Jane",
        "last_name": "Doe"
      },
      "metafields": [
        {
          "id": 123456789,
          "namespace": "custom",
          "key": "delivery_instructions",
          "value": "Leave at front door",
          "type": "single_line_text_field"
        }
      ]
    }
  ]
}
```

**Error Responses:**

- **400 Bad Request:** Invalid customer ID
```json
{
  "success": false,
  "message": "Invalid customer ID provided"
}
```

- **404 Not Found:** Customer not found
```json
{
  "success": false,
  "message": "Customer not found"
}
```

- **401 Unauthorized:** Missing or invalid token
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

---

### 2. Get Order Details

Retrieve detailed information for a specific order including all metafields (order metafields and line item metafields).

**Endpoint:** `GET /orders/:orderId`

**Parameters:**
- `orderId` (path parameter, required): The Shopify order ID

**Request Example:**
```http
GET /orders/5123456789
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 5123456789,
    "order_number": 1001,
    "name": "#1001",
    "email": "customer@example.com",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:35:00Z",
    "cancelled_at": null,
    "closed_at": null,
    "processed_at": "2024-01-15T10:30:00Z",
    "currency": "USD",
    "total_price": "149.99",
    "subtotal_price": "129.99",
    "total_tax": "10.00",
    "total_discounts": "0.00",
    "total_shipping": "10.00",
    "financial_status": "paid",
    "fulfillment_status": "fulfilled",
    "tags": "priority, gift",
    "note": "Gift wrapping requested",
    "customer": {
      "id": 6987654321,
      "email": "customer@example.com",
      "first_name": "Jane",
      "last_name": "Doe",
      "phone": "+1234567890"
    },
    "billing_address": {
      "first_name": "Jane",
      "last_name": "Doe",
      "address1": "123 Main St",
      "address2": "Apt 4B",
      "city": "New York",
      "province": "NY",
      "country": "United States",
      "zip": "10001",
      "phone": "+1234567890"
    },
    "shipping_address": {
      "first_name": "Jane",
      "last_name": "Doe",
      "address1": "123 Main St",
      "address2": "Apt 4B",
      "city": "New York",
      "province": "NY",
      "country": "United States",
      "zip": "10001",
      "phone": "+1234567890"
    },
    "line_items": [
      {
        "id": 9876543210,
        "variant_id": 4567890123,
        "product_id": 7890123456,
        "title": "Maternity Dress",
        "variant_title": "Medium / Blue",
        "quantity": 1,
        "price": "79.99",
        "sku": "MAT-DRESS-001",
        "grams": 500,
        "vendor": "Mommy First",
        "fulfillment_status": "fulfilled",
        "requires_shipping": true,
        "taxable": true,
        "gift_card": false,
        "name": "Maternity Dress - Medium / Blue",
        "properties": [
          {
            "name": "Personalization",
            "value": "Jane"
          }
        ],
        "metafields": [
          {
            "id": 111222333,
            "namespace": "custom",
            "key": "care_instructions",
            "value": "Machine wash cold",
            "type": "single_line_text_field"
          }
        ],
        "product_details": {
          "id": 7890123456,
          "title": "Maternity Dress",
          "handle": "maternity-dress",
          "body_html": "<p>Comfortable and stylish maternity dress perfect for any occasion.</p>",
          "vendor": "Mommy First",
          "product_type": "Dresses",
          "created_at": "2023-06-01T10:00:00Z",
          "updated_at": "2024-01-10T14:30:00Z",
          "published_at": "2023-06-01T12:00:00Z",
          "status": "active",
          "tags": "maternity, dress, comfortable",
          "images": [
            {
              "id": 2233445566,
              "product_id": 7890123456,
              "position": 1,
              "src": "https://cdn.shopify.com/image1.jpg",
              "width": 1000,
              "height": 1000,
              "alt": "Blue maternity dress front view"
            },
            {
              "id": 2233445567,
              "product_id": 7890123456,
              "position": 2,
              "src": "https://cdn.shopify.com/image2.jpg",
              "width": 1000,
              "height": 1000,
              "alt": "Blue maternity dress side view"
            }
          ],
          "options": [
            {
              "id": 9988776655,
              "product_id": 7890123456,
              "name": "Size",
              "position": 1,
              "values": ["Small", "Medium", "Large", "X-Large"]
            },
            {
              "id": 9988776656,
              "product_id": 7890123456,
              "name": "Color",
              "position": 2,
              "values": ["Blue", "Pink", "Black"]
            }
          ],
          "variants": [
            {
              "id": 4567890123,
              "product_id": 7890123456,
              "title": "Medium / Blue",
              "price": "79.99",
              "sku": "MAT-DRESS-001",
              "position": 1,
              "inventory_policy": "deny",
              "compare_at_price": "99.99",
              "fulfillment_service": "manual",
              "inventory_management": "shopify",
              "option1": "Medium",
              "option2": "Blue",
              "option3": null,
              "created_at": "2023-06-01T10:00:00Z",
              "updated_at": "2024-01-10T14:30:00Z",
              "taxable": true,
              "barcode": "123456789012",
              "grams": 500,
              "weight": 500,
              "weight_unit": "g",
              "inventory_quantity": 25,
              "requires_shipping": true,
              "metafields": [
                {
                  "id": 444555666,
                  "namespace": "custom",
                  "key": "fabric_composition",
                  "value": "95% Cotton, 5% Spandex",
                  "type": "single_line_text_field"
                }
              ]
            }
          ],
          "metafields": [
            {
              "id": 333444555,
              "namespace": "custom",
              "key": "seasonal_collection",
              "value": "Spring 2024",
              "type": "single_line_text_field"
            },
            {
              "id": 333444556,
              "namespace": "custom",
              "key": "eco_friendly",
              "value": "true",
              "type": "boolean"
            }
          ]
        }
      },
      {
        "id": 9876543211,
        "variant_id": 4567890124,
        "product_id": 7890123457,
        "title": "Nursing Pillow",
        "variant_title": null,
        "quantity": 1,
        "price": "49.99",
        "sku": "NUR-PIL-001",
        "grams": 800,
        "vendor": "Mommy First",
        "fulfillment_status": "fulfilled",
        "requires_shipping": true,
        "taxable": true,
        "gift_card": false,
        "name": "Nursing Pillow",
        "properties": [],
        "metafields": [],
        "product_details": {
          "id": 7890123457,
          "title": "Nursing Pillow",
          "handle": "nursing-pillow",
          "body_html": "<p>Ergonomic nursing pillow for comfortable feeding.</p>",
          "vendor": "Mommy First",
          "product_type": "Accessories",
          "created_at": "2023-07-15T10:00:00Z",
          "updated_at": "2024-01-12T09:00:00Z",
          "published_at": "2023-07-15T12:00:00Z",
          "status": "active",
          "tags": "nursing, pillow, baby care",
          "images": [
            {
              "id": 3344556677,
              "product_id": 7890123457,
              "position": 1,
              "src": "https://cdn.shopify.com/pillow1.jpg",
              "width": 1000,
              "height": 1000,
              "alt": "Nursing pillow"
            }
          ],
          "options": [
            {
              "id": 8877665544,
              "product_id": 7890123457,
              "name": "Title",
              "position": 1,
              "values": ["Default Title"]
            }
          ],
          "variants": [
            {
              "id": 4567890124,
              "product_id": 7890123457,
              "title": "Default Title",
              "price": "49.99",
              "sku": "NUR-PIL-001",
              "position": 1,
              "inventory_policy": "deny",
              "compare_at_price": null,
              "fulfillment_service": "manual",
              "inventory_management": "shopify",
              "option1": "Default Title",
              "option2": null,
              "option3": null,
              "created_at": "2023-07-15T10:00:00Z",
              "updated_at": "2024-01-12T09:00:00Z",
              "taxable": true,
              "barcode": "123456789013",
              "grams": 800,
              "weight": 800,
              "weight_unit": "g",
              "inventory_quantity": 50,
              "requires_shipping": true,
              "metafields": []
            }
          ],
          "metafields": [
            {
              "id": 555666777,
              "namespace": "custom",
              "key": "filling_material",
              "value": "Polyester fiber",
              "type": "single_line_text_field"
            }
          ]
        }
      }
    ],
    "shipping_lines": [
      {
        "id": 1122334455,
        "title": "Standard Shipping",
        "price": "10.00",
        "code": "STANDARD",
        "source": "shopify"
      }
    ],
    "tax_lines": [
      {
        "title": "State Tax",
        "price": "10.00",
        "rate": 0.08
      }
    ],
    "discount_codes": [],
    "discount_applications": [],
    "fulfillments": [
      {
        "id": 3344556677,
        "status": "success",
        "created_at": "2024-01-15T12:00:00Z",
        "tracking_company": "USPS",
        "tracking_number": "1234567890123",
        "tracking_url": "https://tracking.usps.com/1234567890123"
      }
    ],
    "refunds": [],
    "metafields": [
      {
        "id": 123456789,
        "namespace": "custom",
        "key": "delivery_instructions",
        "value": "Leave at front door",
        "type": "single_line_text_field"
      },
      {
        "id": 123456790,, metafields, and complete product details
- `shipping_lines`: Shipping method details
- `tax_lines`: Tax breakdown
- `discount_codes`: Applied discount codes
- `discount_applications`: Discount details
- `fulfillments`: Shipping/tracking information
- `refunds`: Refund information (if any)

### Line Item Product Details
Each line item includes a `product_details` object with:
- `id`: Product ID
- `title`: Product title
- `handle`: Product handle/slug
- `body_html`: Product description (HTML)
- `vendor`: Product vendor
- `product_type`: Product type/category
- `status`: Product status (active, draft, archived)
- `tags`: Product tags
- `images`: Array of all product images with URLs, dimensions, and alt text
- `options`: Array of product options (size, color, etc.)
- `variants`: Array of all product variants with:
  - CComplete Product Details**: Each line item includes full product information with:
   - All product images
   - Product description and metadata
   - All available variants with their metafields
   - Product-level and variant-level metafields
3. **Metafields**: Order-level, line item-level, product-level, and variant-level metafields are all included
4. **Performance**: The detailed order endpoint fetches complete product details and metafields for each line item, which may take longer for orders with many items
5. **Rate Limits**: Shopify API rate limits apply (2 requests per second)
6 }
}
```

**Error Responses:**

- **400 Bad Request:** Invalid order ID
```json
{
  "success": false,
  "message": "Invalid order ID provided"
}
```

- **404 Not Found:** Order not found
```json
{
  "success": false,
  "message": "Order not found"
}
```

- **401 Unauthorized:** Missing or invalid token
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

---

## Data Fields

### Order Summary (List Response)
- `id`: Order ID
- `order_number`: Human-readable order number
- `name`: Order name (e.g., "#1001")
- `email`: Customer email
- `created_at`: Order creation timestamp
- `updated_at`: Last update timestamp
- `currency`: Currency code (e.g., "USD")
- `total_price`: Total order amount
- `subtotal_price`: Subtotal before taxes and shipping
- `financial_status`: Payment status (pending, paid, refunded, etc.)
- `fulfillment_status`: Shipping status (unfulfilled, partial, fulfilled)
- `items_count`: Number of line items
- `customer`: Basic customer information
- `metafields`: Array of order metafields

### Order Details (Single Order Response)
Includes all fields from summary plus:
- `cancelled_at`: Cancellation timestamp (if applicable)
- `closed_at`: Close timestamp (if applicable)
- `processed_at`: Processing timestamp
- `total_tax`: Total tax amount
- `total_discounts`: Total discount amount
- `total_shipping`: Shipping cost
- `tags`: Order tags
- `note`: Order note/instructions
- `billing_address`: Full billing address object
- `shipping_address`: Full shipping address object
- `line_items`: Array of products with detailed information and metafields
- `shipping_lines`: Shipping method details
- `tax_lines`: Tax breakdown
- `discount_codes`: Applied discount codes
- `discount_applications`: Discount details
- `fulfillments`: Shipping/tracking information
- `refunds`: Refund information (if any)

### Metafields
Each metafield contains:
- `id`: Metafield ID
- `namespace`: Metafield namespace
- `key`: Metafield key
- `value`: Metafield value
- `type`: Metafield type (single_line_text_field, multi_line_text_field, etc.)

---

## Notes

1. **Authentication Required**: All endpoints require a valid JWT token
2. **Metafields**: Both order-level and line item-level metafields are included
3. **Performance**: The detailed order endpoint fetches metafields for each line item, which may take longer for orders with many items
4. **Rate Limits**: Shopify API rate limits apply (2 requests per second)
5. **Customer ID**: Use the `/user/:userId` endpoint to get the customer ID if needed

---

## Example Usage Flow

1. **Get Customer's Orders:**
```javascript
const response = await fetch('https://your-api.com/orders/customer/6987654321', {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
});
const { data } = await response.json();
// Display order list to customer
```

2. **Get Specific Order Details:**
```javascript
const orderId = data[0].id; // From previous step
const response = await fetch(`https://your-api.com/orders/${orderId}`, {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
});
const { data: orderDetails } = await response.json();
// Display full order details including metafields
```
