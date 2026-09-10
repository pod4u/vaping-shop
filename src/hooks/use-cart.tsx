"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import {
  CartItem,
  CartState,
  CART_STORAGE_KEY,
  CART_VERSION,
  MAX_QUANTITY_PER_ITEM,
} from "@/types/cart";

// Maximum number of items allowed in cart
const MAX_CART_ITEMS = 200;

// Validate a single cart item
function isValidCartItem(item: unknown): item is CartItem {
  if (typeof item !== "object" || item === null) return false;

  const obj = item as Record<string, unknown>;

  // Required string fields
  const requiredStrings = [
    "productFlavorId",
    "productName",
    "flavorName",
    "brandName",
  ];
  for (const field of requiredStrings) {
    if (typeof obj[field] !== "string" || obj[field].trim() === "") {
      return false;
    }
  }

  // Quantity must be integer between 1-99
  if (
    typeof obj.quantity !== "number" ||
    !Number.isInteger(obj.quantity) ||
    obj.quantity < 1 ||
    obj.quantity > MAX_QUANTITY_PER_ITEM
  ) {
    return false;
  }

  // unitPrice must be null or valid number
  if (obj.unitPrice !== null) {
    if (
      typeof obj.unitPrice !== "number" ||
      !Number.isFinite(obj.unitPrice) ||
      obj.unitPrice < 0
    ) {
      return false;
    }
  }

  // Optional string fields must be string or null if present
  const optionalStrings = [
    "sku",
    "variantKey",
    "productNameTh",
    "flavorNameTh",
    "brandNameTh",
    "imageUrl",
  ];
  for (const field of optionalStrings) {
    if (
      obj[field] !== undefined &&
      obj[field] !== null &&
      typeof obj[field] !== "string"
    ) {
      return false;
    }
  }

  return true;
}

// Helper to safely parse localStorage
function safeParseCart(json: string | null): CartState | null {
  if (!json) return null;

  try {
    const parsed = JSON.parse(json);

    // Validate structure
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !Array.isArray(parsed.items) ||
      typeof parsed.version !== "number"
    ) {
      return null;
    }

    // Check version compatibility
    if (parsed.version !== CART_VERSION) {
      return null;
    }

    // Limit total items
    if (parsed.items.length > MAX_CART_ITEMS) {
      return null;
    }

    if (
      (parsed.editingOrderId !== undefined && parsed.editingOrderId !== null && typeof parsed.editingOrderId !== "string") ||
      (parsed.editingOrderNumber !== undefined && parsed.editingOrderNumber !== null && typeof parsed.editingOrderNumber !== "string")
    ) {
      return null;
    }

    // Validate each item
    for (const item of parsed.items) {
      if (!isValidCartItem(item)) {
        return null;
      }
    }

    return parsed as CartState;
  } catch {
    return null;
  }
}

// Initial state
const initialCart: CartState = {
  items: [],
  version: CART_VERSION,
};

// Context types
interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  estimatedTotal: number;
  isHydrated: boolean;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  updateQuantity: (productFlavorId: string, quantity: number) => void;
  removeItem: (productFlavorId: string) => void;
  clearCart: () => void;
  editingOrderId: string | null;
  editingOrderNumber: string | null;
  startEditingOrder: (orderId: string, orderNumber: string, items: CartItem[]) => void;
  stopEditingOrder: () => void;
  hasItem: (productFlavorId: string) => boolean;
  getQuantity: (productFlavorId: string) => number;
  generateSummaryText: () => string;
}

// Create context with undefined default (to detect usage outside provider)
const CartContext = createContext<CartContextValue | undefined>(undefined);

// Provider props
interface CartProviderProps {
  children: ReactNode;
}

