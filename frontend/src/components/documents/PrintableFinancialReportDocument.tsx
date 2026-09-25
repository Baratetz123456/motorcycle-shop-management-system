import React from "react";
import { SystemSettings } from "@/lib/settings";
import {
  generateReportShellHtml,
  PrintableReportLayout,
  ReportKpiCard
} from "./PrintableReportLayout";

export interface ExpenseItemRecord {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  vendor?: string;
  reference_no?: string;
}

export interface FinancialReportProps {
  settings: SystemSettings;
  periodLabel: string;
  reportRef?: string;
  generatedBy?: string;
  generatedDate?: string;
  grossRevenue: number;
  operatingExpenses: number;
  staffLaborAllocations: number;
  vatOutputTax: number;
  netOperatingIncome: number;
  salesCount: number;
  expenses: ExpenseItemRecord[];
  categoryTotals: Record<string, number>;
}

export function getFinancialReportDocumentHtml(props: FinancialReportProps): string {
  const {
    settings,
    periodLabel,
    reportRef = "REP-FIN-" + new Date().toISOString().slice(0, 10).replace(/-/g, ""),
    generatedBy,
    generatedDate,
    grossRevenue,
    operatingExpenses,
    staffLaborAllocations,
    vatOutputTax,
    netOperatingIncome,
    salesCount,
    expenses,
    categoryTotals
  } = props;

  const kpiCards: ReportKpiCard[] = [
    {
      label: "Gross Sales Revenue",
      value: `₱${grossRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: `${salesCount} settled transactions`
    },
    {
      label: "Shop Overhead Expenses",
      value: `₱${operatingExpenses.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: `${expenses.length} operating disbursements`
    },
    {
      label: "Staff Labor Commission",
      value: `₱${staffLaborAllocations.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: "Mechanic service compensation"
    },
    {
      label: "Net Operating Margin",
      value: `₱${netOperatingIncome.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: `BIR VAT Output: ₱${vatOutputTax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
  ];

  // 1. Category Totals Table HTML
  const categoryRowsHtml = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, total]) => {
      const pct = operatingExpenses > 0 ? ((total / operatingExpenses) * 100).toFixed(1) : "0.0";
      return `
        <tr style="background-color: #ffffff;">
          <td style="font-weight: 600; color: #09090b; padding: 4px 6px; border: 1px solid #e4e4e7;">
            ${cat.replace(/_/g, " ")}
          </td>
          <td style="text-align: right; font-family: monospace; color: #09090b; padding: 4px 6px; border: 1px solid #e4e4e7;">
            ${pct}%
          </td>
          <td style="text-align: right; font-family: monospace; font-weight: 700; color: #09090b; padding: 4px 6px; border: 1px solid #e4e4e7;">
            ₱${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
        </tr>
      `;
    })
    .join("");

  // 2. Expense Ledger Rows HTML
  const expenseRowsHtml =
    expenses.length === 0
      ? `
        <tr style="background-color: #ffffff;">
          <td colspan="5" style="text-align: center; color: #71717a; padding: 12px; border: 1px solid #e4e4e7;">
            No operating expenses recorded for this reporting period.
          </td>
        </tr>
      `
      : expenses
          .map(
            (exp, idx) => `
        <tr style="background-color: #ffffff;">
          <td style="text-align: center; font-family: monospace; font-size: 8pt; color: #09090b; padding: 4px 6px; border: 1px solid #e4e4e7;">${idx + 1}</td>
          <td style="font-family: monospace; font-size: 8pt; color: #52525b; padding: 4px 6px; border: 1px solid #e4e4e7;">${exp.date || "—"}</td>
          <td style="font-weight: 600; color: #09090b; padding: 4px 6px; border: 1px solid #e4e4e7;">
            ${exp.description}
            <span style="display: block; font-size: 7pt; color: #71717a;">${exp.category.replace(/_/g, " ")} ${exp.vendor ? `• Vendor: ${exp.vendor}` : ""}</span>
          </td>
          <td style="font-family: monospace; font-size: 8pt; color: #52525b; padding: 4px 6px; border: 1px solid #e4e4e7;">${exp.reference_no || "N/A"}</td>
          <td style="text-align: right; font-family: monospace; font-weight: 700; color: #09090b; padding: 4px 6px; border: 1px solid #e4e4e7;">
            ₱${Number(exp.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
        </tr>
      `
          )
          .join("");

  const contentHtml = `
    <!-- Financial Executive Breakdown -->
    <div style="margin-bottom: 12px;">
      <h3 style="font-size: 9pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #09090b; margin-bottom: 4px;">
        1. Operating Expense Distribution by Category
      </h3>
      <table style="width: 100%; border-collapse: collapse; background: #ffffff;">
        <thead>
          <tr style="background-color: #f4f4f5;">
            <th style="text-align: left; padding: 4px 6px; border: 1px solid #e4e4e7; font-size: 8pt; color: #09090b;">Expense Classification</th>
            <th style="text-align: right; padding: 4px 6px; border: 1px solid #e4e4e7; font-size: 8pt; color: #09090b; width: 15%;">Share (%)</th>
            <th style="text-align: right; padding: 4px 6px; border: 1px solid #e4e4e7; font-size: 8pt; color: #09090b; width: 25%;">Disbursed Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${categoryRowsHtml}
          <tr style="background-color: #f4f4f5; font-weight: 800;">
            <td colspan="2" style="text-align: right; padding: 4px 6px; border: 1px solid #e4e4e7; font-size: 8.5pt; color: #09090b;">
              TOTAL OVERHEAD EXPENSES:
            </td>
            <td style="text-align: right; font-family: monospace; font-size: 9pt; padding: 4px 6px; border: 1px solid #e4e4e7; color: #09090b;">
              ₱${operatingExpenses.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Itemized Disbursements Ledger -->
    <div style="margin-top: 14px;">
      <h3 style="font-size: 9pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #09090b; margin-bottom: 4px;">
        2. Itemized Disbursements Ledger
      </h3>
      <table style="width: 100%; border-collapse: collapse; background: #ffffff;">
        <thead>
          <tr style="background-color: #f4f4f5;">
            <th style="text-align: center; padding: 4px 6px; border: 1px solid #e4e4e7; font-size: 8pt; color: #09090b; width: 5%;">#</th>
            <th style="text-align: left; padding: 4px 6px; border: 1px solid #e4e4e7; font-size: 8pt; color: #09090b; width: 12%;">Date</th>
            <th style="text-align: left; padding: 4px 6px; border: 1px solid #e4e4e7; font-size: 8pt; color: #09090b;">Description & Vendor</th>
            <th style="text-align: left; padding: 4px 6px; border: 1px solid #e4e4e7; font-size: 8pt; color: #09090b; width: 15%;">Ref / OR #</th>
            <th style="text-align: right; padding: 4px 6px; border: 1px solid #e4e4e7; font-size: 8pt; color: #09090b; width: 18%;">Amount (PHP)</th>
          </tr>
        </thead>
        <tbody>
          ${expenseRowsHtml}
        </tbody>
      </table>
    </div>
  `;

  return generateReportShellHtml({
    settings,
    reportTitle: "Shop Financial Ledger & Income Statement",
    subtitle: "Consolidated Revenue, Operating Disbursements, and Net Margin Analysis",
    periodLabel,
    reportRef,
    generatedBy,
    generatedDate,
    kpiCards,
    contentHtml
  });
}

export function PrintableFinancialReportDocument(props: FinancialReportProps) {
  const {
    settings,
    periodLabel,
    reportRef = "REP-FIN-" + new Date().toISOString().slice(0, 10).replace(/-/g, ""),
    generatedBy,
    generatedDate,
    grossRevenue,
    operatingExpenses,
    staffLaborAllocations,
    vatOutputTax,
    netOperatingIncome,
    salesCount,
    expenses,
    categoryTotals
  } = props;

  const kpiCards: ReportKpiCard[] = [
    {
      label: "Gross Sales Revenue",
      value: `₱${grossRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: `${salesCount} settled transactions`
    },
    {
      label: "Shop Overhead Expenses",
      value: `₱${operatingExpenses.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: `${expenses.length} operating disbursements`
    },
    {
      label: "Staff Labor Commission",
      value: `₱${staffLaborAllocations.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: "Mechanic service compensation"
    },
    {
      label: "Net Operating Margin",
      value: `₱${netOperatingIncome.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: `BIR VAT Output: ₱${vatOutputTax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
  ];

  return (
    <PrintableReportLayout
      settings={settings}
      reportTitle="Shop Financial Ledger & Income Statement"
      subtitle="Consolidated Revenue, Operating Disbursements, and Net Margin Analysis"
      periodLabel={periodLabel}
      reportRef={reportRef}
      generatedBy={generatedBy}
      generatedDate={generatedDate}
      kpiCards={kpiCards}
    >
      <div className="space-y-4">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-wider text-zinc-950 mb-1">
            1. Operating Expense Distribution by Category
          </h3>
          <table className="w-full border-collapse border border-zinc-200 text-[9px]">
            <thead>
              <tr className="bg-zinc-100">
                <th className="text-left p-1 border border-zinc-200 text-zinc-950 font-bold">
                  Expense Classification
                </th>
                <th className="text-right p-1 border border-zinc-200 text-zinc-950 font-bold w-1/6">
                  Share (%)
                </th>
                <th className="text-right p-1 border border-zinc-200 text-zinc-950 font-bold w-1/4">
                  Disbursed Subtotal
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(categoryTotals).map(([cat, total]) => {
                const pct =
                  operatingExpenses > 0
                    ? ((total / operatingExpenses) * 100).toFixed(1)
                    : "0.0";
                return (
                  <tr key={cat} className="bg-white">
                    <td className="p-1 border border-zinc-200 text-zinc-900 font-medium">
                      {cat.replace(/_/g, " ")}
                    </td>
                    <td className="p-1 border border-zinc-200 text-zinc-900 text-right font-mono">
                      {pct}%
                    </td>
                    <td className="p-1 border border-zinc-200 text-zinc-900 text-right font-mono font-bold">
                      ₱{total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-zinc-100 font-bold">
                <td colSpan={2} className="p-1 border border-zinc-200 text-right text-zinc-950">
                  TOTAL OVERHEAD EXPENSES:
                </td>
                <td className="p-1 border border-zinc-200 text-right font-mono text-zinc-950">
                  ₱{operatingExpenses.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="text-[10px] font-black uppercase tracking-wider text-zinc-950 mb-1">
            2. Itemized Disbursements Ledger
          </h3>
          <table className="w-full border-collapse border border-zinc-200 text-[9px]">
            <thead>
              <tr className="bg-zinc-100">
                <th className="text-center p-1 border border-zinc-200 text-zinc-950 font-bold w-8">#</th>
                <th className="text-left p-1 border border-zinc-200 text-zinc-950 font-bold w-20">Date</th>
                <th className="text-left p-1 border border-zinc-200 text-zinc-950 font-bold">Description & Vendor</th>
                <th className="text-left p-1 border border-zinc-200 text-zinc-950 font-bold w-24">Ref / OR #</th>
                <th className="text-right p-1 border border-zinc-200 text-zinc-950 font-bold w-28">Amount (PHP)</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-3 text-center text-zinc-500 border border-zinc-200">
                    No operating expenses recorded for this reporting period.
                  </td>
                </tr>
              ) : (
                expenses.map((exp, idx) => (
                  <tr key={exp.id || idx} className="bg-white">
                    <td className="p-1 border border-zinc-200 text-center font-mono text-zinc-600">{idx + 1}</td>
                    <td className="p-1 border border-zinc-200 font-mono text-zinc-600">{exp.date}</td>
                    <td className="p-1 border border-zinc-200 text-zinc-900 font-medium">
                      {exp.description}
                      <span className="block text-[8px] text-zinc-500">
                        {exp.category.replace(/_/g, " ")} {exp.vendor ? `• Vendor: ${exp.vendor}` : ""}
                      </span>
                    </td>
                    <td className="p-1 border border-zinc-200 font-mono text-zinc-600">{exp.reference_no || "N/A"}</td>
                    <td className="p-1 border border-zinc-200 text-right font-mono font-bold text-zinc-950">
                      ₱{Number(exp.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PrintableReportLayout>
  );
}
