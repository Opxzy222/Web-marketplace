// src/context/CartContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';

// ───────────────────────────────────────────────
// 1. TYPES — CLEANED & FINAL
// ───────────────────────────────────────────────
export type CartItem = {
  id: string;
  shopId: number;
  shopName: string;
  product_name: string; // ← SOURCE OF TRUTH for display
  custom_name?: string; // Optional override
  price: number;
  original_price: number;
  quantity: number;
  is_available: boolean;
  image?: string;
  note?: string;
  is_custom: boolean; // true = buyer added manually
  added_by?: 'buyer' | 'seller'; // for future use in PO
  productId?: number | string; // ← backend product.id (unique per product)
};

type CartContextType = {
  cart: Record<number, CartItem[]>;
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id' | 'quantity'> & { productId?: number | string }) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updatePrice: (id: string, price: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  clearShopCart: (shopId: number) => void;
  getShopItems: (shopId: number) => CartItem[];
  getShopCount: (shopId: number) => number;
  getShopIds: () => number[];
  getShopInfo: (shopId: number) => { name: string; image?: string } | null;
  totalItems: number;
  totalAmount: number;
};

// ───────────────────────────────────────────────
// 2. CONTEXT & PROVIDER
// ───────────────────────────────────────────────
const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider = ({ children }: CartProviderProps) => {
  const [cart, setCart] = useState<Record<number, CartItem[]>>({});

  // Stable ID generation — prioritizes backend productId
  const generateId = (item: Omit<CartItem, 'id'> & { productId?: number | string }): string => {
    const base = `shop_${item.shopId}`;

    // Priority 1: Use unique backend productId when available
    if (item.productId != null) {
      return `${base}_prod_${item.productId}`;
    }

    // Priority 2: For customs → use custom_name or product_name
    let key = item.custom_name?.trim() || item.product_name.trim() || 'unnamed';

    const safeKey = key
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60);

    // Rare fallback for empty name
    if (!safeKey || safeKey === 'unnamed') {
      return `${base}_unnamed`;
    }

    return `${base}_custom_${safeKey}`;
  };

  const addItem = useCallback(
    (newItem: Omit<CartItem, 'id' | 'quantity'> & { productId?: number | string }) => {
      setCart((prev) => {
        const shopId = newItem.shopId;
        const shopItems = prev[shopId] || [];

        // Priority: match by productId first (unique & safe)
        const existingById = newItem.productId != null
          ? shopItems.find((i) => i.productId === newItem.productId)
          : null;

        // Fallback: match non-custom by name (only if no productId)
        const existingByName = !existingById && !newItem.is_custom
          ? shopItems.find(
              (i) =>
                !i.is_custom &&
                i.product_name === newItem.product_name &&
                i.shopId === shopId
            )
          : null;

        const existing = existingById || existingByName;

        if (existing) {
          // Increment quantity on duplicate
          return {
            ...prev,
            [shopId]: shopItems.map((i) =>
              i.id === existing.id
                ? { ...i, quantity: i.quantity + 1 }
                : i
            ),
          };
        }

        const itemToAdd: CartItem = {
          ...newItem,
          id: generateId(newItem),
          quantity: 1,
          product_name: newItem.product_name,
          is_custom: newItem.is_custom || false,
          added_by: 'buyer',
          productId: newItem.productId, // store for matching/removal
        };

        return {
          ...prev,
          [shopId]: [...shopItems, itemToAdd],
        };
      });
    },
    []
  );

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) return;
    setCart((prev) => {
      const updated = { ...prev };
      for (const shopId in updated) {
        const items = updated[shopId];
        const index = items.findIndex((i) => i.id === id);
        if (index !== -1) {
          if (quantity === 0) {
            updated[shopId] = items.filter((i) => i.id !== id);
            if (updated[shopId].length === 0) delete updated[shopId];
          } else {
            updated[shopId][index] = { ...items[index], quantity };
          }
          break;
        }
      }
      return updated;
    });
  }, []);

  const updatePrice = useCallback((id: string, price: number) => {
    setCart((prev) => {
      const updated = { ...prev };
      for (const shopId in updated) {
        const items = updated[shopId];
        const index = items.findIndex((i) => i.id === id);
        if (index !== -1) {
          updated[shopId][index] = { ...items[index], price };
          break;
        }
      }
      return updated;
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setCart((prev) => {
      const updated = { ...prev };
      for (const shopId in updated) {
        updated[shopId] = updated[shopId].filter((i) => i.id !== id);
        if (updated[shopId].length === 0) delete updated[shopId];
      }
      return updated;
    });
  }, []);

  const clearCart = useCallback(() => setCart({}), []);

  const clearShopCart = useCallback((shopId: number) => {
    setCart((prev) => {
      const updated = { ...prev };
      delete updated[shopId];
      return updated;
    });
  }, []);

  const getShopItems = useCallback(
    (shopId: number): CartItem[] => cart[shopId] || [],
    [cart]
  );

  const getShopCount = useCallback(
    (shopId: number) => getShopItems(shopId).reduce((s, i) => s + i.quantity, 0),
    [getShopItems]
  );

  const getShopIds = useCallback(() => Object.keys(cart).map(Number), [cart]);

  const getShopInfo = useCallback(
    (shopId: number) => {
      const items = getShopItems(shopId);
      if (items.length === 0) return null;
      return { name: items[0].shopName, image: items[0].image };
    },
    [getShopItems]
  );

  const allItems = Object.values(cart).flat();
  const totalItems = allItems.reduce((s, i) => s + i.quantity, 0);
  const totalAmount = allItems.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        items: allItems,
        addItem,
        updateQuantity,
        updatePrice,
        removeItem,
        clearCart,
        clearShopCart,
        getShopItems,
        getShopCount,
        getShopIds,
        getShopInfo,
        totalItems,
        totalAmount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};