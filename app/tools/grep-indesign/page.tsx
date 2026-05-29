import type { Metadata } from "next";
import GrepToolsClient from "./GrepToolsClient";

export const metadata: Metadata = {
  title: "GREP Expressions & InDesign Scripts | Bodee Books Tools",
  description:
    "A toolbox of GREP expressions and InDesign scripts to edit books. Find sentences not starting with capitals, apply italics, fix wrong line breaks, and auto-apply master pages.",
  keywords: "GREP expressions, InDesign scripts, book editing, italics hotkey, center titles, master page",
};

export default function GrepIndesignPage() {
  return <GrepToolsClient />;
}
