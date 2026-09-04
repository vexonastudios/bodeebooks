"use client";

import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";

export default function SubmitButton({ children, pendingLabel = "Please wait…", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return <button {...props} type="submit" disabled={pending || props.disabled} aria-busy={pending}>{pending ? pendingLabel : children}</button>;
}
