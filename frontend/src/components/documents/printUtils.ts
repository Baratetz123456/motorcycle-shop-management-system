/**
 * Dedicated Document Print Engine
 * Renders document markup in an isolated sandboxed iframe to guarantee
 * 100% decoupling from the main application's UI, stylesheets, and dark mode theme.
 */

export function printIsolatedDocument(title: string, documentHtml: string) {
  if (typeof window === "undefined") return;

  // Create ephemeral hidden iframe
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  iframe.title = title || "Print Document";

  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    window.print();
    return;
  }

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title || "Official Document"}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 8mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      background-color: #ffffff !important;
      background: #ffffff !important;
      color: #09090b !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.35;
      width: 100%;
      height: auto;
      overflow: visible;
    }
    .document-canvas {
      background-color: #ffffff !important;
      background: #ffffff !important;
      color: #09090b !important;
      width: 100%;
      max-width: 100%;
      padding: 0;
      margin: 0;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      background: #ffffff !important;
    }
    th, td {
      border: 1px solid #e4e4e7 !important;
      padding: 4px 6px !important;
      font-size: 9pt !important;
      color: #09090b !important;
    }
    th {
      background-color: #f4f4f5 !important;
      font-weight: 700 !important;
    }
    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .print-pill {
      background-color: #f4f4f5 !important;
      color: #09090b !important;
      border: 1px solid #d4d4d8 !important;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      display: inline-block;
    }
    .hairline-border-b {
      border-bottom: 1px solid #e4e4e7 !important;
    }
    .hairline-border-t {
      border-top: 1px solid #e4e4e7 !important;
    }
    .hairline-border {
      border: 1px solid #e4e4e7 !important;
    }
  </style>
</head>
<body>
  <div class="document-canvas">
    ${documentHtml}
  </div>
</body>
</html>`;

  iframeDoc.open();
  iframeDoc.write(fullHtml);
  iframeDoc.close();

  // Trigger print after iframe renders
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error("Print invocation failed:", e);
    } finally {
      // Remove iframe from DOM after print dialog is handled
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }
  }, 250);
}
