const PLPProductByCollection = `
query PLPProducts($handle: String! $first: Int! $after: String $filters: [ProductFilter!] $sortKey: ProductCollectionSortKeys ) {
    collection(handle: $handle) {
        description
        descriptionHtml
        handle
        id
        title
        products(first: $first, filters: $filters, sortKey: $sortKey, after: $after) {
            filters {
                id
                label
                presentation
                type
                values {
                    count
                    id
                    input
                    label
                    swatch {
                        color
                    }
                }
            }
            pageInfo {
                endCursor
                hasNextPage
                hasPreviousPage
                startCursor
            }
            edges {
                cursor
                node  {
                availableForSale
                id
                handle
                tags
                title
                compareAtPriceRange {
                    maxVariantPrice {
                        amount
                        currencyCode
                    }
                    minVariantPrice {
                        amount
                        currencyCode
                    }
                }
                images(first: 50) {
                    nodes {
                        id
                        url
                        width
                        height
                    }
                }
                vendor
                description
                options {
                    id
                    name
                    values
                    optionValues {
                        id
                        name
                    }
                }
                featuredImage {
                    id
                    height
                    altText
                    url
                    width
                    src
                }
                variants(first: 10) {
                    nodes {
                        availableForSale
                        compareAtPrice {
                            amount
                            currencyCode
                        }
                        compareAtPriceV2 {
                            amount
                            currencyCode
                        }
                        sku
                        title
                        unitPrice {
                            amount
                            currencyCode
                        }
                        selectedOptions {
                            name
                            value
                        }
                        price {
                            amount
                            currencyCode
                        }
                    }
                }
            }
            }
        }
    }
}`


module.exports = {
    PLPProducts,
    PLPProductByCollection
}