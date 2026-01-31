import { 
  MdDashboard, 
  MdGridView, 
  MdOutlineReceiptLong, 
  MdAccountCircle, 
  MdShoppingBag,
  MdAnalytics 
} from 'react-icons/md';

export const getNavbarItems = (role: string) => {
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

    case 'main dealer':
      return [
        { name: "Overview", path: "/pages/dashboard", icon: <MdAnalytics /> },
        { name: "Product Management", path: "/pages/product-management", icon: <MdGridView /> },
        { name: "Update Price & Stock", path: "/pages/pricing-management", icon: <MdPriceChange /> },
        { name: "Manage Dealers", path: "/pages/manage-dealers", icon: <MdGroups /> },
        { name: "Add Dealers", path: "/pages/adddealers", icon: <MdPersonAdd /> },
        { name: "All Orders", path: "/pages/manage-orders", icon: <MdOutlineReceiptLong /> },
      ];


    case 'sub dealer':
      return [
        { name: "Overview", path: "/pages/dashboard", icon: <MdAnalytics /> },
        { name: "Products", path: "/pages/subproducts", icon: <MdGridView /> },
        { name: "Cart", path: "/pages/checkout", icon: <MdShoppingBag /> }, // Added Cart
        { name: "Track Orders", path: "/pages/suborders", icon: <MdOutlineReceiptLong /> },
        { name: "Manage Retail", path: "/pages/retail", icon: <MdGroups /> },
        { name: "Profile", path: "/pages/subprofile", icon: <MdAccountCircle /> },
      ];

    case 'retailer outlet':
      return [
        { name: "Overview", path: "/pages/dashboard", icon: <MdAnalytics /> },
        { name: "Products", path: "/pages/retproducts", icon: <MdGridView /> },
        { name: "Cart", path: "/pages/checkout", icon: <MdShoppingBag /> }, // Added Cart
        { name: "Track Orders", path: "/pages/retorders", icon: <MdOutlineReceiptLong /> },
        { name: "Profile", path: "/pages/retprofile", icon: <MdAccountCircle /> },
      ];

  // ... other roles remain same without Sub-Dealers
    default:
      return [];
  }
};