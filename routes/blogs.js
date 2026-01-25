const express = require("express");
const router = express.Router();
const storefrontAPI = require("../config/shopify");

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
    const blogs = response.data.data.blogs.edges.map(edge => edge.node);
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
    res.json({ success: true, data: blog });
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
    res.json({ success: true, data: article });
  } catch (error) {
    console.error("Error fetching article details:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch article details", error: error.message });
  }
});

module.exports = router;
