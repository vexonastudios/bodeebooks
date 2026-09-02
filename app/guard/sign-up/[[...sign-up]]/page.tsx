import type { Metadata } from "next";
import GuardAccountEntry from "@/components/GuardAccountEntry";

export const metadata: Metadata = {
  title: "Create a BodeeGuard Parent Account",
  description: "Create the secure parent account used to manage your family’s BodeeGuard subscription and approve learning computers.",
};

export default function GuardSignUpPage() {
  return <GuardAccountEntry mode="sign-up" />;
}
