import React from "react";
import { SystemSettings } from "@/lib/settings";

export interface InvoiceItem {
  name: string;
  qty: number;
  price: number;
  type?: "product" | "service" | string;
}

export interface PrintableInvoiceProps {
  invoiceNo: string;
  jobOrderNumber?: string;
  createdAt: string;
  status: "COMPLETED" | "VOIDED";
  customerName?: string;
  customerPhone?: string;
  motorcycleName?: string;
  plateNumber?: string;
  cashierName?: string;
  mechanicName?: string;
  paymentMethod?: string;
  items: InvoiceItem[];
  subtotal: number;
  discountPercentage?: number;
  discountAmount?: number;
  total: number;
  amountPaid: number;
  cashReceived?: number;
  cashChange?: number;
  laborAnalysis?: {
    mechanicName: string;
    grossLabor: number;
    commissionRate: number;
    commissionDeduction: number;
    netShopLabor: number;
  } | null;
  settings: SystemSettings;
}

/**
 * Returns raw HTML string for iframe printing sandbox.
 */
export function getInvoiceDocumentHtml(props: PrintableInvoiceProps): string {
  const {
    invoiceNo,
    jobOrderNumber,
    createdAt,
    status,
    customerName,
    customerPhone,
    motorcycleName,
    plateNumber,
    cashierName,
    mechanicName,
    paymentMethod,
    items,
    subtotal,
    discountPercentage,
    discountAmount,
    total,
    amountPaid,
    cashReceived,
    cashChange,
    laborAnalysis,
    settings,
  } = props;

  const vatableSales = total / 1.12;
  const vatAmount = total - vatableSales;
  const isCompleted = status === "COMPLETED";

  const brandName = settings.appName || "Versiklo";
  const shopDesc = settings.shopDescription === "Shop Floor" ? "MOTORCYCLE PARTS & SERVICES" : (settings.shopDescription || "Motorcycle Parts & Services");
  const shopAddr = settings.shopAddress || "123 Rizal Ave, Brgy. San Antonio, Pasig City, Metro Manila";
  const shopTin = settings.shopTin || "491-002-884-000 NV";
  const contactPhone = settings.contactPhone || "+63 (02) 8123-4567";
  const contactEmail = settings.contactEmail || "compliance@versiklo.ph";

  const rowsHtml = (items.length > 0 ? items : [{ name: "Repair Labor Charge", qty: 1, price: total }])
    .map((item, idx) => {
      const isService = (item.name || "").toLowerCase().includes("labor") || (item.name || "").toLowerCase().includes("service") || item.type === "service";
      const itemTotal = (item.qty * item.price).toFixed(2);
      return `
        <tr style="background-color: #ffffff;">
          <td style="text-align: center; font-family: monospace; font-size: 8.5pt; background-color: #ffffff; color: #09090b; border: 1px solid #e4e4e7; padding: 4px 6px;">${idx + 1}</td>
          <td style="font-weight: 500; background-color: #ffffff; color: #09090b; border: 1px solid #e4e4e7; padding: 4px 6px;">${item.name}</td>
          <td style="text-align: center; background-color: #ffffff; color: #09090b; border: 1px solid #e4e4e7; padding: 4px 6px;"><span class="print-pill">${isService ? "SERVICE" : "PART"}</span></td>
          <td style="text-align: center; font-family: monospace; background-color: #ffffff; color: #09090b; border: 1px solid #e4e4e7; padding: 4px 6px;">${item.qty}</td>
          <td style="text-align: right; font-family: monospace; background-color: #ffffff; color: #09090b; border: 1px solid #e4e4e7; padding: 4px 6px;">₱${item.price.toFixed(2)}</td>
          <td style="text-align: right; font-family: monospace; font-weight: 700; background-color: #ffffff; color: #09090b; border: 1px solid #e4e4e7; padding: 4px 6px;">₱${itemTotal}</td>
        </tr>
      `;
    })
    .join("");

  const laborCommissionHtml = laborAnalysis && laborAnalysis.grossLabor > 0
    ? `
      <div style="padding: 6px 8px; border: 1px solid #e4e4e7; margin-top: 6px; font-size: 8pt; background: #fafafa;">
        <div style="display: flex; justify-content: space-between; font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">
          <span>Workshop Labor Settlement</span>
          <span>Assigned: ${laborAnalysis.mechanicName} (@${laborAnalysis.commissionRate}% Commission)</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Gross Labor Billed: ₱${laborAnalysis.grossLabor.toFixed(2)}</span>
          <span>Mechanic Commission: -₱${laborAnalysis.commissionDeduction.toFixed(2)}</span>
          <span style="font-weight: 700;">Net Shop Retained: ₱${laborAnalysis.netShopLabor.toFixed(2)}</span>
        </div>
      </div>
    `
    : "";

  return `
    <div style="padding: 10px; max-width: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #09090b; background: #ffffff;">
      <!-- 1. Header & Letterhead -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 8px; border-bottom: 1px solid #e4e4e7;">
        <div>
          <h1 style="font-size: 16pt; font-weight: 900; text-transform: uppercase; margin: 0; letter-spacing: -0.5px;">${brandName}</h1>
          <p style="font-size: 8.5pt; font-weight: 600; margin: 1px 0;">${shopDesc}</p>
          <p style="font-size: 8pt; color: #52525b; margin: 1px 0;">${shopAddr}</p>
          <p style="font-size: 7.5pt; color: #71717a; font-family: monospace; margin: 1px 0;">
            Tel: ${contactPhone} • Email: ${contactEmail} • <strong>TIN: ${shopTin}</strong>
          </p>
        </div>
        <div style="text-align: right;">
          <span style="font-size: 7.5pt; font-weight: 700; text-transform: uppercase; color: #71717a; display: block;">Commercial Sales Invoice</span>
          <span style="font-size: 14pt; font-weight: 900; font-family: monospace; display: block; margin: 1px 0;">${invoiceNo}</span>
          <div style="font-size: 8pt; font-family: monospace; color: #52525b;">Linked JO: <strong>${jobOrderNumber || "Direct POS Sale"}</strong></div>
          <div style="font-size: 7.5pt; font-family: monospace; color: #71717a;">${new Date(createdAt).toLocaleString()}</div>
          <div style="margin-top: 3px;">
            <span class="print-pill">${isCompleted ? "STATUS: COMPLETED (PAID)" : "STATUS: VOIDED"}</span>
          </div>
        </div>
      </div>

      <!-- 2. Customer, Vehicle, and Staff Profile -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; padding: 8px 0; border-bottom: 1px solid #e4e4e7; font-size: 8.5pt;">
        <div>
          <span style="font-size: 7pt; font-weight: 700; text-transform: uppercase; color: #71717a; display: block; margin-bottom: 2px;">Customer Profile</span>
          <p style="font-weight: 700; margin: 0; font-size: 9pt;">${customerName || "Walk-in Customer"}</p>
          <p style="font-family: monospace; font-size: 8pt; color: #52525b; margin: 1px 0;">Phone: ${customerPhone || "N/A"}</p>
        </div>
        <div>
          <span style="font-size: 7pt; font-weight: 700; text-transform: uppercase; color: #71717a; display: block; margin-bottom: 2px;">Vehicle Profile</span>
          <p style="font-weight: 700; margin: 0; font-size: 9pt; font-family: monospace;">${motorcycleName || "General Motorcycle"}</p>
          <p style="font-family: monospace; font-size: 8pt; color: #52525b; margin: 1px 0;">Plate / VIN: ${plateNumber || "N/A"}</p>
        </div>
        <div>
          <span style="font-size: 7pt; font-weight: 700; text-transform: uppercase; color: #71717a; display: block; margin-bottom: 2px;">Staff & Settlement</span>
          <p style="margin: 0; font-size: 8pt;"><span style="color: #71717a;">Cashier:</span> <strong>${cashierName || "Authorized Staff"}</strong></p>
          <p style="margin: 1px 0; font-size: 8pt;"><span style="color: #71717a;">Mechanic:</span> <strong>${mechanicName || "N/A (Counter Sale)"}</strong></p>
          <p style="margin: 0; font-size: 8pt;"><span style="color: #71717a;">Payment:</span> <strong style="text-transform: uppercase;">${paymentMethod || "CASH"}</strong></p>
        </div>
      </div>

      <!-- 3. Itemized Items Table -->
      <style>
        .printable-doc-table { border-collapse: collapse !important; width: 100% !important; background-color: #ffffff !important; background: #ffffff !important; }
        .printable-doc-table th { background-color: #f4f4f5 !important; background: #f4f4f5 !important; color: #09090b !important; border: 1px solid #e4e4e7 !important; padding: 4px 6px !important; font-size: 8.5pt !important; font-weight: 700 !important; }
        .printable-doc-table td { background-color: #ffffff !important; background: #ffffff !important; color: #09090b !important; border: 1px solid #e4e4e7 !important; padding: 4px 6px !important; font-size: 8.5pt !important; }
        .printable-doc-table tr { background-color: #ffffff !important; background: #ffffff !important; }
      </style>
      <div style="margin-top: 8px;">
        <span style="font-size: 7.5pt; font-weight: 700; text-transform: uppercase; color: #71717a; display: block; margin-bottom: 3px;">
          Itemized Parts & Services (${items.length || 1})
        </span>
        <table class="printable-doc-table" style="border-collapse: collapse; width: 100%; background: #ffffff;">
          <thead>
            <tr>
              <th style="width: 32px; text-align: center; background-color: #f4f4f5; color: #09090b; border: 1px solid #e4e4e7; padding: 4px 6px;">#</th>
              <th style="text-align: left; background-color: #f4f4f5; color: #09090b; border: 1px solid #e4e4e7; padding: 4px 6px;">Description / Service</th>
              <th style="width: 70px; text-align: center; background-color: #f4f4f5; color: #09090b; border: 1px solid #e4e4e7; padding: 4px 6px;">Type</th>
              <th style="width: 45px; text-align: center; background-color: #f4f4f5; color: #09090b; border: 1px solid #e4e4e7; padding: 4px 6px;">Qty</th>
              <th style="width: 80px; text-align: right; background-color: #f4f4f5; color: #09090b; border: 1px solid #e4e4e7; padding: 4px 6px;">Unit Price</th>
              <th style="width: 85px; text-align: right; background-color: #f4f4f5; color: #09090b; border: 1px solid #e4e4e7; padding: 4px 6px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>

      <!-- 4. Tax & Financial Breakdown -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 8px; padding-top: 6px; border-top: 1px solid #e4e4e7; font-size: 8pt;">
        <!-- Left: Tax Breakdown -->
        <div style="color: #52525b;">
          <span style="font-size: 7pt; font-weight: 700; text-transform: uppercase; color: #71717a; display: block; margin-bottom: 3px;">BIR Tax Compliance (12% VAT)</span>
          <div style="display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid #f4f4f5;">
            <span>12% VATable Sales:</span>
            <span style="font-family: monospace; font-weight: 600; color: #09090b;">₱${vatableSales.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid #f4f4f5;">
            <span>12% Value Added Tax (VAT):</span>
            <span style="font-family: monospace; font-weight: 600; color: #09090b;">₱${vatAmount.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid #f4f4f5; color: #a1a1aa;">
            <span>VAT-Exempt Sales:</span>
            <span style="font-family: monospace;">₱0.00</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 2px 0; color: #a1a1aa;">
            <span>Zero-Rated Sales:</span>
            <span style="font-family: monospace;">₱0.00</span>
          </div>
        </div>

        <!-- Right: Financial Settlement -->
        <div style="color: #52525b;">
          <span style="font-size: 7pt; font-weight: 700; text-transform: uppercase; color: #71717a; display: block; margin-bottom: 3px;">Financial Settlement</span>
          <div style="display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid #f4f4f5;">
            <span>Gross Items Subtotal:</span>
            <span style="font-family: monospace; font-weight: 600; color: #09090b;">₱${subtotal.toFixed(2)}</span>
          </div>
          ${(discountPercentage || 0) > 0 ? `
            <div style="display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid #f4f4f5; color: #047857;">
              <span>Discount (${discountPercentage}%):</span>
              <span style="font-family: monospace; font-weight: 600;">-₱${(discountAmount || 0).toFixed(2)}</span>
            </div>
          ` : ""}
          <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 2px solid #e4e4e7; font-size: 9.5pt; font-weight: 700; color: #09090b;">
            <span>Net Total Due:</span>
            <span style="font-family: monospace; font-size: 11pt; font-weight: 900;">₱${total.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 2px 0; color: #09090b;">
            <span>Total Amount Paid:</span>
            <span style="font-family: monospace; font-weight: 700;">₱${amountPaid.toFixed(2)}</span>
          </div>
          ${paymentMethod === "CASH" ? `
            <div style="display: flex; justify-content: space-between; padding: 1px 0; font-size: 7.5pt; color: #71717a;">
              <span>Tendered: ₱${(cashReceived || amountPaid).toFixed(2)}</span>
              <span>Change: ₱${(cashChange || 0).toFixed(2)}</span>
            </div>
          ` : ""}
        </div>
      </div>

      <!-- 5. Workshop Labor Commission Settlement -->
      ${laborCommissionHtml}

      <!-- 6. Warranty Terms -->
      <div style="margin-top: 8px; padding: 5px 0; border-top: 1px solid #e4e4e7; border-bottom: 1px solid #e4e4e7; font-size: 7pt; color: #52525b; line-height: 1.3;">
        <p style="font-weight: 700; color: #09090b; margin-bottom: 2px;">Warranty Terms & Store Policy</p>
        <p>• <strong>30-Day Workmanship Warranty:</strong> Covers labor services performed by certified service technicians.</p>
        <p>• <strong>7-Day Parts Replacement:</strong> Valid for factory defective parts returned in original packaging with this receipt.</p>
        <p>• Issued under Philippine Bureau of Internal Revenue (BIR) regulations and Republic Act 10173 (Data Privacy Act of 2012).</p>
      </div>

      <!-- 7. Dual Physical Signatures -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 12px; font-size: 8pt;">
        <div style="text-align: center;">
          <div style="border-bottom: 1px solid #71717a; height: 18px; margin: 0 auto 4px auto; width: 75%;"></div>
          <p style="font-weight: 700; margin: 0; font-size: 8pt;">Customer Received By</p>
          <p style="font-size: 7pt; color: #71717a; margin: 0;">Signature over Printed Name</p>
        </div>
        <div style="text-align: center;">
          <div style="border-bottom: 1px solid #71717a; height: 18px; margin: 0 auto 4px auto; width: 75%;"></div>
          <p style="font-weight: 700; margin: 0; font-size: 8pt;">Authorized Cashier</p>
          <p style="font-size: 7pt; color: #71717a; margin: 0;">${cashierName || "Official Signatory"}</p>
        </div>
      </div>

      <!-- 8. Audit Footnote -->
      <div style="margin-top: 8px; padding-top: 4px; text-align: center; font-size: 7pt; color: #71717a; border-top: 1px solid #f4f4f5;">
        <p>Certified Official Commercial System Receipt • Generated: ${new Date().toLocaleString()}</p>
        <p style="font-family: monospace;">Official Record • ${brandName} Operations</p>
      </div>
    </div>
  `;
}

/**
 * Dedicated Printable Document Component (React Component for native print support).
 */
export function PrintableInvoiceDocument(props: PrintableInvoiceProps) {
  const htmlContent = getInvoiceDocumentHtml(props);
  return (
    <div 
      data-printable-document="true"
      className="printable-invoice-document bg-white text-zinc-950 w-full"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
