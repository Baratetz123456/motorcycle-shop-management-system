"use client";

import { useState } from "react";
import { Package, Search, Plus, Filter, AlertTriangle, ArrowUpRight, ArrowDownRight } from "lucide-react";
import clsx from "clsx";

const MOCK_INVENTORY = [
  { id: "uuid-1", sku: "OIL-10W40", name: "Synthetic Motor Oil 10W-40", category: "Fluids", stock: 45, reorder: 20, cost: 10.00, price: 15.99 },
  { id: "uuid-2", sku: "FLT-001", name: "Premium Oil Filter", category: "Filters", stock: 12, reorder: 15, cost: 4.50, price: 8.50 },
  { id: "uuid-3", sku: "BRK-PAD-F", name: "Front Brake Pads", category: "Brakes", stock: 8, reorder: 10, cost: 20.00, price: 34.00 },
  { id: "uuid-4", sku: "CHN-LUB", name: "Chain Lube Spray", category: "Maintenance", stock: 20, reorder: 10, cost: 6.00, price: 12.00 },
  { id: "uuid-5", sku: "SPK-PLG", name: "Iridium Spark Plug", category: "Engine", stock: 30, reorder: 20, cost: 8.00, price: 18.25 },
  { id: "uuid-6", sku: "TR-FR-120", name: "Front Tire 120/70-17", category: "Tires", stock: 4, reorder: 5, cost: 80.00, price: 120.00 },
];

export default function InventoryPage() {
  const [search, setSearch] = useState("");

  return (
    <div className="h-screen bg-zinc-950 p-8 flex flex-col overflow-hidden font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-500">
            Inventory Management
          </h1>
          <p className="text-zinc-400 mt-1">Track stock levels and manage products.</p>
        </div>
        
        <div className="flex gap-4">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search by SKU, Name..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-white transition-all"
            />
          </div>
          <button className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10 px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-[0_0_15px_-3px_rgba(6,182,212,0.4)] flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-hidden bg-zinc-900/50 border border-white/10 rounded-2xl flex flex-col backdrop-blur-md">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm text-zinc-300 whitespace-nowrap">
            <thead className="text-xs uppercase bg-zinc-900/80 text-zinc-400 border-b border-white/5 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 font-semibold">SKU / Item Name</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold text-right">Cost Price</th>
                <th className="px-6 py-4 font-semibold text-right">Selling Price</th>
                <th className="px-6 py-4 font-semibold text-right">Margin</th>
                <th className="px-6 py-4 font-semibold text-center">Stock Level</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {MOCK_INVENTORY.filter(item => 
                item.name.toLowerCase().includes(search.toLowerCase()) || 
                item.sku.toLowerCase().includes(search.toLowerCase())
              ).map((item) => {
                const margin = ((item.price - item.cost) / item.price) * 100;
                const isLowStock = item.stock <= item.reorder;
                
                return (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-zinc-800 p-2 rounded-lg border border-white/5 group-hover:border-cyan-500/30 transition-colors">
                          <Package className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div>
                          <div className="font-medium text-zinc-100">{item.name}</div>
                          <div className="text-xs text-zinc-500 font-mono mt-0.5">{item.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-zinc-800/50 px-2.5 py-1 rounded-md text-xs font-medium border border-white/5">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">${item.cost.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-medium text-white">${item.price.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-green-400 font-medium flex items-center justify-end gap-1">
                        {margin.toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-mono">
                      <span className={clsx("font-bold text-base", isLowStock ? "text-orange-400" : "text-white")}>
                        {item.stock}
                      </span>
                      <span className="text-zinc-500 text-xs ml-1">/ {item.reorder}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {isLowStock ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                          <AlertTriangle className="w-3 h-3" />
                          Reorder
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                          In Stock
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-md transition-colors" title="Receive Stock">
                          <ArrowDownRight className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-md transition-colors" title="Adjust Out">
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination placeholder */}
        <div className="p-4 border-t border-white/5 bg-zinc-900/80 flex items-center justify-between text-sm text-zinc-400">
          <div>Showing 1 to {MOCK_INVENTORY.length} of {MOCK_INVENTORY.length} items</div>
          <div className="flex gap-2">
            <button className="px-3 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 transition-colors disabled:opacity-50">Previous</button>
            <button className="px-3 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 transition-colors disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
      
    </div>
  );
}