// Cart Provider Component
export function CartProvider({ children }: CartProviderProps) {
  const [cart, setCart] = useState<CartState>(initialCart);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      const parsed = safeParseCart(stored);

      if (parsed) {
        setCart(parsed);
      } else if (stored) {
        // Invalid or outdated data, clear it safely
        try {
          localStorage.removeItem(CART_STORAGE_KEY);
        } catch {
          // Ignore localStorage errors
        }
      }
    } catch {
      // localStorage error, ignore
    }

    setIsHydrated(true);
  }, []);

  // Persist to localStorage whenever cart changes (after hydration)
  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;

    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // localStorage error, ignore
    }
  }, [cart, isHydrated]);

  // Listen for storage events from other tabs
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== CART_STORAGE_KEY) return;

      // Parse the new value from the other tab
      const parsed = safeParseCart(event.newValue);

      if (parsed) {
        setCart(parsed);
      } else if (event.newValue !== null) {
        // Invalid data from other tab, clear local state
        setCart(initialCart);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Add or update item
  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, quantity: number = 1) => {
      // Handle NaN, Infinity, etc. - default to 1
      let normalizedQuantity: number;
      if (!Number.isFinite(quantity) || quantity < 1) {
        normalizedQuantity = 1;
      } else {
        // Round to integer and clamp to valid range
        normalizedQuantity = Math.max(
          1,
          Math.min(Math.round(quantity), MAX_QUANTITY_PER_ITEM)
        );
      }

      setCart((prev) => {
        // Check if we're at max items and this is a new item
        const existingIndex = prev.items.findIndex(
          (i) => i.productFlavorId === item.productFlavorId
        );

        if (existingIndex >= 0) {
          // Merge quantity for existing item
          const updated = [...prev.items];
          const newQuantity = Math.min(
            updated[existingIndex].quantity + normalizedQuantity,
            MAX_QUANTITY_PER_ITEM
          );
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: newQuantity,
          };
          return { ...prev, items: updated };
        }

        // Add new item (only if under max)
        if (prev.items.length >= MAX_CART_ITEMS) {
          return prev; // Don't add more items
        }

        return {
          ...prev,
          items: [...prev.items, { ...item, quantity: normalizedQuantity }],
        };
      });
    },
    []
  );

  // Update quantity for a specific item
  const updateQuantity = useCallback(
    (productFlavorId: string, quantity: number) => {
      // Handle NaN, Infinity, etc. - don't change state
      if (!Number.isFinite(quantity)) {
        return;
      }

      // Delete item if quantity is 0 or negative
      if (quantity < 1) {
        setCart((prev) => ({
          ...prev,
          items: prev.items.filter(
            (item) => item.productFlavorId !== productFlavorId
          ),
        }));
        return;
      }

      // Normalize positive decimals and clamp to valid range
      const normalizedQuantity = Math.max(
        1,
        Math.min(Math.round(quantity), MAX_QUANTITY_PER_ITEM)
      );

      setCart((prev) => {
        const updated = prev.items.map((item) =>
          item.productFlavorId === productFlavorId
            ? { ...item, quantity: normalizedQuantity }
            : item
        );
        return { ...prev, items: updated };
      });
    },
    []
  );

  // Remove item
  const removeItem = useCallback((productFlavorId: string) => {
    setCart((prev) => ({
      ...prev,
      items: prev.items.filter(
        (item) => item.productFlavorId !== productFlavorId
      ),
    }));
  }, []);

  // Clear all items
  const clearCart = useCallback(() => {
    setCart(initialCart);
  }, []);

  const startEditingOrder = useCallback(
    (orderId: string, orderNumber: string, items: CartItem[]) => {
      if (!orderId || !orderNumber || items.length < 1 || items.length > MAX_CART_ITEMS) return;
      if (!items.every(isValidCartItem)) return;
      setCart({
        items,
        version: CART_VERSION,
        editingOrderId: orderId,
        editingOrderNumber: orderNumber,
      });
    },
    []
  );

  const stopEditingOrder = useCallback(() => {
    setCart(initialCart);
  }, []);

  // Memoized computed values
  const itemCount = useMemo(
    () => cart.items.reduce((sum, item) => sum + item.quantity, 0),
    [cart.items]
  );

  const estimatedTotal = useMemo(
    () =>
      cart.items.reduce((sum, item) => {
        if (item.unitPrice === null) return sum;
        return sum + item.unitPrice * item.quantity;
      }, 0),
    [cart.items]
  );

  // Check if item exists in cart
  const hasItem = useCallback(
    (productFlavorId: string) => {
      return cart.items.some(
        (item) => item.productFlavorId === productFlavorId
      );
    },
    [cart.items]
  );

  // Get quantity of specific item
  const getQuantity = useCallback(
    (productFlavorId: string) => {
      const item = cart.items.find(
        (i) => i.productFlavorId === productFlavorId
      );
      return item?.quantity ?? 0;
    },
    [cart.items]
  );

  // Generate summary text for LINE
  const generateSummaryText = useCallback(() => {
    if (cart.items.length === 0) return "";

    const lines: string[] = ["รายการขอเช็กสินค้า Pod4U", ""];

    cart.items.forEach((item, index) => {
      // Prefer SKU, then variantKey, then full productFlavorId (not truncated)
      const identifier =
        item.sku || item.variantKey || item.productFlavorId;
      const brand = item.brandNameTh || item.brandName || "-";
      const product = item.productNameTh || item.productName || "-";
      const flavor = item.flavorNameTh || item.flavorName || "-";
      const priceText =
        item.unitPrice !== null ? `฿${item.unitPrice}/ชิ้น` : "สอบถามราคา";

      lines.push(
        `${index + 1}. [${identifier}] ${brand} · ${product} · ${flavor}`,
        `   จำนวน ${item.quantity} ชิ้น`,
        `   ราคาที่แสดง ${priceText}`,
        ""
      );
    });

    const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalText =
      estimatedTotal > 0
        ? `ยอดโดยประมาณ ฿${estimatedTotal.toLocaleString()}`
        : "สอบถามราคาทั้งหมด";

    lines.push(`รวม ${totalItems} ชิ้น`, totalText, "");
    lines.push("กรุณายืนยันสต็อก ราคา และข้อมูลจัดส่งอีกครั้งค่ะ");

    return lines.join("\n");
  }, [cart.items, estimatedTotal]);

  // Memoize context value
  const value = useMemo<CartContextValue>(
    () => ({
      items: cart.items,
      itemCount,
      estimatedTotal,
      isHydrated,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      editingOrderId: cart.editingOrderId ?? null,
      editingOrderNumber: cart.editingOrderNumber ?? null,
      startEditingOrder,
      stopEditingOrder,
      hasItem,
      getQuantity,
      generateSummaryText,
    }),
    [
      cart.items,
      itemCount,
      estimatedTotal,
      isHydrated,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      cart.editingOrderId,
      cart.editingOrderNumber,
      startEditingOrder,
      stopEditingOrder,
      hasItem,
      getQuantity,
      generateSummaryText,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// Custom hook to use cart context
export function useCart(): CartContextValue {
  const context = useContext(CartContext);

  if (context === undefined) {
    throw new Error(
      "useCart must be used within a CartProvider. " +
        "Make sure to wrap your application with <CartProvider>."
    );
  }

  return context;
}
