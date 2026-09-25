import React from "react";
import { SystemSettings } from "@/lib/settings";

export interface PrintablePayslipProps {
  payslipNo: string;
  name: string;
  role: "Mechanic" | "Cashier" | string;
  payPeriod: string;
  issuedDate: string;
  status: "PENDING" | "DISBURSED" | string;
  itemsProcessed: number;
  laborTotal?: number;
  commissionRate?: number;
  commissionEarned?: number;
  baseWage?: number;
  totalPayout: number;
  settings: SystemSettings;
}

/**
 * Returns raw HTML string for iframe printing sandbox.
 */
export function getPrintablePayslipHtml(props: PrintablePayslipProps): string {
  const {
    payslipNo,
    name,
    role,
    payPeriod,
    issuedDate,
    status,
    itemsProcessed,
    laborTotal,
    commissionRate,
    commissionEarned,
    baseWage,
    totalPayout,
    settings,
  } = props;

  const brandName = settings.appName || "Versiklo";
  const shopDesc = settings.shopDescription === "Shop Floor" ? "MOTORCYCLE PARTS & SERVICES" : (settings.shopDescription || "Motorcycle Parts & Services");
  const shopAddr = settings.shopAddress || "123 Rizal Ave, Brgy. San Antonio, Pasig City, Metro Manila";
  const shopTin = settings.shopTin || "442-891-003-000 Non-VAT";
  const contactPhone = settings.contactPhone || "+63 (02) 8123-4567";
  const contactEmail = settings.contactEmail || "compliance@versiklo.ph";

  const isMechanic = role.toLowerCase().includes("mechanic");

  const tableBodyHtml = isMechanic
    ? `
      <tr style="background-color: #ffffff;">
        <td style="font-weight: 500; background-color: #ffffff; color: #09090b; border: 1px solid #e4e4e7; padding: 4px 6px;">
          Workshop Repair Labor Commission
          <span style="display: block; font-size: 7pt; color: #71717a;">Mechanic labor commission entitlement</span>
        </td>
        <td style="text-align: center; font-family: monospace; background-color: #ffffff; color: #09090b; border: 1px solid #e4e4e7; padding: 4px 6px;">${itemsProcessed} orders</td>
        <td style="text-align: right; font-family: monospace; background-color: #ffffff; color: #09090b; border: 1px solid #e4e4e7; padding: 4px 6px;">₱${Number(laborTotal || 0).toFixed(2)}</td>
        <td style="text-align: center; font-family: monospace; font-weight: 700; background-color: #ffffff; color: #09090b; border: 1px solid #e4e4e7; padding: 4px 6px;">${commissionRate}%</td>
        <td style="text-align: right; font-family: monospace; font-weight: 700; background-color: #ffffff; color: #09090b; border: 1px solid #e4e4e7; padding: 4px 6px;">₱${Number(totalPayout || 0).toFixed(2)}</td>
      </tr>
    `
    : `
      <tr style="background-color: #ffffff;">
        <td style="font-weight: 500; background-color: #ffffff; color: #09090b; border: 1px solid #e4e4e7; padding: 4px 6px;">
          Frontline Cashier Wage & POS Operations
          <span style="display: block; font-size: 7pt; color: #71717a;">Daily wage base + shift transactions</span>
        </td>
        <td style="text-align: center; font-family: monospace; background-color: #ffffff; color: #09090b; border: 1px solid #e4e4e7; padding: 4px 6px;">${itemsProcessed} tickets</td>
        <td style="text-align: right; font-family: monospace; background-color: #ffffff; color: #09090b; border: 1px solid #e4e4e7; padding: 4px 6px;">₱${Number(baseWage || 0).toFixed(2)}/day</td>
        <td style="text-align: center; font-family: monospace; background-color: #ffffff; color: #09090b; border: 1px solid #e4e4e7; padding: 4px 6px;">100% Base</td>
        <td style="text-align: right; font-family: monospace; font-weight: 700; background-color: #ffffff; color: #09090b; border: 1px solid #e4e4e7; padding: 4px 6px;">₱${Number(totalPayout || 0).toFixed(2)}</td>
      </tr>
    `;

  return `
    <div style="padding: 10px; max-width: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #09090b; background: #ffffff;">
      <!-- 1. Header & Letterhead -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 8px; border-bottom: 1px solid #e4e4e7;">
        <div>
          <h1 style="font-size: 15pt; font-weight: 900; text-transform: uppercase; margin: 0; letter-spacing: -0.5px;">
            ${brandName} ${shopDesc}
          </h1>
          <p style="font-size: 8pt; color: #52525b; margin: 1px 0;">${shopAddr}</p>
          <p style="font-size: 7.5pt; color: #71717a; font-family: monospace; margin: 1px 0;">
            BIR Registered TIN: <strong>${shopTin}</strong>
          </p>
          <p style="font-size: 7.5pt; color: #71717a; font-family: monospace; margin: 1px 0;">
            Tel: ${contactPhone} • Email: ${contactEmail}
          </p>
        </div>
        <div style="text-align: right;">
          <span style="font-size: 7.5pt; font-weight: 700; text-transform: uppercase; color: #71717a; display: block;">Official Staff Payslip</span>
          <span style="font-size: 14pt; font-weight: 900; font-family: monospace; display: block; margin: 1px 0;">${payslipNo}</span>
          <div style="font-size: 8pt; font-family: monospace; color: #52525b;">Period: <strong>${payPeriod}</strong></div>
          <div style="font-size: 7.5pt; font-family: monospace; color: #71717a;">Issued: ${issuedDate}</div>
          <div style="margin-top: 3px;">
            <span class="print-pill">STATUS: ${status}</span>
          </div>
        </div>
      </div>

      <!-- 2. Staff Profile Metadata -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; padding: 8px 0; border-bottom: 1px solid #e4e4e7; font-size: 8.5pt;">
        <div>
          <span style="font-size: 7pt; font-weight: 700; text-transform: uppercase; color: #71717a; display: block; margin-bottom: 2px;">Employee Details</span>
          <p style="font-weight: 700; margin: 0; font-size: 9pt;">${name}</p>
          <p style="font-size: 8pt; color: #52525b; margin: 1px 0;">Role: ${role} Technician / Staff</p>
        </div>
        <div>
          <span style="font-size: 7pt; font-weight: 700; text-transform: uppercase; color: #71717a; display: block; margin-bottom: 2px;">Settlement Details</span>
          <p style="font-weight: 700; margin: 0; font-size: 8.5pt; font-family: monospace;">${payPeriod}</p>
          <p style="font-size: 8pt; color: #52525b; margin: 1px 0;">Voucher: ${payslipNo}</p>
        </div>
        <div>
          <span style="font-size: 7pt; font-weight: 700; text-transform: uppercase; color: #71717a; display: block; margin-bottom: 2px;">Authorization</span>
          <p style="margin: 0; font-size: 8pt;"><span style="color: #71717a;">Disbursed By:</span> <strong>Shop Manager / Admin</strong></p>
          <p style="margin: 1px 0; font-size: 8pt;"><span style="color: #71717a;">Date Issued:</span> <strong>${issuedDate}</strong></p>
        </div>
      </div>

      <!-- 3. Compensation Breakdown Table -->
      <style>
        .printable-doc-table { border-collapse: collapse !important; width: 100% !important; background-color: #ffffff !important; background: #ffffff !important; }
        .printable-doc-table th { background-color: #f4f4f5 !important; background: #f4f4f5 !important; color: #09090b !important; border: 1px solid #e4e4e7 !important; padding: 4px 6px !important; font-size: 8.5pt !important; font-weight: 700 !important; }
        .printable-doc-table td { background-color: #ffffff !important; background: #ffffff !important; color: #09090b !important; border: 1px solid #e4e4e7 !important; padding: 4px 6px !important; font-size: 8.5pt !important; }
        .printable-doc-table tr { background-color: #ffffff !important; background: #ffffff !important; }
      </style>
      <div style="margin-top: 8px;">
        <span style="font-size: 7.5pt; font-weight: 700; text-transform: uppercase; color: #71717a; display: block; margin-bottom: 3px;">
          Compensation Breakdown & Earnings Ledger
        </span>
        <table class="printable-doc-table" style="border-collapse: collapse; width: 100%; background: #ffffff;">
          <thead>
            <tr>
              <th style="text-align: left; background-color: #f4f4f5; color: #09090b; border: 1px solid #e4e4e7; padding: 4px 6px;">Earning Description / Activity</th>
              <th style="width: 75px; text-align: center; background-color: #f4f4f5; color: #09090b; border: 1px solid #e4e4e7; padding: 4px 6px;">Volume / Shifts</th>
              <th style="width: 85px; text-align: right; background-color: #f4f4f5; color: #09090b; border: 1px solid #e4e4e7; padding: 4px 6px;">Base / Billed</th>
              <th style="width: 65px; text-align: center; background-color: #f4f4f5; color: #09090b; border: 1px solid #e4e4e7; padding: 4px 6px;">Rate / Share</th>
              <th style="width: 85px; text-align: right; background-color: #f4f4f5; color: #09090b; border: 1px solid #e4e4e7; padding: 4px 6px;">Payout Amount</th>
            </tr>
          </thead>
          <tbody>
            ${tableBodyHtml}
          </tbody>
        </table>
      </div>

      <!-- 4. Net Payout Banner -->
      <div style="margin-top: 8px; padding: 6px 10px; border: 1px solid #e4e4e7; background: #fafafa; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 8.5pt; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">Net Compensation Payable:</span>
        <span style="font-size: 13pt; font-weight: 900; font-family: monospace;">₱${Number(totalPayout || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>

      <!-- 5. Statutory Terms -->
      <div style="margin-top: 8px; padding: 5px 0; border-top: 1px solid #e4e4e7; border-bottom: 1px solid #e4e4e7; font-size: 7pt; color: #52525b; line-height: 1.3;">
        <p style="font-weight: 700; color: #09090b; margin-bottom: 2px;">Disbursement Terms & Statutory Compliance</p>
        <p>• Official compensation statement issued in accordance with Philippine Labor Standards and Bureau of Internal Revenue (BIR) regulations.</p>
        <p>• Net disbursement has been credited and settled in accordance with shop payroll records and agreed commission schedule.</p>
      </div>

      <!-- 6. Dual Physical Signatures -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 14px; font-size: 8pt;">
        <div style="text-align: center;">
          <div style="border-bottom: 1px solid #71717a; height: 18px; margin: 0 auto 4px auto; width: 75%;"></div>
          <p style="font-weight: 700; margin: 0; font-size: 8pt;">Approved & Disbursed By</p>
          <p style="font-size: 7pt; color: #71717a; margin: 0;">Shop Manager / Admin</p>
        </div>
        <div style="text-align: center;">
          <div style="border-bottom: 1px solid #71717a; height: 18px; margin: 0 auto 4px auto; width: 75%;"></div>
          <p style="font-weight: 700; margin: 0; font-size: 8pt;">Received in Full By</p>
          <p style="font-size: 7pt; color: #71717a; margin: 0;">Employee Signature & Date</p>
        </div>
      </div>

      <!-- 7. Audit Footnote -->
      <div style="margin-top: 8px; padding-top: 4px; text-align: center; font-size: 7pt; color: #71717a; border-top: 1px solid #f4f4f5;">
        <p>Certified Official Compensation Voucher • Generated: ${new Date().toLocaleString()}</p>
        <p style="font-family: monospace;">Reference ID: ${payslipNo} • Official Record • ${brandName} Operations</p>
      </div>
    </div>
  `;
}

/**
 * Dedicated Printable Document Component (React Component for native print support).
 */
export function PrintablePayslipDocument(props: PrintablePayslipProps) {
  const htmlContent = getPrintablePayslipHtml(props);
  return (
    <div 
      data-printable-document="true"
      className="printable-payslip-document bg-white text-zinc-950 w-full"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
