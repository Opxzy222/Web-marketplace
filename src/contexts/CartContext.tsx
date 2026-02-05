// src/contexts/CartContext.tsx
import { createContext, ReactNode } from 'react';

interface CartContextType {
  // add your real cart state later
}

export const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  return (
    <CartContext.Provider value={{}}>
      {children}
    </CartContext.Provider>
  );
}