"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState, useMemo } from "react";
import { calculateMonthlyPrice } from "@/lib/pricing";

export default function PricingSimulator() {
  const [seats, setSeats] = useState(30);
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");

  const result = useMemo(
    () => calculateMonthlyPrice(seats, billing),
    [seats, billing],
  );

  const monthlyTotal = result.total;
  const annualTotal = monthlyTotal * 12;
  const monthlyOnlyResult = useMemo(
    () => calculateMonthlyPrice(seats, "monthly"),
    [seats],
  );
  const savingsAmount = (monthlyOnlyResult.total - monthlyTotal) * 12;

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-extrabold text-primary-500 mb-1">
          🧮 Simulateur de tarif
        </h2>
        <p className="text-gray-600 text-sm">
          Combien ça va te coûter exactement.
        </p>
      </div>

      <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-6 items-center">
        {/* Slider taille équipe */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">
            Nombre de collaborateurs :{" "}
            <strong className="text-primary-500 text-lg">{seats}</strong>
          </label>
          <input
            type="range"
            min={1}
            max={300}
            value={seats}
            onChange={(e) => setSeats(parseInt(e.target.value))}
            className="w-full accent-accent-500"
          />
          <div className="flex justify-between text-[10px] text-gray-500 mt-1">
            <span>1</span>
            <span>50</span>
            <span>100</span>
            <span>200</span>
            <span>300+</span>
          </div>
          <div className="grid grid-cols-4 gap-1 mt-3 text-xs">
            {[10, 30, 75, 150].map((n) => (
              <button
                key={n}
                onClick={() => setSeats(n)}
                className={`rounded-lg py-1 transition ${
                  seats === n
                    ? "bg-accent-500 text-white"
                    : "bg-white border border-gray-200 hover:border-accent-500"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Toggle billing */}
        <div className="flex sm:flex-col gap-1 bg-gray-100 rounded-2xl p-1">
          <button
            onClick={() => setBilling("monthly")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              billing === "monthly"
                ? "bg-white text-primary-500 shadow"
                : "text-gray-500"
            }`}
          >
            Mensuel
          </button>
          <button
            onClick={() => setBilling("annual")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition relative ${
              billing === "annual"
                ? "bg-white text-primary-500 shadow"
                : "text-gray-500"
            }`}
          >
            Annuel
            <span className="absolute -top-1 -right-1 bg-success text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
              -21%
            </span>
          </button>
        </div>

        {/* Résultat */}
        <div className="text-center sm:text-right">
          {result.isQuote ? (
            <>
              <p className="text-3xl font-extrabold text-primary-500">
                Sur devis
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Au-delà de 250 utilisateurs, on construit ensemble.
              </p>
              <a
                href="mailto:contact@humanix-cybersecurity.fr"
                className="btn-primary text-xs mt-3 inline-flex"
              >
                Demander un devis
              </a>
            </>
          ) : (
            <>
              <p className="text-xs uppercase text-gray-500 font-bold tracking-wide">
                Offre {result.tier.name}
              </p>
              <p className="text-4xl sm:text-5xl font-extrabold text-primary-500 mt-1">
                {monthlyTotal.toLocaleString("fr-FR")} €
                <span className="text-sm text-gray-500 font-medium">
                  /mois HT
                </span>
              </p>
              {result.tier.pricing.monthly.unit === "user" && (
                <p className="text-xs text-gray-600">
                  soit {result.perUser.toLocaleString("fr-FR")}{" "}
                  €/utilisateur/mois
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Annuel :{" "}
                <strong>{annualTotal.toLocaleString("fr-FR")} €</strong> HT
              </p>
              {billing === "annual" && savingsAmount > 0 && (
                <p className="text-xs text-success font-bold mt-1">
                  Tu économises {savingsAmount.toLocaleString("fr-FR")} €/an 🎉
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
