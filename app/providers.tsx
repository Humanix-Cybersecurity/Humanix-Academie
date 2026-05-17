"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
import { SessionProvider } from "next-auth/react";
import { PopupCoordinatorProvider } from "@/components/popup-coordinator";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PopupCoordinatorProvider>{children}</PopupCoordinatorProvider>
    </SessionProvider>
  );
}
