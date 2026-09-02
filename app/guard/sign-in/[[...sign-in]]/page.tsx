import type { Metadata } from "next";
import GuardAccountEntry from "@/components/GuardAccountEntry";

export const metadata: Metadata = {
  title: "BodeeGuard Parent Sign In",
  description: "Sign in to manage your BodeeGuard subscription, connected computers, and secure device approvals.",
};

export default function GuardSignInPage() {
  return <GuardAccountEntry mode="sign-in" />;
}
