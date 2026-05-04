"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
import { useTransition, useState } from "react";
import {
  installModuleAction,
  uninstallModuleAction,
} from "@/app/marketplace/actions";

export default function InstallButton({
  moduleId,
  isInstalled,
}: {
  moduleId: string;
  isInstalled: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onInstall = () => {
    if (
      !confirm(
        "Installer ce module dans ton catalogue ? Il sera visible par tes apprenants.",
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      try {
        await installModuleAction(moduleId);
      } catch (e: any) {
        setError(
          "Installation impossible : " + (e?.message ?? "erreur inconnue"),
        );
      }
    });
  };

  const onUninstall = () => {
    if (
      !confirm(
        "Désinstaller ce module ? Le module ne sera plus accessible aux apprenants. Leurs progressions sont conservées.",
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      try {
        await uninstallModuleAction(moduleId);
      } catch (e: any) {
        setError(
          "Désinstallation impossible : " + (e?.message ?? "erreur inconnue"),
        );
      }
    });
  };

  if (isInstalled) {
    return (
      <div className="text-right">
        <button
          onClick={onUninstall}
          disabled={pending}
          className="btn-secondary text-sm py-2 px-4 border-warn text-warn hover:bg-red-50"
        >
          {pending ? "Désinstallation…" : "Désinstaller"}
        </button>
        <p className="text-xs text-success mt-1">
          ✓ Installé sur ton catalogue
        </p>
        {error && <p className="text-xs text-warn mt-1">{error}</p>}
      </div>
    );
  }

  return (
    <div className="text-right">
      <button
        onClick={onInstall}
        disabled={pending}
        className="btn-primary text-sm py-2 px-5"
      >
        {pending ? "Installation…" : "📥 Installer"}
      </button>
      {error && <p className="text-xs text-warn mt-1">{error}</p>}
    </div>
  );
}
