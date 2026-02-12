const storefrontAPI = require("../config/shopify");

/**
 * Apply discount codes to a cart
 * @param {string} cartId - Cart ID
 * @param {Array<string>} discountCodes - Array of discount codes to apply
 * @returns {Object} - Updated cart with discount information
 */
async function applyDiscountCodes(cartId, discountCodes) {
  try {
    const mutation = `
      mutation cartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]!) {
        cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
          cart {
            id
            checkoutUrl
            createdAt
            updatedAt
            discountCodes {
              code
              applicable
            }
            discountAllocations {
              discountedAmount {
                amount
                currencyCode
              }
              ... on CartAutomaticDiscountAllocation {
                title
              }
              ... on CartCodeDiscountAllocation {
                code
              }
            }
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
                      compareAtPriceV2 {
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
                    amountPerQuantity {
                      amount
                      currencyCode
                    }
                    compareAtAmountPerQuantity {
                      amount
                      currencyCode
                    }
                  }
                  discountAllocations {
                    discountedAmount {
                      amount
                      currencyCode
                    }
                    ... on CartAutomaticDiscountAllocation {
                      title
                    }
                    ... on CartCodeDiscountAllocation {
                      code
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
              totalDutyAmount {
                amount
                currencyCode
              }
            }
            totalQuantity
          }
          userErrors {
            field
            message
            code
          }
        }
      }
    `;

    const response = await storefrontAPI.post("", {
      query: mutation,
      variables: { cartId, discountCodes },
    });

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    const { cart, userErrors } = response.data.data.cartDiscountCodesUpdate;

    if (userErrors && userErrors.length > 0) {
      // Return errors but also include cart data if available
      return {
        success: false,
        errors: userErrors,
        cart: cart ? formatCartWithDiscounts(cart) : null,
      };
    }

    return {
      success: true,
      cart: formatCartWithDiscounts(cart),
    };
  } catch (error) {
    console.error("Error applying discount codes:", error.message);
    throw error;
  }
}

/**
 * Remove discount codes from cart
 * @param {string} cartId - Cart ID
 * @returns {Object} - Updated cart without discount codes
 */
async function removeDiscountCodes(cartId) {
  try {
    // To remove discount codes, pass an empty array
    return await applyDiscountCodes(cartId, []);
  } catch (error) {
    console.error("Error removing discount codes:", error.message);
    throw error;
  }
}

/**
 * Get cart with discount information
 * @param {string} cartId - Cart ID
 * @returns {Object} - Cart with discount details
 */
