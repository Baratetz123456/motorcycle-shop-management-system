import { SystemSettings } from "./settings";

export interface LegalSection {
  id: string;
  title: string;
  badge?: string;
  content: string[];
  subsections?: {
    subtitle: string;
    paragraphs: string[];
  }[];
}

export function getPrivacyPolicySections(settings: SystemSettings): {
  title: string;
  lastUpdated: string;
  effectiveDate: string;
  sections: LegalSection[];
} {
  const appName = settings.appName || "Versiklo";
  const shopAddress = settings.shopAddress || "Metro Manila, Philippines";
  const contactEmail = settings.contactEmail || "support@motoshop.com";
  const contactPhone = settings.contactPhone || "+63 (02) 8123-4567";
  const retentionYears = 5; // Statutory Philippine accounting and transactional record retention requirement (BIR RR 9-2009 / NPC guidelines)

  return {
    title: `${appName} Workshop Privacy & Data Protection Policy`,
    lastUpdated: "September 9, 2026",
    effectiveDate: "January 1, 2026",
    sections: [
      {
        id: "compliance-statement",
        title: "1. Statement of Compliance (RA 10173)",
        badge: "DPA 2012 Compliance",
        content: [
          `${appName} ("we", "us", or "the System") operates as a specialized motorcycle workshop point-of-sale and repair management platform. We are committed to safeguarding personal, vehicular, and transactional data in strict compliance with Republic Act No. 10173, otherwise known as the Data Privacy Act of 2012 (DPA) of the Republic of the Philippines, its Implementing Rules and Regulations (IRR), and National Privacy Commission (NPC) issuances.`,
          `This Privacy Policy governs the collection, processing, recording, retention, and disposal of information acquired through ${appName}, both on our physical shop floor at ${shopAddress} and via our digital POS services.`
        ]
      },
      {
        id: "information-collected",
        title: "2. Information We Collect",
        badge: "Customer & Vehicle PII",
        content: [
          `To process customer repair orders, manage parts inventory, issue BIR-compliant official receipts, and maintain service histories, we collect and process the following categories of data:`
        ],
        subsections: [
          {
            subtitle: "A. Customer Personal Identifying Information (PII)",
            paragraphs: [
              "Full name, primary contact number (Philippine mobile format 09xx-xxx-xxxx), optional email address, and billing/residence address.",
              "Government-issued identification details (e.g., Driver's License or valid ID) when authorizing motorcycle release, major engine overhauls, or credit charge accounts."
            ]
          },
          {
            subtitle: "B. Motorcycle & Vehicular Identity Data",
            paragraphs: [
              "Motorcycle Make, Model, Year of Manufacture, Engine Displacement (cc), and Color Scheme.",
              "LTO Registration Plate Number, Chassis Number / Vehicle Identification Number (VIN), and Engine Number for ownership validation and warranty records.",
              "Odometer reading, current mechanical fault descriptions, service history logs, and pre-existing external cosmetic conditions upon drop-off."
            ]
          },
          {
            subtitle: "C. Financial & Transactional Data",
            paragraphs: [
              "Invoice numbers, line item parts purchased, labor service charges, payment methods (Cash, GCash, Maya, Bank Transfer, or Debit/Credit Card), timestamps, and discount/commission allocations.",
              "We do not store full credit card numbers or banking PINs; digital cashless payments are handled through secure terminal gateways."
            ]
          },
          {
            subtitle: "D. System Audit Logs & Staff Telemetry",
            paragraphs: [
              "User account IDs, assigned roles (Cashier, Mechanic, Manager, Admin), client IP addresses, browser user agents, and cryptographic change history logs on sensitive actions (e.g., invoice voiding, stock adjustments, role changes)."
            ]
          }
        ]
      },
      {
        id: "purpose-of-processing",
        title: "3. Lawful Basis & Purpose of Processing",
        content: [
          `We collect and process your information exclusively for legitimate business and regulatory purposes, including:`,
          `• Performance of Contract: Executing Job Orders, performing vehicle maintenance, parts installation, and processing checkout payments.`,
          `• Service Notifications: Sending real-time SMS or chat notifications regarding motorcycle repair milestones (Ongoing, Completed, Ready for Pickup).`,
          `• Warranty & Recall Verification: Validating parts and labor warranty claims within our established 30-day warranty window.`,
          `• Statutory Compliance: Complying with Bureau of Internal Revenue (BIR) tax auditing requirements, Bureau of Customs parts verification, and Philippine law enforcement requests in cases of suspected stolen motor vehicles (Anti-Fencing Law / RA 6539 Anti-Carnapping Act).`
        ]
      },
      {
        id: "data-security-retention",
        title: "4. Data Storage, Security & Retention",
        badge: "Encrypted & Audited",
        content: [
          `All database records are hosted in encrypted storage utilizing industry-standard AES-256 encryption at rest and TLS 1.3 encryption in transit. Internal access is strictly regulated by Role-Based Access Control (RBAC), ensuring mechanics only see job cards and cashiers only access relevant billing entries.`,
          `In accordance with Philippine commercial tax regulations and LTO warranty tracking, customer repair histories and official sales transaction records are retained for a minimum period of ${retentionYears} years. Following the lapse of the statutory retention period, historical records are either anonymized for statistical reporting or permanently purged from active storage.`
        ]
      },
      {
        id: "data-subject-rights",
        title: "5. Your Rights as a Data Subject",
        badge: "RA 10173 Section 16",
        content: [
          `Under Section 16 of the Philippine Data Privacy Act of 2012, customer data subjects enjoy the following statutory rights:`,
          `• Right to be Informed: To know that your personal and vehicle data is being recorded and processed.`,
          `• Right to Access: To obtain a duplicate copy of your motorcycle's complete repair logs, parts invoice history, and diagnosis notes upon presentation of valid ID.`,
          `• Right to Rectification: To request correction of erroneous vehicle plates, engine codes, or customer contact numbers.`,
          `• Right to Erasure or Blocking: To request the removal of non-statutory records when no longer necessary for warranty or legal tax purposes.`,
          `• Right to File a Complaint: If you believe your privacy rights have been infringed, you may lodge a complaint with the National Privacy Commission (NPC) at complaints@privacy.gov.ph.`
        ]
      },
      {
        id: "privacy-contact",
        title: "6. Data Protection Officer (DPO) Contact",
        content: [
          `For inquiries, record requests, or privacy clarifications, please contact our designated Data Protection Compliance Officer:`,
          `Shop Floor Location: ${shopAddress}`,
          `Support & Privacy Email: ${contactEmail}`,
          `Customer Service Hotline: ${contactPhone}`,
          `Operating Hours: Monday – Saturday, 8:00 AM – 6:00 PM PST (Philippine Standard Time)`
        ]
      }
    ]
  };
}

