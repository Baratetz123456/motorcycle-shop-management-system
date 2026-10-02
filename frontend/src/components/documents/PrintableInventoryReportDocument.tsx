import React from "react";
import { SystemSettings } from "@/lib/settings";
import {
  generateReportShellHtml,
  PrintableReportLayout,
  ReportKpiCard
} from "./PrintableReportLayout";

export interface InventoryReportItem {
  id?: string;
  name: string;
  sku?: string;
  item_type?: string;
  current_stock: number;
  reorder_level: number;
  cost_price: number;
  selling_price: number;
}

export interface InventoryReportProps {
  settings: SystemSettings;
  periodLabel: string;
  reportRef?: string;
  generatedBy?: string;
  generatedDate?: string;
  totalItems: number;
  totalStockUnits: number;
  totalWholesaleValue: number;
  totalRetailValue: number;
  projectedProfit: number;
  lowStockCount: number;
  categorySummary: Record<string, { count: number; stock: number; wholesaleValue: number; retailValue: number }>;
  items: InventoryReportItem[];
}

export function getInventoryReportDocumentHtml(props: InventoryReportProps): string {
  const {
    settings,
    periodLabel,
    reportRef = "REP-INV-" + new Date().toISOString().slice(0, 10).replace(/-/g, ""),
    generatedBy,
    generatedDate,
    totalItems,
    totalStockUnits,
    totalWholesaleValue,
    totalRetailValue,
    projectedProfit,
    lowStockCount,
    categorySummary,
    items
  } = props;

  const kpiCards: ReportKpiCard[] = [
    {
      label: "Wholesale Inventory Cost",
      value: `₱${totalWholesaleValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: `${totalStockUnits.toLocaleString()} total units in stock`
    },
    {
      label: "Retail Valuation",
      value: `₱${totalRetailValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: `${totalItems} active catalog products`
    },
    {
      label: "Projected Retail Margin",
      value: `₱${projectedProfit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: totalWholesaleValue > 0 ? `${((projectedProfit / totalWholesaleValue) * 100).toFixed(1)}% markup` : "0.0% markup"
    },
    {
      label: "Restock Required",
      value: `${lowStockCount} Items`,
      sub: "Items at or below safety reorder level"
    }
  ];

  // Category Breakdown Table Rows
  const catRowsHtml = Object.entries(categorySummary)
    .sort((a, b) => b[1].wholesaleValue - a[1].wholesaleValue)
    .map(([cat, val]) => `
      <tr style="background-color: #ffffff;">
        <td style="font-weight: 600; color: #09090b; padding: 4px 6px; border: 1px solid #e4e4e7;">
          ${cat.toUpperCase()}
        </td>
        <td style="text-align: center; font-family: monospace; color: #09090b; padding: 4px 6px; border: 1px solid #e4e4e7;">
          ${val.count}
        </td>
        <td style="text-align: center; font-family: monospace; color: #09090b; padding: 4px 6px; border: 1px solid #e4e4e7;">
          ${val.stock.toLocaleString()}
        </td>
        <td style="text-align: right; font-family: monospace; color: #09090b; padding: 4px 6px; border: 1px solid #e4e4e7;">
          ₱${val.wholesaleValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
        <td style="text-align: right; font-family: monospace; font-weight: 700; color: #09090b; padding: 4px 6px; border: 1px solid #e4e4e7;">
          ₱${val.retailValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
      </tr>
    `)
    .join("");

  // Master Items Table Rows
  const itemRowsHtml =
    items.length === 0
      ? `
        <tr style="background-color: #ffffff;">
          <td colspan="7" style="text-align: center; color: #71717a; padding: 12px; border: 1px solid #e4e4e7;">
            No inventory catalog items available.
          </td>
        </tr>
      `
      : items
          .slice(0, 100)
          .map((item, idx) => {
            const isLow = item.current_stock <= (item.reorder_level || 5);
            const totalWholesale = (item.current_stock * (item.cost_price || 0)).toFixed(2);
            return `
        <tr style="background-color: #ffffff;">
          <td style="text-align: center; font-family: monospace; font-size: 8pt; color: #09090b; padding: 4px 6px; border: 1px solid #e4e4e7;">${idx + 1}</td>
          <td style="font-weight: 600; color: #09090b; padding: 4px 6px; border: 1px solid #e4e4e7;">
            ${item.name}
            ${item.sku ? `<span style="display: block; font-size: 7pt; font-family: monospace; color: #71717a;">SKU: ${item.sku}</span>` : ""}
          </td>
          <td style="text-align: center; font-family: monospace; font-weight: 700; font-size: 8pt; color: #09090b; padding: 4px 6px; border: 1px solid #e4e4e7;">
            ${item.current_stock}
          </td>
          <td style="text-align: center; font-family: monospace; font-size: 7.5pt; color: #52525b; padding: 4px 6px; border: 1px solid #e4e4e7;">
            ${item.reorder_level || 5}
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 8pt; color: #52525b; padding: 4px 6px; border: 1px solid #e4e4e7;">
            ₱${Number(item.cost_price || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 8pt; color: #52525b; padding: 4px 6px; border: 1px solid #e4e4e7;">
            ₱${Number(item.selling_price || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
          <td style="text-align: center; padding: 4px 6px; border: 1px solid #e4e4e7;">
            <span class="print-pill" style="${isLow ? "background-color: #fee2e2 !important; color: #991b1b !important; border-color: #fca5a5 !important;" : ""}">
              ${isLow ? "RESTOCK" : "HEALTHY"}
            </span>
          </td>
        </tr>
      `;
          })
          .join("");

  const contentHtml = `
    <!-- Category Asset Allocation Table -->
    <div style="margin-bottom: 12px;">
      <h3 style="font-size: 9pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #09090b; margin-bottom: 4px;">
        1. Warehouse Asset Valuation by Classification
      </h3>
      <table style="width: 100%; border-collapse: collapse; background: #ffffff;">
        <thead>
          <tr style="background-color: #f4f4f5;">
            <th style="text-align: left; padding: 4px 6px; border: 1px solid #e4e4e7; font-size: 8pt; color: #09090b;">Category / Group</th>
            <th style="text-align: center; padding: 4px 6px; border: 1px solid #e4e4e7; font-size: 8pt; color: #09090b; width: 14%;">SKU Count</th>
            <th style="text-align: center; padding: 4px 6px; border: 1px solid #e4e4e7; font-size: 8pt; color: #09090b; width: 14%;">Stock Units</th>
            <th style="text-align: right; padding: 4px 6px; border: 1px solid #e4e4e7; font-size: 8pt; color: #09090b; width: 22%;">Wholesale Value</th>
            <th style="text-align: right; padding: 4px 6px; border: 1px solid #e4e4e7; font-size: 8pt; color: #09090b; width: 22%;">Retail Value</th>
          </tr>
        </thead>
        <tbody>
          ${catRowsHtml}
          <tr style="background-color: #f4f4f5; font-weight: 800;">
            <td style="text-align: left; padding: 4px 6px; border: 1px solid #e4e4e7; font-size: 8.5pt; color: #09090b;">
              TOTAL INVENTORY:
            </td>
            <td style="text-align: center; font-family: monospace; font-size: 8.5pt; padding: 4px 6px; border: 1px solid #e4e4e7; color: #09090b;">
              ${totalItems}
            </td>
            <td style="text-align: center; font-family: monospace; font-size: 8.5pt; padding: 4px 6px; border: 1px solid #e4e4e7; color: #09090b;">
              ${totalStockUnits.toLocaleString()}
            </td>
            <td style="text-align: right; font-family: monospace; font-size: 9pt; padding: 4px 6px; border: 1px solid #e4e4e7; color: #09090b;">
              ₱${totalWholesaleValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td style="text-align: right; font-family: monospace; font-size: 9pt; padding: 4px 6px; border: 1px solid #e4e4e7; color: #09090b;">
              ₱${totalRetailValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Master Catalog Ledger -->
    <div style="margin-top: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 4px;">
        <h3 style="font-size: 9pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #09090b; margin: 0;">
          2. Physical Stock & Reorder Register
        </h3>
        <span style="font-size: 7pt; color: #71717a; font-family: monospace;">
          Showing ${Math.min(items.length, 100)} of ${items.length} SKUs
        </span>
      </div>
      <table style="width: 100%; border-collapse: collapse; background: #ffffff;">
        <thead>
          <tr style="background-color: #f4f4f5;">
            <th style="text-align: center; padding: 4px 6px; border: 1px solid #e4e4e7; font-size: 8pt; color: #09090b; width: 4%;">#</th>
            <th style="text-align: left; padding: 4px 6px; border: 1px solid #e4e4e7; font-size: 8pt; color: #09090b;">Item Name & SKU</th>
            <th style="text-align: center; padding: 4px 6px; border: 1px solid #e4e4e7; font-size: 8pt; color: #09090b; width: 10%;">On Hand</th>
            <th style="text-align: center; padding: 4px 6px; border: 1px solid #e4e4e7; font-size: 8pt; color: #09090b; width: 10%;">Reorder</th>
            <th style="text-align: right; padding: 4px 6px; border: 1px solid #e4e4e7; font-size: 8pt; color: #09090b; width: 16%;">Wholesale Cost</th>
            <th style="text-align: right; padding: 4px 6px; border: 1px solid #e4e4e7; font-size: 8pt; color: #09090b; width: 16%;">Retail SRP</th>
            <th style="text-align: center; padding: 4px 6px; border: 1px solid #e4e4e7; font-size: 8pt; color: #09090b; width: 14%;">Stock Status</th>
          </tr>
        </thead>
        <tbody>
          ${itemRowsHtml}
        </tbody>
      </table>
    </div>
  `;

  return generateReportShellHtml({
    settings,
    reportTitle: "Inventory Stock Valuation & Asset Report",
    subtitle: "Official Physical Stock Count, Reorder Levels, and Capital Valuation",
    periodLabel,
    reportRef,
    generatedBy,
    generatedDate,
    kpiCards,
    contentHtml,
    preparedByLabel: "Prepared By (Warehouse Custodian)",
    reviewedByLabel: "Verified By (Inventory Controller)",
    approvedByLabel: "Approved By (General Manager)"
  });
}

export function PrintableInventoryReportDocument(props: InventoryReportProps) {
  const {
    settings,
    periodLabel,
    reportRef = "REP-INV-" + new Date().toISOString().slice(0, 10).replace(/-/g, ""),
    generatedBy,
    generatedDate,
    totalItems,
    totalStockUnits,
    totalWholesaleValue,
    totalRetailValue,
    projectedProfit,
    lowStockCount,
    categorySummary,
    items
  } = props;

  const kpiCards: ReportKpiCard[] = [
    {
      label: "Wholesale Inventory Cost",
      value: `₱${totalWholesaleValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: `${totalStockUnits.toLocaleString()} total units in stock`
    },
    {
      label: "Retail Valuation",
      value: `₱${totalRetailValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: `${totalItems} active catalog products`
    },
    {
      label: "Projected Retail Margin",
      value: `₱${projectedProfit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: totalWholesaleValue > 0 ? `${((projectedProfit / totalWholesaleValue) * 100).toFixed(1)}% markup` : "0.0% markup"
    },
    {
      label: "Restock Required",
      value: `${lowStockCount} Items`,
      sub: "Items at or below safety reorder level"
    }
  ];

  return (
    <PrintableReportLayout
      settings={settings}
      reportTitle="Inventory Stock Valuation & Asset Report"
      subtitle="Official Physical Stock Count, Reorder Levels, and Capital Valuation"
      periodLabel={periodLabel}
      reportRef={reportRef}
      generatedBy={generatedBy}
      generatedDate={generatedDate}
      kpiCards={kpiCards}
      preparedByLabel="Prepared By (Warehouse Custodian)"
      reviewedByLabel="Verified By (Inventory Controller)"
      approvedByLabel="Approved By (General Manager)"
    >
      <div className="space-y-4">
        {/* Category Breakdown */}
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-wider text-zinc-950 mb-1">
            1. Warehouse Asset Valuation by Classification
          </h3>
          <table className="w-full border-collapse border border-zinc-200 text-[9px]">
            <thead>
              <tr className="bg-zinc-100">
                <th className="text-left p-1 border border-zinc-200 text-zinc-950 font-bold">Category</th>
                <th className="text-center p-1 border border-zinc-200 text-zinc-950 font-bold w-16">SKUs</th>
                <th className="text-center p-1 border border-zinc-200 text-zinc-950 font-bold w-20">Stock</th>
                <th className="text-right p-1 border border-zinc-200 text-zinc-950 font-bold w-28">Wholesale</th>
                <th className="text-right p-1 border border-zinc-200 text-zinc-950 font-bold w-28">Retail SRP</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(categorySummary).map(([cat, val]) => (
                <tr key={cat} className="bg-white">
                  <td className="p-1 border border-zinc-200 font-medium text-zinc-900">{cat.toUpperCase()}</td>
                  <td className="p-1 border border-zinc-200 text-center font-mono text-zinc-900">{val.count}</td>
                  <td className="p-1 border border-zinc-200 text-center font-mono text-zinc-900">{val.stock.toLocaleString()}</td>
                  <td className="p-1 border border-zinc-200 text-right font-mono text-zinc-900">
                    ₱{val.wholesaleValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="p-1 border border-zinc-200 text-right font-mono font-bold text-zinc-950">
                    ₱{val.retailValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              <tr className="bg-zinc-100 font-bold">
                <td className="p-1 border border-zinc-200 text-zinc-950">TOTAL INVENTORY:</td>
                <td className="p-1 border border-zinc-200 text-center font-mono text-zinc-950">{totalItems}</td>
                <td className="p-1 border border-zinc-200 text-center font-mono text-zinc-950">{totalStockUnits.toLocaleString()}</td>
                <td className="p-1 border border-zinc-200 text-right font-mono text-zinc-950">
                  ₱{totalWholesaleValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="p-1 border border-zinc-200 text-right font-mono text-zinc-950">
                  ₱{totalRetailValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Catalog Items */}
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-zinc-950">
              2. Physical Stock & Reorder Register
            </h3>
            <span className="text-[8px] text-zinc-500 font-mono">
              Showing {Math.min(items.length, 100)} of {items.length} SKUs
            </span>
          </div>
          <table className="w-full border-collapse border border-zinc-200 text-[9px]">
            <thead>
              <tr className="bg-zinc-100">
                <th className="text-center p-1 border border-zinc-200 text-zinc-950 font-bold w-8">#</th>
                <th className="text-left p-1 border border-zinc-200 text-zinc-950 font-bold">Item Name & SKU</th>
                <th className="text-center p-1 border border-zinc-200 text-zinc-950 font-bold w-16">On Hand</th>
                <th className="text-center p-1 border border-zinc-200 text-zinc-950 font-bold w-16">Reorder</th>
                <th className="text-right p-1 border border-zinc-200 text-zinc-950 font-bold w-24">Wholesale</th>
                <th className="text-right p-1 border border-zinc-200 text-zinc-950 font-bold w-24">Retail SRP</th>
                <th className="text-center p-1 border border-zinc-200 text-zinc-950 font-bold w-20">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-3 text-center text-zinc-500 border border-zinc-200">
                    No inventory catalog items available.
                  </td>
                </tr>
              ) : (
                items.slice(0, 100).map((item, idx) => {
                  const isLow = item.current_stock <= (item.reorder_level || 5);
                  return (
                    <tr key={item.id || idx} className="bg-white">
                      <td className="p-1 border border-zinc-200 text-center font-mono text-zinc-600">{idx + 1}</td>
                      <td className="p-1 border border-zinc-200 text-zinc-900 font-medium">
                        {item.name}
                        {item.sku && <span className="block text-[8px] text-zinc-500">SKU: {item.sku}</span>}
                      </td>
                      <td className="p-1 border border-zinc-200 text-center font-mono font-bold text-zinc-950">
                        {item.current_stock}
                      </td>
                      <td className="p-1 border border-zinc-200 text-center font-mono text-zinc-600">
                        {item.reorder_level || 5}
                      </td>
                      <td className="p-1 border border-zinc-200 text-right font-mono text-zinc-600">
                        ₱{Number(item.cost_price || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-1 border border-zinc-200 text-right font-mono font-bold text-zinc-950">
                        ₱{Number(item.selling_price || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-1 border border-zinc-200 text-center">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                            isLow
                              ? "bg-red-100 text-red-800 border border-red-200"
                              : "bg-zinc-100 text-zinc-800 border border-zinc-200"
                          }`}
                        >
                          {isLow ? "RESTOCK" : "HEALTHY"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PrintableReportLayout>
  );
}
