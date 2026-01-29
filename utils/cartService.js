const storefrontAPI = require("../config/shopify");
const { getCustomerMetafields, updateCustomerMetafield } = require("./customerService");

// Constants for cart metafield
const CART_METAFIELD_NAMESPACE = "custom";
const CART_METAFIELD_KEY = "cart_id";

/**
 * Get user's cart ID from their metafields
 * @param {number} customerId - Shopify customer ID
 * @returns {string|null} - Cart ID or null if not found
 */
async function getUserCartId(customerId) {
  try {
    const metafields = await getCustomerMetafields(customerId);
    const cartMetafield = metafields.find(
      (mf) => mf.namespace === CART_METAFIELD_NAMESPACE && mf.key === CART_METAFIELD_KEY
    );
    return cartMetafield ? cartMetafield.value : null;
  } catch (error) {
    console.error("Error getting user cart ID:", error.message);
    return null;
  }
}

/**
 * Save cart ID to user's metafields
 * @param {number} customerId - Shopify customer ID
 * @param {string} cartId - Cart ID to save
 */
async function saveUserCartId(customerId, cartId) {
  try {
    await updateCustomerMetafield(customerId, {
      namespace: CART_METAFIELD_NAMESPACE,
      key: CART_METAFIELD_KEY,
      value: cartId,
      type: "single_line_text_field",
    });
  } catch (error) {
    console.error("Error saving user cart ID:", error.message);
    // Don't throw - cart still works, just won't persist across sessions
  }
}

/**
 * Get or create a cart for a user
 * @param {number} customerId - Shopify customer ID
 * @param {string} email - Customer email (optional)
 * @returns {Object} - Cart object
 */
async function getOrCreateUserCart(customerId, email = null) {
  try {
    // First, try to get existing cart ID from user's metafields
    const existingCartId = await getUserCartId(customerId);

    if (existingCartId) {
      // Try to fetch the existing cart
      const existingCart = await getCart(existingCartId);
      if (existingCart) {
        return existingCart;
      }
      // Cart no longer exists, will create new one
    }

    // Create a new cart
    const buyerIdentity = email ? { email } : null;
    const newCart = await createCart(buyerIdentity);

    // Save cart ID to user's metafields
    await saveUserCartId(customerId, newCart.cartId);

    return newCart;
  } catch (error) {
    console.error("Error getting or creating user cart:", error.message);
    throw error;
  }
}

/**
 * Create a new cart
 * @param {string} buyerIdentity - Customer access token or email (optional)
 * @returns {Object} - Created cart object
 */
