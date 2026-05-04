"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
