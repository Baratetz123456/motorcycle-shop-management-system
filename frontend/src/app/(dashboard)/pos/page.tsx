"use client";

import { usePosStore } from "@/lib/store/pos-store";
import { CheckoutModal } from "@/components/pos/CheckoutModal";
import { ShoppingCart, Package, Search, Plus, Minus, Trash2 } from "lucide-react";

// Mock Products for UI testing
const MOCK_PRODUCTS = [
  { id: "uuid-1", sku: "OIL-10W40", name: "Synthetic Motor Oil 10W-40", price: 15.99, stock: 45 },
  { id: "uuid-2", sku: "FLT-001", name: "Premium Oil Filter", price: 8.50, stock: 12 },
  { id: "uuid-3", sku: "BRK-PAD-F", name: "Front Brake Pads", price: 34.00, stock: 8 },
  { id: "uuid-4", sku: "CHN-LUB", name: "Chain Lube Spray", price: 12.00, stock: 20 },
  { id: "uuid-5", sku: "SPK-PLG", name: "Iridium Spark Plug", price: 18.25, stock: 30 },
  { id: "uuid-6", sku: "TR-FR-120", name: "Front Tire 120/70-17", price: 120.00, stock: 4 },
];

export default function POSPage() {
  const { cart, addToCart, removeFromCart, updateQty, getTotals } = usePosStore();
  const { subtotal, total, itemCount } = getTotals();

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden text-zinc-50 font-sans">
      
      {/* Left: Product Grid */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-20 border-b border-white/10 flex items-center px-8 bg-zinc-950/50 backdrop-blur-xl z-10 sticky top-0">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
            MotoShop POS
          </h1>
          
          <div className="ml-auto relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search by SKU or Name..." 
              className="w-full bg-zinc-900/80 border border-white/10 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all text-sm"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {MOCK_PRODUCTS.map((product) => (
              <div 
                key={product.id} 
                onClick={() => addToCart({ id: product.id, name: product.name, price: product.price })}
                className="group relative bg-zinc-900/40 border border-white/5 rounded-2xl p-6 cursor-pointer overflow-hidden hover:border-cyan-500/50 transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(6,182,212,0.3)]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 via-transparent to-blue-500/0 group-hover:from-cyan-500/10 group-hover:to-blue-500/10 transition-all duration-500" />
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="bg-zinc-800/80 rounded-lg p-2 border border-white/5">
                    <Package className="w-6 h-6 text-cyan-400" />
                  </div>
                  <span className="text-xs font-mono text-zinc-400 bg-zinc-900/80 px-2 py-1 rounded-md border border-white/5">
                    {product.sku}
                  </span>
                </div>
                
                <h3 className="font-medium text-zinc-100 mb-1 relative z-10 line-clamp-2">{product.name}</h3>
                <div className="flex items-end justify-between mt-4 relative z-10">
                  <span className="text-xl font-bold text-white">${product.price.toFixed(2)}</span>
                  <span className="text-xs text-zinc-500 font-medium">Stock: {product.stock}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-[450px] bg-zinc-900/60 border-l border-white/10 flex flex-col backdrop-blur-2xl shadow-2xl relative z-20">
        <div className="h-20 flex items-center justify-between px-6 border-b border-white/10 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-500/20 p-2 rounded-xl text-cyan-400">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold">Current Order</h2>
          </div>
          <span className="bg-zinc-800 text-zinc-300 text-xs font-bold px-3 py-1 rounded-full border border-white/5">
            {itemCount} Items
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-4 opacity-50">
              <ShoppingCart className="w-16 h-16" />
              <p>Cart is empty</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="bg-zinc-950/50 border border-white/5 rounded-xl p-4 flex gap-4 group hover:border-white/10 transition-colors">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-zinc-200 line-clamp-1 mb-1">{item.name}</h4>
                  <span className="text-cyan-400 font-bold">${item.price.toFixed(2)}</span>
                </div>
                
                <div className="flex items-center gap-3 bg-zinc-900 rounded-lg p-1 border border-white/5">
                  <button 
                    onClick={() => updateQty(item.id, item.qty - 1)}
                    className="p-1 hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-white"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-6 text-center text-sm font-medium">{item.qty}</span>
                  <button 
                    onClick={() => updateQty(item.id, item.qty + 1)}
                    className="p-1 hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-white"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                
                <button 
                  onClick={() => removeFromCart(item.id)}
                  className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors ml-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-zinc-950/80 border-t border-white/10 backdrop-blur-xl">
          <div className="space-y-3 mb-6 text-sm">
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal</span>
              <span className="font-medium text-zinc-200">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Tax (0%)</span>
              <span className="font-medium text-zinc-200">$0.00</span>
            </div>
            <div className="flex justify-between items-end pt-3 border-t border-white/5">
              <span className="text-zinc-300 font-medium">Total</span>
              <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
                ${total.toFixed(2)}
              </span>
            </div>
          </div>
          
          <CheckoutModal disabled={cart.length === 0} />
        </div>
      </div>
    </div>
  );
}
