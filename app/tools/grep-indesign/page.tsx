import type { Metadata } from "next";
import GrepToolsClient from "./GrepToolsClient";

export const metadata: Metadata = {
  title: "GREP Expressions & InDesign Scripts for Book Editors",
  description:
    "Free toolbox of GREP expressions and InDesign scripts for editing books — find sentences not starting with capitals, apply italics, fix line breaks, auto-apply master pages, and more.",
  keywords: ["GREP expressions InDesign", "InDesign scripts book editing", "InDesign GREP", "book editing tools", "InDesign automation"],
  alternates: { canonical: "https://bodeebooks.com/tools/grep-indesign" },
  openGraph: {
    title: "GREP Expressions & InDesign Scripts for Book Editors | Bodee Books",
    description: "Free GREP expressions and InDesign scripts for book production and editing.",
    url: "https://bodeebooks.com/tools/grep-indesign",
    type: "website",
  },
};

export default function GrepIndesignPage() {
  return <GrepToolsClient />;
}
