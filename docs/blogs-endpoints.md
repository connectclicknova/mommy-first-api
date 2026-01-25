# Blogs API Documentation

This document describes the endpoints for fetching blogs and articles from Shopify via the Storefront API.

---

## Endpoints

### 1. List Blogs

**Endpoint:** `GET /blogs`

**Description:**
Fetches a list of blogs, each with up to 10 articles (basic info).

**Response Example:**
```json
{
  "success": true,
  "data": [
    {
      "id": "gid://shopify/Blog/123456789",
      "handle": "news",
      "title": "News",
      "articles": {
        "edges": [
          {
            "node": {
              "id": "gid://shopify/Article/987654321",
              "title": "Welcome to Our Blog!",
              "handle": "welcome-to-our-blog",
              "excerpt": "A short intro...",
              "publishedAt": "2026-01-25T10:00:00Z",
              "image": {
                "url": "https://cdn.shopify.com/...",
                "altText": "Blog image"
              }
            }
          }
        ]
      }
    }
  ]
}
```

---

### 2. Blog Details (with Articles)

**Endpoint:** `GET /blogs/:blogHandle`

**Description:**
Fetches details of a single blog and up to 20 of its articles (with contentHtml, author, etc).

**URL Parameters:**
- `blogHandle`: The handle of the blog (e.g., `news`)

**Response Example:**
```json
{
  "success": true,
  "data": {
    "id": "gid://shopify/Blog/123456789",
    "handle": "news",
    "title": "News",
    "articles": {
      "edges": [
        {
          "node": {
            "id": "gid://shopify/Article/987654321",
            "title": "Welcome to Our Blog!",
            "handle": "welcome-to-our-blog",
            "excerpt": "A short intro...",
            "contentHtml": "<p>Full article content...</p>",
            "publishedAt": "2026-01-25T10:00:00Z",
            "image": {
              "url": "https://cdn.shopify.com/...",
              "altText": "Blog image"
            },
            "author": {
              "name": "Admin"
            }
          }
        }
      ]
    }
  }
}
```

---

### 3. Article Details (by Blog and Article Handle)

**Endpoint:** `GET /blogs/:blogHandle/articles/:articleHandle`

**Description:**
Fetches details of a single article by its blog handle and article handle.

**URL Parameters:**
- `blogHandle`: The handle of the blog (e.g., `news`)
- `articleHandle`: The handle of the article (e.g., `welcome-to-our-blog`)

**Response Example:**
```json
{
  "success": true,
  "data": {
    "id": "gid://shopify/Article/987654321",
    "title": "Welcome to Our Blog!",
    "handle": "welcome-to-our-blog",
    "excerpt": "A short intro...",
    "contentHtml": "<p>Full article content...</p>",
    "publishedAt": "2026-01-25T10:00:00Z",
    "image": {
      "url": "https://cdn.shopify.com/...",
      "altText": "Blog image"
    },
    "author": {
      "name": "Admin"
    }
  }
}
```

---

## Error Responses

- If a blog or article is not found:
```json
{
  "success": false,
  "message": "Blog not found"
}
```
```json
{
  "success": false,
  "message": "Article not found"
}
```

- On server error:
```json
{
  "success": false,
  "message": "Failed to fetch blog details",
  "error": "Error details..."
}
```

---

## Notes
- `blogHandle` and `articleHandle` are the unique handles from Shopify (not IDs).
- Article content is returned as HTML in `contentHtml`.
- Images and author info are included if available.
- Pagination: Only the first 10 (list) or 20 (details) articles are returned per blog for performance.
