// SPDX-License-Identifier: AGPL-3.0-or-later
// Sous-composant local : <dt>/<dd> pour les champs license.

export default function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.25em] font-bold text-gray-500 dark:text-gray-400 mb-1">
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}
