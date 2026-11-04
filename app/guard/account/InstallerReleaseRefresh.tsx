"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { InstallerChannel } from "../../../shared/guard-installer-release-hint";
import { watchInstallerRelease } from "./release-refresh";

export default function InstallerReleaseRefresh({ channel, version }: { channel: InstallerChannel; version: string | null }) {
  const router = useRouter();
  useEffect(() => watchInstallerRelease({ channel, version, onChange: () => router.refresh(), window, document }), [channel, version, router]);
  return null;
}
