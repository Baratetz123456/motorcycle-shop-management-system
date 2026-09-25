import React from "react";
import { SystemSettings } from "@/lib/settings";
import {
  generateReportShellHtml,
  PrintableReportLayout,
  ReportKpiCard
} from "./PrintableReportLayout";

export interface RepairReportProps {
  settings: SystemSettings;
  periodLabel?: string;
  reportRef?: string;
  jobNumber: string;
  customerName: string;
  customerPhone?: string;
  motorcycleName: string;
  plateNumber: string;
  mileage?: string;
  leadMechanic: string;
  serviceAdvisor?: string;
  status: string;
  initialDiagnosis?: string;
  workPerformed?: string;
  partsUsed: Array<{ name: string; qty: number; price: number }>;
  laborCharges: Array<{ name: string; amount: number }>;
  totalParts: number;
  totalLabor: number;
  grandTotal: number;
  releasedAt?: string;
  generatedBy?: string;
  generatedDate?: string;
}

export function getRepairReportDocumentHtml(props: RepairReportProps): string {
  const {
    settings,
    periodLabel = "Job Order Service Completion Record",
    reportRef = "JO-" + props.jobNumber,
    jobNumber,
    customerName,
    customerPhone = "N/A",
    motorcycleName,
    plateNumber,
    mileage = "N/A",
    leadMechanic,
    serviceAdvisor = "Workshop Advisor",
    status,
    initialDiagnosis = "Standard maintenance and inspection performed.",
    workPerformed = "Service completed according to manufacturer specifications.",
    partsUsed,
    laborCharges,
    totalParts,
    totalLabor,
    grandTotal,
    releasedAt,
    generatedBy,
    generatedDate
  } = props;

  const kpiCards: ReportKpiCard[] = [
    {
      label: "Total Service Billing",
      value: `₱${grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: "Settled repair order total"
    },
    {
      label: "Labor Service Charge",
      value: `₱${totalLabor.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: `${laborCharges.length} diagnostic & repair tasks`
    },
    {
      label: "Replacement Hardware",
      value: `₱${totalParts.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: `${partsUsed.length} OEM/aftermarket parts`
    },
    {
      label: "Assigned Technician",
      value: leadMechanic || "Shop Technician",
      sub: `Job Order #${jobNumber}`
    }
  ];

  // Parts Table Rows
  const partsRowsHtml =
    partsUsed.length === 0
      ? `
        <tr style="background-color: #ffffff;">
          <td colspan="4" style="text-align: center; color: #71717a; padding: 6px; border: 1px solid #e4e4e7;">
            No replacement hardware parts billed.
          </td>
        </tr>
      `
      : partsUsed
          .map(
            (p, idx) => `
        <tr style="background-color: #ffffff;">
          <td style="text-align: center; font-family: monospace; font-size: 8pt; color: #09090b; padding: 4px 6px; border: 1px solid #e4e4e7;">${idx + 1}</td>
          <td style="font-weight: 600; color: #09090b; padding: 4px 6px; border: 1px solid #e4e4e7;">${p.name}</td>
          <td style="text-align: center; font-family: monospace; color: #09090b; padding: 4px 6px; border: 1px solid #e4e4e7;">${p.qty}</td>
          <td style="text-align: right; font-family: monospace; font-weight: 700; color: #09090b; padding: 4px 6px; border: 1px solid #e4e4e7;">
            ₱${(p.qty * p.price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
        </tr>
      `
          )
          .join("");

  // Labor Table Rows
  const laborRowsHtml =
    laborCharges.length === 0
      ? `
        <tr style="background-color: #ffffff;">
          <td colspan="3" style="text-align: center; color: #71717a; padding: 6px; border: 1px solid #e4e4e7;">
            No standalone labor charges itemized.
          </td>
        </tr>
      `
      : laborCharges
          .map(
            (l, idx) => `
        <tr style="background-color: #ffffff;">
          <td style="text-align: center; font-family: monospace; font-size: 8pt; color: #09090b; padding: 4px 6px; border: 1px solid #e4e4e7;">${idx + 1}</td>
          <td style="font-weight: 600; color: #09090b; padding: 4px 6px; border: 1px solid #e4e4e7;">${l.name}</td>
          <td style="text-align: right; font-family: monospace; font-weight: 700; color: #09090b; padding: 4px 6px; border: 1px solid #e4e4e7;">
            ₱${Number(l.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
        </tr>
      `
          )
          .join("");

  const contentHtml = `
    <!-- Vehicle & Customer Profile Banner -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; border: 1px solid #e4e4e7; background-color: #fafafa; padding: 8px 10px; border-radius: 4px;">
      <div>
        <div style="font-size: 7pt; font-weight: 700; text-transform: uppercase; color: #71717a;">Customer & Contact</div>
        <div style="font-size: 10pt; font-weight: 800; color: #09090b; margin-top: 1px;">${customerName}</div>
        <div style="font-size: 7.5pt; font-family: monospace; color: #52525b;">Phone: ${customerPhone}</div>
        <div style="font-size: 7.5pt; color: #52525b; margin-top: 2px;">Status: <span class="print-pill">${status}</span></div>
      </div>
      <div>
        <div style="font-size: 7pt; font-weight: 700; text-transform: uppercase; color: #71717a;">Motorcycle Specification</div>
        <div style="font-size: 10pt; font-weight: 800; color: #09090b; margin-top: 1px;">${motorcycleName}</div>
        <div style="font-size: 7.5pt; font-family: monospace; color: #52525b;">
          Plate / MV: <strong>${plateNumber}</strong> • Odo: ${mileage}
        </div>
        <div style="font-size: 7.5pt; color: #52525b; margin-top: 2px;">
          Release: ${releasedAt || "Recorded Service"}
        </div>
      </div>
    </div>

    <!-- Diagnostic & Work Performed -->
    <div style="margin-bottom: 12px; border: 1px solid #e4e4e7; padding: 8px 10px; border-radius: 4px; background: #ffffff;">
      <div style="margin-bottom: 6px;">
        <span style="font-size: 7pt; font-weight: 800; text-transform: uppercase; color: #52525b;">Customer Concern / Diagnosis:</span>
        <p style="font-size: 8pt; color: #09090b; margin: 2px 0 0 0;">${initialDiagnosis}</p>
      </div>
      <div>
        <span style="font-size: 7pt; font-weight: 800; text-transform: uppercase; color: #52525b;">Mechanical Actions Taken:</span>
        <p style="font-size: 8pt; color: #09090b; margin: 2px 0 0 0;">${workPerformed}</p>
      </div>
    </div>

    <!-- Tables: Parts & Labor -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
      
      <!-- Parts Table -->
      <div>
        <h4 style="font-size: 8.5pt; font-weight: 800; text-transform: uppercase; color: #09090b; margin-bottom: 3px;">
          Installed Hardware & Parts
        </h4>
        <table style="width: 100%; border-collapse: collapse; background: #ffffff;">
          <thead>
            <tr style="background-color: #f4f4f5;">
              <th style="text-align: center; padding: 3px 4px; border: 1px solid #e4e4e7; font-size: 7.5pt; width: 8%;">#</th>
              <th style="text-align: left; padding: 3px 4px; border: 1px solid #e4e4e7; font-size: 7.5pt;">Part Description</th>
              <th style="text-align: center; padding: 3px 4px; border: 1px solid #e4e4e7; font-size: 7.5pt; width: 15%;">Qty</th>
              <th style="text-align: right; padding: 3px 4px; border: 1px solid #e4e4e7; font-size: 7.5pt; width: 25%;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${partsRowsHtml}
            <tr style="background-color: #f4f4f5; font-weight: 700;">
              <td colspan="3" style="text-align: right; padding: 3px 4px; border: 1px solid #e4e4e7; font-size: 7.5pt;">Parts Subtotal:</td>
              <td style="text-align: right; font-family: monospace; padding: 3px 4px; border: 1px solid #e4e4e7; font-size: 8pt;">₱${totalParts.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Labor Table -->
      <div>
        <h4 style="font-size: 8.5pt; font-weight: 800; text-transform: uppercase; color: #09090b; margin-bottom: 3px;">
          Workshop Diagnostic & Labor
        </h4>
        <table style="width: 100%; border-collapse: collapse; background: #ffffff;">
          <thead>
            <tr style="background-color: #f4f4f5;">
              <th style="text-align: center; padding: 3px 4px; border: 1px solid #e4e4e7; font-size: 7.5pt; width: 8%;">#</th>
              <th style="text-align: left; padding: 3px 4px; border: 1px solid #e4e4e7; font-size: 7.5pt;">Labor Operation</th>
              <th style="text-align: right; padding: 3px 4px; border: 1px solid #e4e4e7; font-size: 7.5pt; width: 30%;">Fee</th>
            </tr>
          </thead>
          <tbody>
            ${laborRowsHtml}
            <tr style="background-color: #f4f4f5; font-weight: 700;">
              <td colspan="2" style="text-align: right; padding: 3px 4px; border: 1px solid #e4e4e7; font-size: 7.5pt;">Labor Subtotal:</td>
              <td style="text-align: right; font-family: monospace; padding: 3px 4px; border: 1px solid #e4e4e7; font-size: 8pt;">₱${totalLabor.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>

    <!-- Settlement Grand Total Banner -->
    <div style="margin-top: 10px; display: flex; justify-content: flex-end; align-items: center; gap: 12px; background-color: #f4f4f5; border: 1px solid #e4e4e7; padding: 6px 12px; border-radius: 4px;">
      <span style="font-size: 8pt; font-weight: 700; text-transform: uppercase; color: #52525b;">Total Job Order Settlement:</span>
      <span style="font-size: 14pt; font-weight: 900; font-family: monospace; color: #09090b;">
        ₱${grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  `;

  return generateReportShellHtml({
    settings,
    reportTitle: "Motorcycle Workshop Service Record & Inspection Certificate",
    subtitle: `Official Job Order #${jobNumber} Workmanship & Quality Assurance Log`,
    periodLabel,
    reportRef,
    generatedBy,
    generatedDate,
    kpiCards,
    contentHtml,
    preparedByLabel: "Certified By (Lead Technician)",
    preparedByName: leadMechanic || "Lead Technician",
    reviewedByLabel: "Verified By (Service Advisor)",
    reviewedByName: serviceAdvisor || "Service Advisor",
    approvedByLabel: "Customer Release & Acceptance",
    approvedByName: customerName || "Vehicle Owner",
    complianceNotice:
      "All service workmanship and replacement parts carry a standard 30-day / 1,000 km warranty covering defect in materials or shop installation, excluding electrical modifications or road accidents."
  });
}

export function PrintableRepairReportDocument(props: RepairReportProps) {
  const {
    settings,
    periodLabel = "Job Order Service Completion Record",
    reportRef = "JO-" + props.jobNumber,
    jobNumber,
    customerName,
    customerPhone = "N/A",
    motorcycleName,
    plateNumber,
    mileage = "N/A",
    leadMechanic,
    serviceAdvisor = "Workshop Advisor",
    status,
    initialDiagnosis = "Standard maintenance and inspection performed.",
    workPerformed = "Service completed according to manufacturer specifications.",
    partsUsed,
    laborCharges,
    totalParts,
    totalLabor,
    grandTotal,
    releasedAt,
    generatedBy,
    generatedDate
  } = props;

  const kpiCards: ReportKpiCard[] = [
    {
      label: "Total Service Billing",
      value: `₱${grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: "Settled repair order total"
    },
    {
      label: "Labor Service Charge",
      value: `₱${totalLabor.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: `${laborCharges.length} diagnostic & repair tasks`
    },
    {
      label: "Replacement Hardware",
      value: `₱${totalParts.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: `${partsUsed.length} OEM/aftermarket parts`
    },
    {
      label: "Assigned Technician",
      value: leadMechanic || "Shop Technician",
      sub: `Job Order #${jobNumber}`
    }
  ];

  return (
    <PrintableReportLayout
      settings={settings}
      reportTitle="Motorcycle Workshop Service Record & Inspection Certificate"
      subtitle={`Official Job Order #${jobNumber} Workmanship & Quality Assurance Log`}
      periodLabel={periodLabel}
      reportRef={reportRef}
      generatedBy={generatedBy}
      generatedDate={generatedDate}
      kpiCards={kpiCards}
      preparedByLabel="Certified By (Lead Technician)"
      preparedByName={leadMechanic || "Lead Technician"}
      reviewedByLabel="Verified By (Service Advisor)"
      reviewedByName={serviceAdvisor || "Service Advisor"}
      approvedByLabel="Customer Release & Acceptance"
      approvedByName={customerName || "Vehicle Owner"}
      complianceNotice="All service workmanship and replacement parts carry a standard 30-day / 1,000 km warranty covering defect in materials or shop installation, excluding electrical modifications or road accidents."
    >
      <div className="space-y-3">
        {/* Vehicle & Customer Details */}
        <div className="grid grid-cols-2 gap-3 border border-zinc-200 bg-zinc-50 p-2.5 rounded text-[9px]">
          <div>
            <div className="text-[8px] font-bold uppercase text-zinc-500">Customer & Contact</div>
            <div className="text-xs font-bold text-zinc-950 mt-0.5">{customerName}</div>
            <div className="text-zinc-600 font-mono">Phone: {customerPhone}</div>
            <div className="text-zinc-600 mt-1">Status: {status}</div>
          </div>
          <div>
            <div className="text-[8px] font-bold uppercase text-zinc-500">Motorcycle Profile</div>
            <div className="text-xs font-bold text-zinc-950 mt-0.5">{motorcycleName}</div>
            <div className="text-zinc-600 font-mono">Plate: {plateNumber} • Odo: {mileage}</div>
            <div className="text-zinc-600 mt-1">Release: {releasedAt || "Recorded Service"}</div>
          </div>
        </div>

        {/* Diagnosis & Work */}
        <div className="border border-zinc-200 p-2.5 rounded bg-white text-[9px] space-y-1.5">
          <div>
            <span className="font-bold text-zinc-700 uppercase text-[8px]">Diagnosis:</span>
            <p className="text-zinc-950 mt-0.5">{initialDiagnosis}</p>
          </div>
          <div>
            <span className="font-bold text-zinc-700 uppercase text-[8px]">Work Performed:</span>
            <p className="text-zinc-950 mt-0.5">{workPerformed}</p>
          </div>
        </div>

        {/* Parts & Labor Grids */}
        <div className="grid grid-cols-2 gap-3 text-[9px]">
          <div>
            <h4 className="font-bold uppercase text-[9px] text-zinc-950 mb-1">Parts & Consumables</h4>
            <table className="w-full border-collapse border border-zinc-200">
              <thead>
                <tr className="bg-zinc-100">
                  <th className="p-1 border border-zinc-200 text-left text-zinc-950">Item</th>
                  <th className="p-1 border border-zinc-200 text-center w-12 text-zinc-950">Qty</th>
                  <th className="p-1 border border-zinc-200 text-right w-16 text-zinc-950">Total</th>
                </tr>
              </thead>
              <tbody>
                {partsUsed.map((p, idx) => (
                  <tr key={idx} className="bg-white">
                    <td className="p-1 border border-zinc-200 text-zinc-900">{p.name}</td>
                    <td className="p-1 border border-zinc-200 text-center font-mono text-zinc-900">{p.qty}</td>
                    <td className="p-1 border border-zinc-200 text-right font-mono font-bold text-zinc-950">
                      ₱{(p.qty * p.price).toFixed(2)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-zinc-100 font-bold">
                  <td colSpan={2} className="p-1 border border-zinc-200 text-right text-zinc-950">Parts Subtotal:</td>
                  <td className="p-1 border border-zinc-200 text-right font-mono text-zinc-950">₱{totalParts.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="font-bold uppercase text-[9px] text-zinc-950 mb-1">Labor Tasks</h4>
            <table className="w-full border-collapse border border-zinc-200">
              <thead>
                <tr className="bg-zinc-100">
                  <th className="p-1 border border-zinc-200 text-left text-zinc-950">Task Description</th>
                  <th className="p-1 border border-zinc-200 text-right w-20 text-zinc-950">Fee</th>
                </tr>
              </thead>
              <tbody>
                {laborCharges.map((l, idx) => (
                  <tr key={idx} className="bg-white">
                    <td className="p-1 border border-zinc-200 text-zinc-900">{l.name}</td>
                    <td className="p-1 border border-zinc-200 text-right font-mono font-bold text-zinc-950">
                      ₱{Number(l.amount || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-zinc-100 font-bold">
                  <td className="p-1 border border-zinc-200 text-right text-zinc-950">Labor Subtotal:</td>
                  <td className="p-1 border border-zinc-200 text-right font-mono text-zinc-950">₱{totalLabor.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Grand Total */}
        <div className="flex justify-end items-center gap-3 bg-zinc-100 border border-zinc-200 p-2 rounded">
          <span className="text-[9px] font-bold uppercase text-zinc-600">Total Settlement:</span>
          <span className="text-base font-black font-mono text-zinc-950">
            ₱{grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </PrintableReportLayout>
  );
}
