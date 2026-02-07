// context/CartContext.tsx
import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';

// ===============================================
// 1. TYPES — CLEANED & FINAL (React-optimized)
// ===============================================
export type CartItem = {
  id: string;
  shopId: number;
  shopName: string;
  product_name: string;        // ← SOURCE OF TRUTH
  custom_name?: string;        // Optional override
  price: number;
  original_price: number;
  quantity: number;
  is_available: boolean;
  image?: string;
  note?: string;
  is_custom: boolean;          // true = buyer added manually
  added_by?: 'buyer' | 'seller'; // for future use in PO
};

type CartContextType = {
  cart: Record<number, CartItem[]>;
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id' | 'quantity'>) => void;
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

// ===============================================
// 2. CONTEXT & PROVIDER (React-optimized)
// ===============================================
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

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [cart, setCart] = useState<Record<number, CartItem>>({});

  // Generate stable ID using shop + product_name (or timestamp for custom)
  const generateId = useCallback((item: Omit<CartItem, 'id'>): string => {
    const base = `shop_${item.shopId}`;
    if (item.is_custom) {
      return `${base}_custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    const safeName = (item.product_name || 'item')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .slice(0, 30);
    return `${base}_item_${safeName}`;
  }, []);

  const addItem = useCallback((newItem: Omit<CartItem, 'id' | 'quantity'>) => {
    setCart((prev) => {
      const shopId = newItem.shopId;
      const shopItems = prev[shopId] || [];

      // Match catalog items by product_name only
      const existing = shopItems.find((i) =>
        !i.is_custom &&
        i.product_name === newItem.product_name &&
        i.shopId === shopId
      );

      if (existing) {
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
      };

      return {
        ...prev,
        [shopId]: [...shopItems, itemToAdd],
      };
    });
  }, [generateId]);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) return;
    setCart((prev) => {
      const updated: Record<number, CartItem[]> = { ...prev };
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
      const updated: Record<number, CartItem[]> = { ...prev };
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
      const updated: Record<number, CartItem[]> = { ...prev };
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

  // Memoized derived state for performance
  const derivedState = useMemo(() => {
    const items = Object.values(cart).flat();
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const getShopItems = (shopId: number): CartItem[] => cart[shopId] || [];
    const getShopCount = (shopId: number): number => 
      getShopItems(shopId).reduce((sum, item) => sum + item.quantity, 0);
    const getShopIds = (): number[] => Object.keys(cart).map(Number);
    
    const getShopInfo = (shopId: number): { name: string; image?: string } | null => {
      const items = getShopItems(shopId);
      return items.length > 0 ? { name: items[0].shopName, image: items[0].image } : null;
    };

    return {
      items,
      totalItems,
      totalAmount,
      getShopItems,
      getShopCount,
      getShopIds,
      getShopInfo,
    };
  }, [cart]);

  return (
    <CartContext.Provider
      value={{
        cart,
        ...derivedState,
        addItem,
        updateQuantity,
        updatePrice,
        removeItem,
        clearCart,
        clearShopCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

// ===============================================
// 3. CUSTOM HOOKS (Optional performance boost)
// ===============================================
export const useShopCart = (shopId: number) => {
  const cart = useCart();
  return {
    items: cart.getShopItems(shopId),
    count: cart.getShopCount(shopId),
    addItem: (item: Omit<CartItem, 'id' | 'quantity' | 'shopId'>) => 
      cart.addItem({ ...item, shopId }),
    clear: () => cart.clearShopCart(shopId),
  };
};
