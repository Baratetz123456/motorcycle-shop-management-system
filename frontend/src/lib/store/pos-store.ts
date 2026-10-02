import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string; // SKU or UUID
  name: string;
  price: number;
  qty: number;
}

interface PosState {
  cart: CartItem[];
  customer_id: string | null;
  addToCart: (item: Omit<CartItem, 'qty'>) => void;
  removeFromCart: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  setCustomer: (id: string | null) => void;
  getTotals: () => { subtotal: number; total: number; itemCount: number };
}

export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
      cart: [],
      customer_id: null,
      addToCart: (item) => set((state) => {
        const existing = state.cart.find((i) => i.id === item.id);
        if (existing) {
          return { cart: state.cart.map((i) => i.id === item.id ? { ...i, qty: i.qty + 1 } : i) };
        }
        return { cart: [...state.cart, { ...item, qty: 1 }] };
      }),
      removeFromCart: (id) => set((state) => ({
        cart: state.cart.filter((i) => i.id !== id)
      })),
      updateQty: (id, qty) => set((state) => ({
        cart: state.cart.map((i) => i.id === id ? { ...i, qty: Math.max(1, qty) } : i)
      })),
      clearCart: () => set({ cart: [], customer_id: null }),
      setCustomer: (id) => set({ customer_id: id }),
      getTotals: () => {
        const { cart } = get();
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);
        return { subtotal, total: subtotal, itemCount };
      }
    }),
    {
      name: 'pos-cart-storage',
    }
  )
);