async function getCartWithDiscounts(cartId) {
  try {
    const query = `
      query getCartWithDiscounts($cartId: ID!) {
        cart(id: $cartId) {
          id
          checkoutUrl
          createdAt
          updatedAt
          discountCodes {
            code
            applicable
          }
          discountAllocations {
            discountedAmount {
              amount
              currencyCode
            }
            ... on CartAutomaticDiscountAllocation {
              title
            }
            ... on CartCodeDiscountAllocation {
              code
            }
          }
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
                    compareAtPriceV2 {
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
                  amountPerQuantity {
                    amount
                    currencyCode
                  }
                  compareAtAmountPerQuantity {
                    amount
                    currencyCode
                  }
                }
                discountAllocations {
                  discountedAmount {
                    amount
                    currencyCode
                  }
                  ... on CartAutomaticDiscountAllocation {
                    title
                  }
                  ... on CartCodeDiscountAllocation {
                    code
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
            totalDutyAmount {
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

    return formatCartWithDiscounts(cart);
  } catch (error) {
    console.error("Error getting cart with discounts:", error.message);
    throw error;
  }
}

/**
 * Get available automatic discounts for a cart
 * This checks what automatic discounts are currently applied
 * @param {string} cartId - Cart ID
 * @returns {Object} - Automatic discounts information
 */
async function getAutomaticDiscounts(cartId) {
  try {
    const cart = await getCartWithDiscounts(cartId);
    
    if (!cart) {
      return { automaticDiscounts: [] };
    }

    // Filter for automatic discounts from cart-level allocations
    const automaticDiscounts = cart.discountAllocations
      .filter(allocation => allocation.type === "automatic")
      .map(allocation => ({
        title: allocation.title,
        discountedAmount: allocation.discountedAmount,
      }));

    // Also gather line-level automatic discounts
    const lineAutomaticDiscounts = [];
    cart.items.forEach(item => {
      if (item.discountAllocations) {
        item.discountAllocations
          .filter(allocation => allocation.type === "automatic")
          .forEach(allocation => {
            // Check if already added
            const existing = lineAutomaticDiscounts.find(d => d.title === allocation.title);
            if (!existing) {
              lineAutomaticDiscounts.push({
                title: allocation.title,
                discountedAmount: allocation.discountedAmount,
              });
            }
          });
      }
    });

    return {
      cartLevelDiscounts: automaticDiscounts,
      lineLevelDiscounts: lineAutomaticDiscounts,
      totalAutomaticDiscounts: [...automaticDiscounts, ...lineAutomaticDiscounts],
    };
  } catch (error) {
    console.error("Error getting automatic discounts:", error.message);
    throw error;
  }
}

/**
 * Format cart line item with discount information
 * @param {Object} line - Cart line node
 * @returns {Object} - Formatted line item
 */
function formatLineItemWithDiscount(line) {
  const merchandise = line.merchandise;
  
  // Calculate line-level discounts
  const lineDiscounts = line.discountAllocations?.map(allocation => ({
    type: allocation.title ? "automatic" : "code",
    title: allocation.title || null,
    code: allocation.code || null,
    discountedAmount: {
      amount: parseFloat(allocation.discountedAmount.amount),
      currencyCode: allocation.discountedAmount.currencyCode,
    },
  })) || [];

  const totalLineDiscount = lineDiscounts.reduce(
    (sum, d) => sum + d.discountedAmount.amount,
    0
  );

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
      compareAtPrice: merchandise.compareAtPriceV2 ? {
        amount: parseFloat(merchandise.compareAtPriceV2.amount),
        currencyCode: merchandise.compareAtPriceV2.currencyCode,
      } : null,
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
    cost: {
      totalAmount: {
        amount: parseFloat(line.cost.totalAmount.amount),
        currencyCode: line.cost.totalAmount.currencyCode,
      },
      amountPerQuantity: line.cost.amountPerQuantity ? {
        amount: parseFloat(line.cost.amountPerQuantity.amount),
        currencyCode: line.cost.amountPerQuantity.currencyCode,
      } : null,
      compareAtAmountPerQuantity: line.cost.compareAtAmountPerQuantity ? {
        amount: parseFloat(line.cost.compareAtAmountPerQuantity.amount),
        currencyCode: line.cost.compareAtAmountPerQuantity.currencyCode,
      } : null,
    },
    discountAllocations: lineDiscounts,
    totalDiscount: {
      amount: totalLineDiscount,
      currencyCode: line.cost.totalAmount.currencyCode,
    },
  };
}

/**
 * Format cart response with discount information
 * @param {Object} cart - Shopify cart object
 * @returns {Object} - Formatted cart with discounts
 */
function formatCartWithDiscounts(cart) {
  const lines = cart.lines.edges.map((edge) => formatLineItemWithDiscount(edge.node));

  // Format discount codes
  const discountCodes = cart.discountCodes?.map(dc => ({
    code: dc.code,
    applicable: dc.applicable,
  })) || [];

  // Format cart-level discount allocations
  const discountAllocations = cart.discountAllocations?.map(allocation => ({
    type: allocation.title ? "automatic" : "code",
    title: allocation.title || null,
    code: allocation.code || null,
    discountedAmount: {
      amount: parseFloat(allocation.discountedAmount.amount),
      currencyCode: allocation.discountedAmount.currencyCode,
    },
  })) || [];

  // Calculate total discount amount
  const totalDiscountAmount = discountAllocations.reduce(
    (sum, d) => sum + d.discountedAmount.amount,
    0
  );

  // Separate automatic and code discounts
  const automaticDiscounts = discountAllocations.filter(d => d.type === "automatic");
  const codeDiscounts = discountAllocations.filter(d => d.type === "code");

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
      totalDuty: cart.cost.totalDutyAmount
        ? {
            amount: parseFloat(cart.cost.totalDutyAmount.amount),
            currencyCode: cart.cost.totalDutyAmount.currencyCode,
          }
        : null,
    },
    discounts: {
      codes: discountCodes,
      allocations: discountAllocations,
      automaticDiscounts,
      codeDiscounts,
      totalDiscount: {
        amount: totalDiscountAmount,
        currencyCode: cart.cost.totalAmount.currencyCode,
      },
    },
  };
}

/**
 * Validate discount code (check if applicable before applying)
 * This applies the code and checks if it's valid, then optionally removes it
 * @param {string} cartId - Cart ID
 * @param {string} discountCode - Discount code to validate
 * @param {boolean} keepIfValid - Whether to keep the code if valid (default: false)
 * @returns {Object} - Validation result
 */
async function validateDiscountCode(cartId, discountCode, keepIfValid = false) {
  try {
    // First, get current cart state to restore later if needed
    const currentCart = await getCartWithDiscounts(cartId);
    const existingCodes = currentCart?.discounts?.codes?.map(c => c.code) || [];

    // Apply the new code along with existing codes
    const codesToApply = [...existingCodes, discountCode];
    const result = await applyDiscountCodes(cartId, codesToApply);

    if (!result.success) {
      return {
        valid: false,
        applicable: false,
        message: result.errors?.[0]?.message || "Invalid discount code",
        errors: result.errors,
      };
    }

    // Check if the code is applicable
    const appliedCode = result.cart.discounts.codes.find(
      c => c.code.toLowerCase() === discountCode.toLowerCase()
    );

    const isApplicable = appliedCode?.applicable || false;

    // If not keeping the code, restore to previous state
    if (!keepIfValid || !isApplicable) {
      await applyDiscountCodes(cartId, existingCodes);
    }

    return {
      valid: true,
      applicable: isApplicable,
      message: isApplicable 
        ? "Discount code is valid and applicable" 
        : "Discount code is valid but not applicable to current cart",
      cart: keepIfValid && isApplicable ? result.cart : null,
    };
  } catch (error) {
    console.error("Error validating discount code:", error.message);
    throw error;
  }
}

module.exports = {
  applyDiscountCodes,
  removeDiscountCodes,
  getCartWithDiscounts,
  getAutomaticDiscounts,
  validateDiscountCode,
  formatCartWithDiscounts,
  formatLineItemWithDiscount,
};
