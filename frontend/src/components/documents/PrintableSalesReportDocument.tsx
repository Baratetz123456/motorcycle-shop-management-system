import React from "react";
import { SystemSettings } from "@/lib/settings";
import {
  generateReportShellHtml,
  PrintableReportLayout,
  ReportKpiCard
} from "./PrintableReportLayout";

export interface SalesReportTransaction {
  id?: string;
  invoice_no: string;
  customer_name?: string;
  motorcycle_name?: string;
  created_at: string;
  payment_method: string;
  subtotal: number;
  total: number;
  status: string;
}

export interface SalesReportProps {
  settings: SystemSettings;
  periodLabel: string;
  reportRef?: string;
  generatedBy?: string;
  generatedDate?: string;
  totalSales: number;
  totalVatable: number;
  totalVat: number;
  transactionCount: number;
  paymentBreakdown: Record<string, { count: number; total: number }>;
  transactions: SalesReportTransaction[];
}

export function getSalesReportDocumentHtml(props: SalesReportProps): string {
  const {
    settings,
    periodLabel,
    reportRef = "REP-SALES-" + new Date().toISOString().slice(0, 10).replace(/-/g, ""),
    generatedBy,
    generatedDate,
    totalSales,
    totalVatable,
    totalVat,
    transactionCount,
    paymentBreakdown,
    transactions
  } = props;

  const cashSettled = paymentBreakdown["CASH"]?.total || 0;
  const digitalSettled = totalSales - cashSettled;

  const kpiCards: ReportKpiCard[] = [
    {
      label: "Gross Settled Sales",
      value: `₱${totalSales.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: `${transactionCount} validated invoices`
    },
    {
      label: "Cash Collections",
      value: `₱${cashSettled.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: `${paymentBreakdown["CASH"]?.count || 0} cash receipts`
    },
    {
      label: "Digital / Electronic Pay",
      value: `₱${digitalSettled.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: "GCash, Maya, Bank Transfer"
    },
    {
      label: "BIR 12% Output VAT",
      value: `₱${totalVat.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: `Net Vatable: ₱${totalVatable.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
  ];

  // Payment Breakdown Table Rows
  const paymentRowsHtml = Object.entries(paymentBreakdown)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([method, data]) => {
      const share = totalSales > 0 ? ((data.total / totalSales) * 100).toFixed(1) : "0.0";
      return `
        <tr style="background-color: #ffffff;">
          <td style="font-weight: 600; color: #09090b; padding: 4px 6px; border: 1px solid #e4e4e7;">
            ${method.toUpperCase()}
          </td>
          <td style="text-align: center; font-family: monospace; color: #09090b; padding: 4px 6px; border: 1px solid #e4e4e7;">
            ${data.count}
          </td>
          <td style="text-align: right; font-family: monospace; color: #09090b; padding: 4px 6px; border: 1px solid #e4e4e7;">
            ${share}%
          </td>
          <td style="text-align: right; font-family: monospace; font-weight: 700; color: #09090b; padding: 4px 6px; border: 1px solid #e4e4e7;">
            ₱${data.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
        </tr>
      `;
    })
    .join("");

  // Transactions Audit Rows
  const txRowsHtml =
    transactions.length === 0
      ? `
        <tr style="background-color: #ffffff;">
          <td colspan="6" style="text-align: center; color: #71717a; padding: 12px; border: 1px solid #e4e4e7;">
            No transactions found for this reporting interval.
          </td>
        </tr>
      `
      : transactions
          .slice(0, 50)
          .map(
            (tx, idx) => `
        <tr style="background-color: #ffffff;">
          <td style="text-align: center; font-family: monospace; font-size: 8pt; color: #09090b; padding: 4px 6px; border: 1px solid #e4e4e7;">${idx + 1}</td>
          <td style="font-family: monospace; font-weight: 700; font-size: 8pt; color: #09090b; padding: 4px 6px; border: 1px solid #e4e4e7;">${tx.invoice_no}</td>
          <td style="font-size: 8pt; color: #09090b; padding: 4px 6px; border: 1px solid #e4e4e7;">
            ${tx.customer_name || "Walk-in Customer"}
            ${tx.motorcycle_name ? `<span style="display: block; font-size: 7pt; color: #71717a;">${tx.motorcycle_name}</span>` : ""}
          </td>
          <td style="text-align: center; font-family: monospace; font-size: 7.5pt; color: #52525b; padding: 4px 6px; border: 1px solid #e4e4e7;">
            <span class="print-pill">${tx.payment_method || "CASH"}</span>
          </td>
          <td style="font-family: monospace; font-size: 7.5pt; color: #52525b; padding: 4px 6px; border: 1px solid #e4e4e7;">
            ${tx.created_at ? new Date(tx.created_at).toLocaleDateString() : "—"}
          </td>
          <td style="text-align: right; font-family: monospace; font-weight: 700; color: #09090b; padding: 4px 6px; border: 1px solid #e4e4e7;">
            ₱${Number(tx.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
        </tr>
      `
          )
          .join("");

  const contentHtml = `
    <!-- Payment Breakdown Summary -->
    <div style="margin-bottom: 12px;">
      <h3 style="font-size: 9pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #09090b; margin-bottom: 4px;">
        1. Tender & Settlement Summary
      </h3>
      <table style="width: 100%; border-collapse: collapse; background: #ffffff;">
        <thead>
          <tr style="background-color: #f4f4f5;">
            <th style="text-align: left; padding: 4px 6px; border: 1px solid #e4e4e7; font-size: 8pt; color: #09090b;">Payment Method</th>
            <th style="text-align: center; padding: 4px 6px; border: 1px solid #e4e4e7; font-size: 8pt; color: #09090b; width: 15%;">Tx Count</th>
            <th style="text-align: right; padding: 4px 6px; border: 1px solid #e4e4e7; font-size: 8pt; color: #09090b; width: 15%;">Volume (%)</th>
            <th style="text-align: right; padding: 4px 6px; border: 1px solid #e4e4e7; font-size: 8pt; color: #09090b; width: 25%;">Settled Amount</th>
          </tr>
        </thead>
        <tbody>
          ${paymentRowsHtml}
          <tr style="background-color: #f4f4f5; font-weight: 800;">
            <td style="text-align: left; padding: 4px 6px; border: 1px solid #e4e4e7; font-size: 8.5pt; color: #09090b;">
              TOTAL SETTLED SALES:
            </td>
            <td style="text-align: center; font-family: monospace; font-size: 8.5pt; padding: 4px 6px; border: 1px solid #e4e4e7; color: #09090b;">
              ${transactionCount}
            </td>
            <td style="text-align: right; font-family: monospace; font-size: 8.5pt; padding: 4px 6px; border: 1px solid #e4e4e7; color: #09090b;">
              100.0%
            </td>
            <td style="text-align: right; font-family: monospace; font-size: 9pt; padding: 4px 6px; border: 1px solid #e4e4e7; color: #09090b;">
              ₱${totalSales.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Settled Transactions Audit Table -->
    <div style="margin-top: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 4px;">
        <h3 style="font-size: 9pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #09090b; margin: 0;">
          2. Settled Commercial Invoices Audit Log
        </h3>
        <span style="font-size: 7pt; color: #71717a; font-family: monospace;">
          Showing ${Math.min(transactions.length, 50)} of ${transactions.length} records
        </span>
      </div>
      <table style="width: 100%; border-collapse: collapse; background: #ffffff;">
        <thead>
          <tr style="background-color: #f4f4f5;">
            <th style="text-align: center; padding: 4px 6px; border: 1px solid #e4e4e7; font-size: 8pt; color: #09090b; width: 5%;">#</th>
            <th style="text-align: left; padding: 4px 6px; border: 1px solid #e4e4e7; font-size: 8pt; color: #09090b; width: 18%;">Invoice #</th>
            <th style="text-align: left; padding: 4px 6px; border: 1px solid #e4e4e7; font-size: 8pt; color: #09090b;">Customer & Motorcycle</th>
            <th style="text-align: center; padding: 4px 6px; border: 1px solid #e4e4e7; font-size: 8pt; color: #09090b; width: 14%;">Tender</th>
            <th style="text-align: left; padding: 4px 6px; border: 1px solid #e4e4e7; font-size: 8pt; color: #09090b; width: 14%;">Settlement Date</th>
            <th style="text-align: right; padding: 4px 6px; border: 1px solid #e4e4e7; font-size: 8pt; color: #09090b; width: 18%;">Grand Total (PHP)</th>
          </tr>
        </thead>
        <tbody>
          ${txRowsHtml}
        </tbody>
      </table>
    </div>
  `;

  return generateReportShellHtml({
    settings,
    reportTitle: "Sales Performance & End-of-Day Audit Report",
    subtitle: "Official Register of Point-of-Sale Transactions and Payment Tenders",
    periodLabel,
    reportRef,
    generatedBy,
    generatedDate,
    kpiCards,
    contentHtml,
    preparedByLabel: "Prepared By (Lead Cashier)",
    reviewedByLabel: "Audited By (Store Supervisor)",
    approvedByLabel: "Approved By (Operations Manager)"
  });
}

export function PrintableSalesReportDocument(props: SalesReportProps) {
  const {
    settings,
    periodLabel,
    reportRef = "REP-SALES-" + new Date().toISOString().slice(0, 10).replace(/-/g, ""),
    generatedBy,
    generatedDate,
    totalSales,
    totalVatable,
    totalVat,
    transactionCount,
    paymentBreakdown,
    transactions
  } = props;

  const cashSettled = paymentBreakdown["CASH"]?.total || 0;
  const digitalSettled = totalSales - cashSettled;

  const kpiCards: ReportKpiCard[] = [
    {
      label: "Gross Settled Sales",
      value: `₱${totalSales.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: `${transactionCount} validated invoices`
    },
    {
      label: "Cash Collections",
      value: `₱${cashSettled.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: `${paymentBreakdown["CASH"]?.count || 0} cash receipts`
    },
    {
      label: "Digital / Electronic Pay",
      value: `₱${digitalSettled.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: "GCash, Maya, Bank Transfer"
    },
    {
      label: "BIR 12% Output VAT",
      value: `₱${totalVat.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: `Net Vatable: ₱${totalVatable.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
  ];

  return (
    <PrintableReportLayout
      settings={settings}
      reportTitle="Sales Performance & End-of-Day Audit Report"
      subtitle="Official Register of Point-of-Sale Transactions and Payment Tenders"
      periodLabel={periodLabel}
      reportRef={reportRef}
      generatedBy={generatedBy}
      generatedDate={generatedDate}
      kpiCards={kpiCards}
      preparedByLabel="Prepared By (Lead Cashier)"
      reviewedByLabel="Audited By (Store Supervisor)"
      approvedByLabel="Approved By (Operations Manager)"
    >
      <div className="space-y-4">
        {/* Payment Breakdown */}
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-wider text-zinc-950 mb-1">
            1. Tender & Settlement Summary
          </h3>
          <table className="w-full border-collapse border border-zinc-200 text-[9px]">
            <thead>
              <tr className="bg-zinc-100">
                <th className="text-left p-1 border border-zinc-200 text-zinc-950 font-bold">
                  Payment Method
                </th>
                <th className="text-center p-1 border border-zinc-200 text-zinc-950 font-bold w-1/6">
                  Tx Count
                </th>
                <th className="text-right p-1 border border-zinc-200 text-zinc-950 font-bold w-1/6">
                  Volume (%)
                </th>
                <th className="text-right p-1 border border-zinc-200 text-zinc-950 font-bold w-1/4">
                  Settled Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(paymentBreakdown).map(([method, data]) => {
                const share =
                  totalSales > 0 ? ((data.total / totalSales) * 100).toFixed(1) : "0.0";
                return (
                  <tr key={method} className="bg-white">
                    <td className="p-1 border border-zinc-200 font-medium text-zinc-900">
                      {method.toUpperCase()}
                    </td>
                    <td className="p-1 border border-zinc-200 text-center font-mono text-zinc-900">
                      {data.count}
                    </td>
                    <td className="p-1 border border-zinc-200 text-right font-mono text-zinc-900">
                      {share}%
                    </td>
                    <td className="p-1 border border-zinc-200 text-right font-mono font-bold text-zinc-950">
                      ₱{data.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-zinc-100 font-bold">
                <td className="p-1 border border-zinc-200 text-zinc-950">
                  TOTAL SETTLED SALES:
                </td>
                <td className="p-1 border border-zinc-200 text-center font-mono text-zinc-950">
                  {transactionCount}
                </td>
                <td className="p-1 border border-zinc-200 text-right font-mono text-zinc-950">
                  100.0%
                </td>
                <td className="p-1 border border-zinc-200 text-right font-mono text-zinc-950">
                  ₱{totalSales.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Transactions Table */}
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-zinc-950">
              2. Settled Commercial Invoices Audit Log
            </h3>
            <span className="text-[8px] text-zinc-500 font-mono">
              Showing {Math.min(transactions.length, 50)} of {transactions.length} records
            </span>
          </div>
          <table className="w-full border-collapse border border-zinc-200 text-[9px]">
            <thead>
              <tr className="bg-zinc-100">
                <th className="text-center p-1 border border-zinc-200 text-zinc-950 font-bold w-8">#</th>
                <th className="text-left p-1 border border-zinc-200 text-zinc-950 font-bold w-24">Invoice #</th>
                <th className="text-left p-1 border border-zinc-200 text-zinc-950 font-bold">Customer & Bike</th>
                <th className="text-center p-1 border border-zinc-200 text-zinc-950 font-bold w-16">Tender</th>
                <th className="text-left p-1 border border-zinc-200 text-zinc-950 font-bold w-20">Date</th>
                <th className="text-right p-1 border border-zinc-200 text-zinc-950 font-bold w-24">Total (PHP)</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-3 text-center text-zinc-500 border border-zinc-200">
                    No transactions found for this reporting interval.
                  </td>
                </tr>
              ) : (
                transactions.slice(0, 50).map((tx, idx) => (
                  <tr key={tx.invoice_no || idx} className="bg-white">
                    <td className="p-1 border border-zinc-200 text-center font-mono text-zinc-600">{idx + 1}</td>
                    <td className="p-1 border border-zinc-200 font-mono font-bold text-zinc-900">{tx.invoice_no}</td>
                    <td className="p-1 border border-zinc-200 text-zinc-900 font-medium">
                      {tx.customer_name || "Walk-in Customer"}
                      {tx.motorcycle_name && (
                        <span className="block text-[8px] text-zinc-500">{tx.motorcycle_name}</span>
                      )}
                    </td>
                    <td className="p-1 border border-zinc-200 text-center font-mono text-[8px] text-zinc-600">
                      {tx.payment_method || "CASH"}
                    </td>
                    <td className="p-1 border border-zinc-200 font-mono text-zinc-600">
                      {tx.created_at ? new Date(tx.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="p-1 border border-zinc-200 text-right font-mono font-bold text-zinc-950">
                      ₱{Number(tx.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
