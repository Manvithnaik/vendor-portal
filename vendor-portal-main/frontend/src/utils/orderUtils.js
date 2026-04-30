export const getProductSummary = (order) => {
  if (!order) return "Product not available";

  // Check for nested items array
  const listKeys = ['items', 'products', 'order_items', 'line_items'];
  let products = [];

  for (const key of listKeys) {
    if (Array.isArray(order[key]) && order[key].length > 0) {
      products = order[key].map(item => {
        // Find product name or fallback to Product ID
        return item.product_name || item.name || item.item_name || (item.product_id ? `Product #${item.product_id}` : null);
      }).filter(Boolean);
      break;
    }
  }

  // Generate Product Summary
  if (products.length > 0) {
    const firstProduct = products[0];
    if (products.length > 1) {
      return `${firstProduct} (+${products.length - 1} more)`;
    }
    return firstProduct;
  }

  // Fallback to top-level order naming if no items found
  if (order.productName) return order.productName;
  if (order.product_name) return order.product_name;
  if (order.title) return order.title;
  
  return "Product not available";
};
