"use client";

import { useState, useTransition } from "react";
import Papa from "papaparse";
import { bulkImportUsers } from "@/app/admin/actions";

type Row = { email: string; name?: string; service?: string; role?: string };

export default function CsvImporter() {
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setResult(null);
    setRows([]);
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (res) => {
        if (res.errors.length > 0) {
          setError(`Erreur de parsing : ${res.errors[0].message}`);
          return;
        }
        const cleaned = (res.data as Row[]).filter((r) => r.email);
        if (cleaned.length === 0) {
          setError(
            "Aucune ligne valide. Vérifie qu'il y a une colonne 'email'.",
          );
          return;
        }
        setRows(cleaned);
      },
    });
  };

  const onConfirm = () => {
    startTransition(async () => {
      try {
        const r = await bulkImportUsers(rows);
        setResult(r);
        setRows([]);
      } catch {
        setError("Import impossible. Vérifie tes droits admin.");
      }
    });
  };

  const reset = () => {
    setRows([]);
    setError(null);
    setResult(null);
  };

  return (
    <div className="space-y-4">
      {!rows.length && !result && (
        <>
          <div className="rounded-2xl border-2 border-dashed border-gray-300 p-6 text-center hover:border-accent-500 transition">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={onFile}
              className="hidden"
              id="csv-file"
            />
            <label htmlFor="csv-file" className="cursor-pointer">
              <p className="text-4xl mb-2">📂</p>
              <p className="font-bold text-primary-500">
                Choisir un fichier CSV
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Colonnes attendues : email (requis), name, service, role
              </p>
            </label>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600">
            <p className="font-bold mb-1">Format type :</p>
            <pre className="text-[11px] overflow-x-auto">
              {`email,name,service,role
sophie@masociete.fr,Sophie Martin,Direction,ADMIN
yanis@masociete.fr,Yanis Bernard,Commercial,LEARNER
christine@masociete.fr,Christine Dubois,Compta,LEARNER`}
            </pre>
          </div>
        </>
      )}

      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 text-sm text-red-700">
          ⚠️ {error}
        </div>
      )}

      {rows.length > 0 && !result && (
        <>
          <div className="bg-primary-50 rounded-xl p-3 text-sm">
            <p className="font-bold text-primary-500 mb-1">
              📋 {rows.length} ligne{rows.length > 1 ? "s" : ""} prête
              {rows.length > 1 ? "s" : ""} à importer
            </p>
            <p className="text-xs text-gray-600">
              Aperçu des 5 premières lignes :
            </p>
          </div>

          <div className="overflow-x-auto bg-white border rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Nom</th>
                  <th className="px-3 py-2 text-left">Service</th>
                  <th className="px-3 py-2 text-left">Rôle</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2 font-mono">{r.email}</td>
                    <td className="px-3 py-2">{r.name ?? "—"}</td>
                    <td className="px-3 py-2">{r.service ?? "—"}</td>
                    <td className="px-3 py-2">{r.role ?? "LEARNER"}</td>
                  </tr>
                ))}
                {rows.length > 5 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-2 text-gray-400 text-center italic"
                    >
                      … et {rows.length - 5} de plus
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onConfirm}
              disabled={pending}
              className="btn-primary flex-1 text-sm"
            >
              {pending
                ? "Import en cours…"
                : `Importer ${rows.length} utilisateur${rows.length > 1 ? "s" : ""}`}
            </button>
            <button
              onClick={reset}
              disabled={pending}
              className="btn-secondary text-sm"
            >
              Annuler
            </button>
          </div>
        </>
      )}

      {result && (
        <>
          <div
            className={`rounded-xl p-4 text-sm ${
              result.errors.length > 0
                ? "bg-amber-50 border-2 border-amber-200 text-amber-900"
                : "bg-green-50 border-2 border-green-200 text-green-900"
            }`}
          >
            <p className="font-bold mb-2">
              {result.errors.length === 0
                ? "✅ Import réussi"
                : "⚠️ Import partiel"}
            </p>
            <p>
              <strong>{result.created}</strong> créé
              {result.created > 1 ? "s" : ""} ·{" "}
              <strong>{result.skipped}</strong> ignoré
              {result.skipped > 1 ? "s" : ""} (déjà présent
              {result.skipped > 1 ? "s" : ""}) ·{" "}
              <strong>{result.errors.length}</strong> erreur
              {result.errors.length > 1 ? "s" : ""}
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-2 text-xs list-disc pl-5 space-y-0.5">
                {result.errors.slice(0, 5).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
                {result.errors.length > 5 && (
                  <li>… et {result.errors.length - 5} de plus</li>
                )}
              </ul>
            )}
          </div>
          <button onClick={reset} className="btn-secondary text-sm w-full">
            Importer un autre fichier
          </button>
        </>
      )}
    </div>
  );
}
