const express = require("express");
const router = express.Router();
const storefrontAPI = require("../config/shopify");
const axios = require("axios");

// Admin API for fetching metafields
const adminAPI = axios.create({
  baseURL: `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2025-01`,
  headers: {
    "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
    "Content-Type": "application/json",
  },
});

/**
 * GET /blogs
 * Fetch list of blogs (Shopify blog articles)
 */
router.get("/", async (req, res) => {
  try {
    const query = `
      {
        blogs(first: 10) {
          edges {
            node {
              id
              handle
              title
              articles(first: 10) {
                edges {
                  node {
                    id
                    title
                    handle
                    excerpt
                    publishedAt
                    image {
                      url
                      altText
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;
    const response = await storefrontAPI.post("", { query });
    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }
    
    // Fetch metafields for each article using Admin API REST
    const blogs = await Promise.all(response.data.data.blogs.edges.map(async (edge) => {
      const articlesWithMetafields = await Promise.all(edge.node.articles.edges.map(async (articleEdge) => {
        const articleId = articleEdge.node.id.split('/').pop();
        let metafields = [];
        
        try {
          const metafieldsResponse = await adminAPI.get(`/articles/${articleId}/metafields.json`);
          metafields = metafieldsResponse.data.metafields || [];
        } catch (err) {
          console.log(`Could not fetch metafields for article ${articleId}`);
        }
        
        return {
          node: {
            ...articleEdge.node,
            metafields
          }
        };
      }));
      
      return {
        ...edge.node,
        articles: {
          edges: articlesWithMetafields
        }
      };
    }));
    
    res.json({ success: true, data: blogs });
  } catch (error) {
    console.error("Error fetching blogs:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch blogs", error: error.message });
  }
});

/**
 * GET /blogs/:blogHandle
 * Fetch details of a single blog (and its articles)
 */
router.get("/:blogHandle", async (req, res) => {
  try {
    const { blogHandle } = req.params;
    const query = `
      query getBlog($handle: String!) {
        blogByHandle(handle: $handle) {
          id
          handle
          title
          articles(first: 20) {
            edges {
              node {
                id
                title
                handle
                excerpt
                contentHtml
                publishedAt
                image {
                  url
                  altText
                }
                author {
                  name
                }
              }
            }
          }
        }
      }
    `;
    const variables = { handle: blogHandle };
    const response = await storefrontAPI.post("", { query, variables });
    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }
    const blog = response.data.data.blogByHandle;
    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }
    
    // Fetch metafields for each article using Admin API REST
    const articlesWithMetafields = await Promise.all(blog.articles.edges.map(async (articleEdge) => {
      const articleId = articleEdge.node.id.split('/').pop();
      let metafields = [];
      
      try {
        const metafieldsResponse = await adminAPI.get(`/articles/${articleId}/metafields.json`);
        metafields = metafieldsResponse.data.metafields || [];
      } catch (err) {
        console.log(`Could not fetch metafields for article ${articleId}`);
      }
      
      return {
        node: {
          ...articleEdge.node,
          metafields
        }
      };
    }));
    
    const formattedBlog = {
      ...blog,
      articles: {
        edges: articlesWithMetafields
      }
    };
    res.json({ success: true, data: formattedBlog });
  } catch (error) {
    console.error("Error fetching blog details:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch blog details", error: error.message });
  }
});

/**
 * GET /blogs/:blogHandle/articles/:articleHandle
 * Fetch details of a single article by blog handle and article handle
 */
router.get("/:blogHandle/articles/:articleHandle", async (req, res) => {
  try {
    const { blogHandle, articleHandle } = req.params;
    const query = `
      query getBlog($handle: String!) {
        blogByHandle(handle: $handle) {
          id
          handle
          title
          articles(first: 50) {
            edges {
              node {
                id
                title
                handle
                excerpt
                contentHtml
                publishedAt
                image {
                  url
                  altText
                }
                author {
                  name
                }
              }
            }
          }
        }
      }
    `;
    const variables = { handle: blogHandle };
    const response = await storefrontAPI.post("", { query, variables });
    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }
    const blog = response.data.data.blogByHandle;
    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }
    const article = (blog.articles.edges.map(e => e.node).find(a => a.handle === articleHandle));
    if (!article) {
      return res.status(404).json({ success: false, message: "Article not found" });
    }
    
    // Fetch metafields for the article using Admin API REST
    const articleId = article.id.split('/').pop();
    let metafields = [];
    
    try {
      const metafieldsResponse = await adminAPI.get(`/articles/${articleId}/metafields.json`);
      metafields = metafieldsResponse.data.metafields || [];
    } catch (err) {
      console.log(`Could not fetch metafields for article ${articleId}`);
    }
    
    const formattedArticle = {
      ...article,
      metafields
    };
    res.json({ success: true, data: formattedArticle });
  } catch (error) {
    console.error("Error fetching article details:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch article details", error: error.message });
  }
});

module.exports = router;
