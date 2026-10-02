import { Metadata } from "next";
import { LegalHub } from "@/components/legal/LegalHub";

export const metadata: Metadata = {
  title: "Terms & Conditions | MotoShop Workshop Management",
  description: "Official repair terms, mechanic road testing waiver, 30-day warranty, and vehicle custody conditions under Philippine law.",
};

export default function TermsPage() {
  return <LegalHub initialTab="terms" />;
}