export function getTermsOfServiceSections(settings: SystemSettings): {
  title: string;
  lastUpdated: string;
  effectiveDate: string;
  sections: LegalSection[];
} {
  const appName = settings.appName || "Versiklo";
  const shopAddress = settings.shopAddress || "Metro Manila, Philippines";
  const contactEmail = settings.contactEmail || "support@motoshop.com";
  const laborWarrantyDays = 30;
  const gracePeriodDays = 7;
  const storageFeePerDay = 150;
  const lienDispositionDays = 90;

  return {
    title: `${appName} Workshop Terms of Service & Repair Conditions`,
    lastUpdated: "September 9, 2026",
    effectiveDate: "January 1, 2026",
    sections: [
      {
        id: "acceptance-of-terms",
        title: "1. Acceptance of Terms",
        content: [
          `By signing or electronically confirming a Job Order (JO), depositing a motorcycle for diagnosis, or purchasing replacement parts through ${appName} ("the Shop", "we", or "our"), the customer ("Customer", "Vehicle Owner", or "Authorized Agent") enters into a legally binding contract under the Civil Code of the Philippines (Title VIII, Contracts of Piece of Work) and expressly agrees to all terms set forth herein.`,
          `These Terms govern all service operations, parts sales, test-ride authorizations, warranty parameters, and vehicle custody policies across all our authorized service centers.`
        ]
      },
      {
        id: "intake-and-inspection",
        title: "2. Vehicle Drop-off, Inspection & Concealed Defects",
        badge: "Intake Protocol",
        content: [
          `Upon vehicle check-in, our certified technicians conduct an intake checklist recording existing fuel level, odometer mileage, and visible exterior flaws.`,
          `• Concealed & Pre-Existing Defects: The Shop is NOT liable for pre-existing internal engine, gearbox, or electrical wiring defects that were not disclosed or discoverable upon initial drop-off inspection.`,
          `• Personal Property: Customers are required to remove all personal belongings, helmets, tools, top boxes, and valuables before leaving the vehicle. The Shop accepts no liability for uninventoried items left in motorcycle compartments.`
        ]
      },
      {
        id: "test-ride-authorization",
        title: "3. Mechanic Road Testing & Test-Ride Authorization",
        badge: "Road Testing Waiver",
        content: [
          `By submitting a Job Order for tuning, overhaul, brake service, or suspension repair, the Customer grants full authorization to our certified shop mechanics to conduct test rides on public roads and designated test circuits within reasonable vicinity of ${shopAddress} for diagnostic and verification purposes.`,
          `While our staff exercise utmost mechanical diligence and follow Philippine road safety rules (LTO / RA 4136), the Customer's primary motorcycle comprehensive/third-party insurance remains the primary insurance coverage during authorized test-drives, except in cases of proven gross technician negligence.`
        ]
      },
      {
        id: "warranty-and-guarantees",
        title: "4. Repair Warranty & Defective Parts Policy",
        badge: "30-Day Warranty",
        content: [
          `We stand firmly behind our workmanship and the premium catalog items provided through ${appName}:`,
          `• Labor Warranty: Workmanship performed on diagnosed Job Orders is warranted for ${laborWarrantyDays} calendar days from the date of vehicle release. If the identical mechanical issue recurs within this period, it will be re-inspected and rectified at zero additional labor charge.`,
          `• Parts Warranty: Brand new replacement parts (OEM or genuine aftermarket) carry manufacturer warranties against manufacturing defects. Fluids, brake pads, tires, bulbs, and consumable items are covered against initial defect upon installation only.`,
          `• Warranty Void Conditions: All repair warranties are immediately rendered NULL AND VOID if:`,
          `  a) The motorcycle is subsequently opened, modified, or tampered with by any third-party mechanic or the owner.`,
          `  b) The motorcycle is entered into drag racing, circuit racing, stunt riding, or unauthorized track events.`,
          `  c) The failure results from inadequate owner maintenance, oil starvation, running contaminated fuel, or physical crash impact.`
        ]
      },
      {
        id: "payment-and-special-orders",
        title: "5. Payment Terms & Special-Order Parts",
        content: [
          `• Payment on Release: All accumulated labor fees, diagnostic costs, and installed parts charges must be settled in full prior to the physical release of the motorcycle from our premises.`,
          `• Non-Refundable Special Orders: Any custom performance parts, specialized carburetor kits, or import-only motorcycle components ordered specifically for the Customer require a minimum 50% non-refundable deposit. Once procured, special-order parts cannot be canceled or refunded.`,
          `• Payment Methods: We accept Philippine Peso Cash, Official GCash QR, Maya QR, and authorized banking debit/credit cards. Official BIR receipts or collection invoices are generated for every transaction.`
        ]
      },
      {
        id: "storage-and-abandoned-vehicles",
        title: "6. Vehicle Collection, Storage Fees & Mechanic's Lien",
        badge: "Storage & Lien Rights",
        content: [
          `Prompt vehicle retrieval is essential to maintain open workshop lift bays for other motorcycle riders:`,
          `• Grace Period: Customers are granted a complimentary grace period of ${gracePeriodDays} calendar days to pick up their motorcycle following SMS or phone notification that the Job Order is marked 'COMPLETED'.`,
          `• Storage Fees: Beginning on the 8th day post-completion, a holding and storage fee of ₱${storageFeePerDay}.00 per calendar day will be added to the final Job Order billing.`,
          `• Mechanic's Statutory Lien (Article 1731, Civil Code): Under Article 1731 of the Civil Code of the Philippines, the Shop retains a legal possessory lien over the motorcycle until all labor, parts, and accrued storage fees are fully discharged.`,
          `• Disposition of Abandoned Motorcycles: Any motorcycle left unclaimed for more than ${lienDispositionDays} calendar days following written notice to the Customer's registered contact number will be declared legally abandoned and disposed of, auctioned, or sold through legal proceedings to satisfy unpaid balances and accrued storage costs.`
        ]
      },
      {
        id: "limitation-of-liability",
        title: "7. Limitation of Liability & Force Majeure",
        content: [
          `The Shop shall not be held liable for vehicle loss, structural damage, or delivery delays arising from Force Majeure events beyond our reasonable control, including typhoons, floods, earthquakes, fires, civil unrest, or nationwide supply-chain parts embargoes.`,
          `In all events, the Shop's maximum aggregate financial liability for any claim arising out of a repair contract shall be strictly capped at the total amount paid by the Customer for the specific Job Order in dispute.`
        ]
      },
      {
        id: "dispute-resolution",
        title: "8. Dispute Resolution & Governing Law",
        content: [
          `These Terms and Conditions shall be interpreted, construed, and enforced strictly in accordance with the substantive laws of the Republic of the Philippines.`,
          `In the event of any operational or warranty dispute, the parties agree to first seek amicable settlement through informal dialogue and DTI Consumer Mediation before initiating legal action. Any formal legal proceedings shall be instituted exclusively in the proper courts of jurisdiction covering the location of ${shopAddress}.`
        ]
      }
    ]
  };
}