async function createCart(buyerIdentity = null) {
  try {
    const mutation = `
      mutation cartCreate($input: CartInput!) {
        cartCreate(input: $input) {
          cart {
            id
            checkoutUrl
            createdAt
            updatedAt
            lines(first: 100) {
              edges {
                node {
                  id
                  quantity
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      priceV2 {
                        amount
                        currencyCode
                      }
                      image {
                        url
                        altText
                      }
                      product {
                        id
                        title
                        handle
                        featuredImage {
                          url
                          altText
                        }
                      }
                    }
                  }
                  cost {
                    totalAmount {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
            cost {
              totalAmount {
                amount
                currencyCode
              }
              subtotalAmount {
                amount
                currencyCode
              }
              totalTaxAmount {
                amount
                currencyCode
              }
            }
            totalQuantity
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: {},
    };

    // Add buyer identity if provided
    if (buyerIdentity) {
      variables.input.buyerIdentity = {
        email: buyerIdentity.email,
        customerAccessToken: buyerIdentity.customerAccessToken,
      };
    }

    const response = await storefrontAPI.post("", {
      query: mutation,
      variables,
    });

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    const { cart, userErrors } = response.data.data.cartCreate;

    if (userErrors && userErrors.length > 0) {
      throw new Error(userErrors[0].message);
    }

    return formatCartResponse(cart);
  } catch (error) {
    console.error("Error creating cart:", error.message);
    throw error;
  }
}

/**
 * Get cart by ID
 * @param {string} cartId - Cart ID
 * @returns {Object} - Cart object
 */
async function getCart(cartId) {
  try {
    const query = `
      query getCart($cartId: ID!) {
        cart(id: $cartId) {
          id
          checkoutUrl
          createdAt
          updatedAt
          lines(first: 100) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    priceV2 {
                      amount
                      currencyCode
                    }
                    image {
                      url
                      altText
                    }
                    product {
                      id
                      title
                      handle
                      featuredImage {
                        url
                        altText
                      }
                    }
                  }
                }
                cost {
                  totalAmount {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
          cost {
            totalAmount {
              amount
              currencyCode
            }
            subtotalAmount {
              amount
              currencyCode
            }
            totalTaxAmount {
              amount
              currencyCode
            }
          }
          totalQuantity
        }
      }
    `;

    const response = await storefrontAPI.post("", {
      query,
      variables: { cartId },
    });

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    const cart = response.data.data.cart;

    if (!cart) {
      return null;
    }

    return formatCartResponse(cart);
  } catch (error) {
    console.error("Error getting cart:", error.message);
    throw error;
  }
}

/**
 * Add items to cart
 * @param {string} cartId - Cart ID
 * @param {Array} items - Array of items to add { variantId, quantity }
 * @returns {Object} - Updated cart object
 */
async function addToCart(cartId, items) {
  try {
    const mutation = `
      mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
        cartLinesAdd(cartId: $cartId, lines: $lines) {
          cart {
            id
            checkoutUrl
            createdAt
            updatedAt
            lines(first: 100) {
              edges {
                node {
                  id
                  quantity
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      priceV2 {
                        amount
                        currencyCode
                      }
                      image {
                        url
                        altText
                      }
                      product {
                        id
                        title
                        handle
                        featuredImage {
                          url
                          altText
                        }
                      }
                    }
                  }
                  cost {
                    totalAmount {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
            cost {
              totalAmount {
                amount
                currencyCode
              }
              subtotalAmount {
                amount
                currencyCode
              }
              totalTaxAmount {
                amount
                currencyCode
              }
            }
            totalQuantity
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const lines = items.map((item) => ({
      merchandiseId: item.variantId,
      quantity: item.quantity || 1,
    }));

    const response = await storefrontAPI.post("", {
      query: mutation,
      variables: { cartId, lines },
    });

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    const { cart, userErrors } = response.data.data.cartLinesAdd;

    if (userErrors && userErrors.length > 0) {
      throw new Error(userErrors[0].message);
    }

    return formatCartResponse(cart);
  } catch (error) {
    console.error("Error adding to cart:", error.message);
    throw error;
  }
}

/**
 * Update cart item quantity
 * @param {string} cartId - Cart ID
 * @param {Array} items - Array of items to update { lineId, quantity }
 * @returns {Object} - Updated cart object
 */
async function updateCartItems(cartId, items) {
  try {
    const mutation = `
      mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
        cartLinesUpdate(cartId: $cartId, lines: $lines) {
          cart {
            id
            checkoutUrl
            createdAt
            updatedAt
            lines(first: 100) {
              edges {
                node {
                  id
                  quantity
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      priceV2 {
                        amount
                        currencyCode
                      }
                      image {
                        url
                        altText
                      }
                      product {
                        id
                        title
                        handle
                        featuredImage {
                          url
                          altText
                        }
                      }
                    }
                  }
                  cost {
                    totalAmount {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
            cost {
              totalAmount {
                amount
                currencyCode
              }
              subtotalAmount {
                amount
                currencyCode
              }
              totalTaxAmount {
                amount
                currencyCode
              }
            }
            totalQuantity
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const lines = items.map((item) => ({
      id: item.lineId,
      quantity: item.quantity,
    }));

    const response = await storefrontAPI.post("", {
      query: mutation,
      variables: { cartId, lines },
    });

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    const { cart, userErrors } = response.data.data.cartLinesUpdate;

    if (userErrors && userErrors.length > 0) {
      throw new Error(userErrors[0].message);
    }

    return formatCartResponse(cart);
  } catch (error) {
    console.error("Error updating cart items:", error.message);
    throw error;
  }
}

/**
 * Remove items from cart
 * @param {string} cartId - Cart ID
 * @param {Array} lineIds - Array of line IDs to remove
 * @returns {Object} - Updated cart object
 */
async function removeFromCart(cartId, lineIds) {
  try {
    const mutation = `
      mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
        cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
          cart {
            id
            checkoutUrl
            createdAt
            updatedAt
            lines(first: 100) {
              edges {
                node {
                  id
                  quantity
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      priceV2 {
                        amount
                        currencyCode
                      }
                      image {
                        url
                        altText
                      }
                      product {
                        id
                        title
                        handle
                        featuredImage {
                          url
                          altText
                        }
                      }
                    }
                  }
                  cost {
                    totalAmount {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
            cost {
              totalAmount {
                amount
                currencyCode
              }
              subtotalAmount {
                amount
                currencyCode
              }
              totalTaxAmount {
                amount
                currencyCode
              }
            }
            totalQuantity
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response = await storefrontAPI.post("", {
      query: mutation,
      variables: { cartId, lineIds },
    });

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    const { cart, userErrors } = response.data.data.cartLinesRemove;

    if (userErrors && userErrors.length > 0) {
      throw new Error(userErrors[0].message);
    }

    return formatCartResponse(cart);
  } catch (error) {
    console.error("Error removing from cart:", error.message);
    throw error;
  }
}

/**
 * Format cart line item for API response
 * @param {Object} line - Cart line node
 * @returns {Object} - Formatted line item
 */
function formatCartLineItem(line) {
  const merchandise = line.merchandise;
  return {
    lineId: line.id,
    quantity: line.quantity,
    variant: {
      id: merchandise.id,
      title: merchandise.title,
      price: {
        amount: parseFloat(merchandise.priceV2.amount),
        currencyCode: merchandise.priceV2.currencyCode,
      },
      image: merchandise.image
        ? {
          url: merchandise.image.url,
          altText: merchandise.image.altText,
        }
        : null,
    },
    product: {
      id: merchandise.product.id,
      title: merchandise.product.title,
      handle: merchandise.product.handle,
      featuredImage: merchandise.product.featuredImage
        ? {
          url: merchandise.product.featuredImage.url,
          altText: merchandise.product.featuredImage.altText,
        }
        : null,
    },
    lineCost: {
      amount: parseFloat(line.cost.totalAmount.amount),
      currencyCode: line.cost.totalAmount.currencyCode,
    },
  };
}

/**
 * Format cart response for API
 * @param {Object} cart - Shopify cart object
 * @returns {Object} - Formatted cart object
 */
function formatCartResponse(cart) {
  const lines = cart.lines.edges.map((edge) => formatCartLineItem(edge.node));

  return {
    cartId: cart.id,
    checkoutUrl: cart.checkoutUrl,
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
    totalQuantity: cart.totalQuantity,
    items: lines,
    cost: {
      subtotal: {
        amount: parseFloat(cart.cost.subtotalAmount.amount),
        currencyCode: cart.cost.subtotalAmount.currencyCode,
      },
      total: {
        amount: parseFloat(cart.cost.totalAmount.amount),
        currencyCode: cart.cost.totalAmount.currencyCode,
      },
      totalTax: cart.cost.totalTaxAmount
        ? {
          amount: parseFloat(cart.cost.totalTaxAmount.amount),
          currencyCode: cart.cost.totalTaxAmount.currencyCode,
        }
        : null,
    },
  };
}

/**
 * Merge guest cart with user's cart
 * Called after user logs in to combine session cart with their saved cart
 * @param {number} customerId - Shopify customer ID
 * @param {string} guestCartId - Guest cart ID from session
 * @param {string} email - Customer email (optional)
 * @returns {Object} - Merged cart object
 */
async function mergeCartsOnLogin(customerId, guestCartId, email = null) {
  try {
    // Get the guest cart items
    const guestCart = guestCartId ? await getCart(guestCartId) : null;

    // Get or create the user's cart
    const userCart = await getOrCreateUserCart(customerId, email);

    // If no guest cart or guest cart is empty, just return user's cart
    if (!guestCart || !guestCart.items || guestCart.items.length === 0) {
      return {
        cart: userCart,
        merged: false,
        message: "No guest cart items to merge",
      };
    }

    // If user cart is same as guest cart, no need to merge
    if (userCart.cartId === guestCartId) {
      return {
        cart: userCart,
        merged: false,
        message: "Guest cart is already the user's cart",
      };
    }

    // Extract items from guest cart to add to user's cart
    const itemsToAdd = guestCart.items.map((item) => ({
      variantId: item.variant.id,
      quantity: item.quantity,
    }));

    // Add guest cart items to user's cart
    const mergedCart = await addToCart(userCart.cartId, itemsToAdd);

    return {
      cart: mergedCart,
      merged: true,
      itemsMerged: itemsToAdd.length,
      message: `Successfully merged ${itemsToAdd.length} item(s) from guest cart`,
    };
  } catch (error) {
    console.error("Error merging carts:", error.message);
    throw error;
  }
}

/**
 * Clear user's cart (delete cart reference from metafields)
 * @param {number} customerId - Shopify customer ID
 */
async function clearUserCart(customerId) {
  try {
    await updateCustomerMetafield(customerId, {
      namespace: CART_METAFIELD_NAMESPACE,
      key: CART_METAFIELD_KEY,
      value: "",
      type: "single_line_text_field",
    });
    return true;
  } catch (error) {
    console.error("Error clearing user cart:", error.message);
    throw error;
  }
}

/**
 * Update cart buyer identity and get checkout URL
 * @param {string} cartId - Cart ID
 * @param {string} customerAccessToken - Customer access token
 * @returns {Object} - Updated cart object with checkout URL
 */
async function updateCartBuyerIdentity(cartId, customerAccessToken) {
  try {
    const mutation = `
      mutation cartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
        cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
          cart {
            id
            checkoutUrl
            buyerIdentity {
              email
              phone
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response = await storefrontAPI.post("", {
      query: mutation,
      variables: {
        cartId,
        buyerIdentity: {
          customerAccessToken,
        },
      },
    });

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    const { cart, userErrors } = response.data.data.cartBuyerIdentityUpdate;

    if (userErrors && userErrors.length > 0) {
      throw new Error(userErrors[0].message);
    }

    return {
      cartId: cart.id,
      checkoutUrl: cart.checkoutUrl,
      buyerIdentity: cart.buyerIdentity,
    };
  } catch (error) {
    console.error("Error updating cart buyer identity:", error.message);
    throw error;
  }
}

module.exports = {
  createCart,
  getCart,
  addToCart,
  updateCartItems,
  removeFromCart,
  formatCartResponse,
  getUserCartId,
  saveUserCartId,
  getOrCreateUserCart,
  mergeCartsOnLogin,
  clearUserCart,
  updateCartBuyerIdentity,
};
