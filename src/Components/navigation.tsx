import {
  MdDashboard,
  MdGridView,
  MdOutlineReceiptLong,
  MdAccountCircle,
  MdShoppingBag,
  MdAnalytics,
  MdPriceChange,
  MdGroups,
  MdPersonAdd,
  MdLayers // Added for Category icon
} from 'react-icons/md';

export const getNavbarItems = (role: string) => {
  // Normalize by converting to lowercase and trimming
  const normalizedRole = role?.toLowerCase().trim();

  switch (normalizedRole) {
    case 'dealer': 
      return [
        { name: "Overview", path: "/pages/dashboard", icon: <MdAnalytics /> },
        { name: "Products", path: "/pages/products", icon: <MdGridView /> },
        { name: "Cart", path: "/pages/cart", icon: <MdShoppingBag /> },
        { name: "Orders", path: "/pages/orders", icon: <MdOutlineReceiptLong /> },
        { name: "Profile", path: "/pages/dealerprofile", icon: <MdAccountCircle /> },
      ];

    case 'admin':
      return [
        { name: "Overview", path: "/pages/main-supplier-dashboard", icon: <MdAnalytics /> },
        { name: "Categories", path: "/pages/catgorypage", icon: <MdLayers /> }, 
        { name: "Product Management", path: "/pages/product-management", icon: <MdGridView /> },
        { name: "Update Price & Stock", path: "/pages/pricing-management", icon: <MdPriceChange /> },
        { name: "Manage Dealers", path: "/pages/manage-dealers", icon: <MdGroups /> },
        { name: "Add Dealers", path: "/pages/adddealers", icon: <MdPersonAdd /> },
        { name: "All Orders", path: "/pages/manage-orders", icon: <MdOutlineReceiptLong /> },
      ];

    // UPDATED TO MATCH DATABASE: sub_dealer
    case 'sub_dealer':
    case 'sub dealer': // Keep both just in case
      return [
        { name: "Overview", path: "/pages/dashboard", icon: <MdAnalytics /> },
        { name: "Products", path: "/pages/products", icon: <MdGridView /> },
        { name: "Cart", path: "/pages/cart", icon: <MdShoppingBag /> }, 
        { name: "Track Orders", path: "/pages/orders", icon: <MdOutlineReceiptLong /> },
        { name: "Profile", path: "/pages/subprofile", icon: <MdAccountCircle /> },
      ];

    // UPDATED TO MATCH DATABASE: retail_outlet
    case 'retail_outlet':
    case 'retailer outlet': // Keep both just in case
      return [
        { name: "Overview", path: "/pages/dashboard", icon: <MdAnalytics /> },
        { name: "Products", path: "/pages/products", icon: <MdGridView /> },
        { name: "Cart", path: "/pages/cart", icon: <MdShoppingBag /> }, 
        { name: "Track Orders", path: "/pages/orders", icon: <MdOutlineReceiptLong /> },
        { name: "Profile", path: "/pages/retprofile", icon: <MdAccountCircle /> },
      ];

    default:
      return [];
  }
};