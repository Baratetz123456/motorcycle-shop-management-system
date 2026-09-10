import { Metadata } from "next";
import { LegalHub } from "@/components/legal/LegalHub";

export const metadata: Metadata = {
  title: "Privacy Policy | MotoShop Workshop Management",
  description: "Customer data protection and privacy policy under the Philippine Data Privacy Act of 2012 (RA 10173).",
};

export default function PrivacyPage() {
  return <LegalHub initialTab="privacy" />;
}
