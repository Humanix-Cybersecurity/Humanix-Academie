"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Panel client pour /profil/securite : changer mdp, activer/desactiver 2FA,
// regenerer codes de secours. Toute la logique passe par les server actions
// dans /app/profil/securite/actions.ts (defense en profondeur cote serveur).

import { useEffect, useState, useTransition } from "react";
import QRCode from "qrcode";
import {
  setPassword,
  startMfaEnrollment,
  confirmMfaEnrollment,
  disableMfa,
  regenerateBackupCodes,
} from "@/app/profil/securite/actions";

type Props = {
  email: string;
  hasPassword: boolean;
  passwordUpdatedAt: string | null;
  mfaEnabled: boolean;
  mfaEnabledAt: string | null;
  mfaForced: boolean;
  backupCodesRemaining: number;
  lastLoginAt: string | null;
};

export default function SecurityPanel(props: Props) {
  return (
    <div className="space-y-6">
      <PasswordSection
        hasPassword={props.hasPassword}
        passwordUpdatedAt={props.passwordUpdatedAt}
      />
      <MfaSection
        email={props.email}
        mfaEnabled={props.mfaEnabled}
        mfaEnabledAt={props.mfaEnabledAt}
        mfaForced={props.mfaForced}
        hasPassword={props.hasPassword}
        backupCodesRemaining={props.backupCodesRemaining}
      />
      {props.lastLoginAt && (
        <p className="text-xs text-gray-500 italic">
          Dernière connexion : {new Date(props.lastLoginAt).toLocaleString("fr-FR")}
        </p>
      )}
    </div>
  );
}

// =====================================================
// MOT DE PASSE
// =====================================================
function PasswordSection({
  hasPassword,
  passwordUpdatedAt,
}: {
  hasPassword: boolean;
  passwordUpdatedAt: string | null;
}) {
  const [open, setOpen] = useState(!hasPassword);
  const [current, setCurrent] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const fd = new FormData();
    fd.set("currentPassword", current);
    fd.set("newPassword", pwd);
    fd.set("newPasswordConfirm", pwd2);
    startTransition(async () => {
      const res = await setPassword(fd);
      if (res.ok) {
        setSuccess(true);
        setCurrent("");
        setPwd("");
        setPwd2("");
        setOpen(false);
      } else {
        setError(res.error ?? "Erreur");
      }
    });
  };

  return (
    <section className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
      <header className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="font-display text-lg font-extrabold text-primary-500 dark:text-accent-300 flex items-center gap-2">
            🔐 Mot de passe
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {hasPassword
              ? passwordUpdatedAt
                ? `Modifié le ${new Date(passwordUpdatedAt).toLocaleDateString("fr-FR")}`
                : "Mot de passe défini"
              : "Aucun mot de passe défini : tu te connectes par lien magique uniquement."}
          </p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="btn-secondary text-xs"
          >
            {hasPassword ? "Changer" : "Définir"}
          </button>
        )}
      </header>

      {success && (
        <p
          role="status"
          className="text-sm bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg p-3 mb-3"
        >
          ✅ Mot de passe enregistré.
        </p>
      )}

      {open && (
        <form onSubmit={onSubmit} className="space-y-3">
          {error && (
            <div
              role="alert"
              className="text-sm bg-amber-50 border border-amber-300 text-amber-900 rounded-lg p-3"
            >
              {error}
            </div>
          )}
          {hasPassword && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Mot de passe actuel
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className="block w-full rounded-lg border-2 border-gray-200 dark:border-slate-700 p-2.5 text-sm"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">
              Nouveau mot de passe (10 caractères min, 3 types parmi maj/min/chiffre/symbole)
            </label>
            <input
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              className="block w-full rounded-lg border-2 border-gray-200 dark:border-slate-700 p-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Confirmation
            </label>
            <input
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              value={pwd2}
              onChange={(e) => setPwd2(e.target.value)}
              className="block w-full rounded-lg border-2 border-gray-200 dark:border-slate-700 p-2.5 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="btn-primary text-sm"
            >
              {pending ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-secondary text-sm"
            >
              Annuler
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

// =====================================================
// 2FA TOTP
// =====================================================
function MfaSection({
  email,
  mfaEnabled,
  mfaEnabledAt,
  mfaForced,
  hasPassword,
  backupCodesRemaining,
}: {
  email: string;
  mfaEnabled: boolean;
  mfaEnabledAt: string | null;
  mfaForced: boolean;
  hasPassword: boolean;
  backupCodesRemaining: number;
}) {
  const [enrolling, setEnrolling] = useState(false);
  const [enrollment, setEnrollment] = useState<{
    secret: string;
    otpauthUri: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shownBackupCodes, setShownBackupCodes] = useState<string[] | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  // Desactivation
  const [disablePwd, setDisablePwd] = useState("");
  const [disabling, setDisabling] = useState(false);

  // Helper : surface tout throw du server action en message visible. Sans
  // ce wrapper, un throw côté serveur (session expirée, DB transient, etc.)
  // termine la transition silencieusement et l'UI semble bloquée.
  const surfaceError = (err: unknown): string => {
    if (err instanceof Error) {
      // eslint-disable-next-line no-console
      console.error("[mfa] server action threw:", err);
      return `Erreur serveur : ${err.message}. Recharge la page si ça persiste.`;
    }
    return "Erreur serveur inconnue. Recharge la page si ça persiste.";
  };

  const onStart = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await startMfaEnrollment();
        if (res.ok && res.secret && res.otpauthUri) {
          setEnrollment({ secret: res.secret, otpauthUri: res.otpauthUri });
          setEnrolling(true);
        } else {
          setError(res.error ?? "Erreur lors de la préparation de la 2FA.");
        }
      } catch (err) {
        setError(surfaceError(err));
      }
    });
  };

  const onConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("code", code);
    startTransition(async () => {
      try {
        const res = await confirmMfaEnrollment(fd);
        if (res.ok && res.backupCodes) {
          setShownBackupCodes(res.backupCodes);
          setEnrolling(false);
          setEnrollment(null);
          setCode("");
        } else {
          setError(res.error ?? "Code invalide.");
        }
      } catch (err) {
        setError(surfaceError(err));
      }
    });
  };

  const onDisable = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("password", disablePwd);
    startTransition(async () => {
      try {
        const res = await disableMfa(fd);
        if (res.ok) {
          setDisabling(false);
          setDisablePwd("");
          // page sera revalidée par revalidatePath, refresh requis pour voir l'etat
          window.location.reload();
        } else {
          setError(res.error ?? "Erreur lors de la désactivation.");
        }
      } catch (err) {
        setError(surfaceError(err));
      }
    });
  };

  const onRegenerate = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await regenerateBackupCodes();
        if (res.ok && res.backupCodes) {
          setShownBackupCodes(res.backupCodes);
        } else {
          setError(res.error ?? "Erreur lors de la regénération.");
        }
      } catch (err) {
        setError(surfaceError(err));
      }
    });
  };

  return (
    <section className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
      <header className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="font-display text-lg font-extrabold text-primary-500 dark:text-accent-300 flex items-center gap-2">
            🛡️ Authentification à deux facteurs
            {mfaEnabled && (
              <span className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                Activée
              </span>
            )}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {mfaEnabled
              ? mfaEnabledAt
                ? `Activée le ${new Date(mfaEnabledAt).toLocaleDateString("fr-FR")}`
                : "Activée"
              : mfaForced
                ? "⚠️ Votre administrateur exige que vous l'activiez."
                : "Recommandé. Compatible Google Authenticator, Authy, 1Password, Microsoft Authenticator, FreeOTP."}
          </p>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="text-sm bg-amber-50 border border-amber-300 text-amber-900 rounded-lg p-3 mb-3"
        >
          {error}
        </div>
      )}

      {/* Enrôlement */}
      {!mfaEnabled && !enrolling && (
        <button
          type="button"
          onClick={onStart}
          disabled={pending}
          className="btn-primary text-sm"
        >
          {pending ? "Préparation…" : "Activer la 2FA"}
        </button>
      )}

      {!mfaEnabled && enrolling && enrollment && (
        <div className="space-y-4">
          <TotpEnrollmentBox
            secret={enrollment.secret}
            otpauthUri={enrollment.otpauthUri}
            email={email}
          />
          <form onSubmit={onConfirm} className="space-y-2">
            <label
              htmlFor="mfa-enroll-code"
              className="block text-sm font-medium"
            >
              2. Saisissez le code à 6 chiffres affiché par votre application
            </label>
            <input
              id="mfa-enroll-code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="block w-full rounded-lg border-2 border-accent-500 p-2.5 text-center font-mono tracking-widest text-lg"
              autoFocus
              aria-describedby="mfa-enroll-help"
            />
            <p id="mfa-enroll-help" className="text-xs text-gray-500">
              Le code change toutes les 30 secondes. Si l&apos;heure de votre
              téléphone est désynchronisée de plus d&apos;une minute, le code
              sera refusé : activez « heure réseau automatique » sur l&apos;OS
              du téléphone.
            </p>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pending || code.length !== 6}
                className="btn-primary text-sm"
              >
                Confirmer
              </button>
              <button
                type="button"
                onClick={() => {
                  setEnrolling(false);
                  setEnrollment(null);
                  setCode("");
                }}
                className="btn-secondary text-sm"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Codes de secours fraîchement générés */}
      {shownBackupCodes && (
        <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-xl p-4">
          <p className="font-bold text-amber-900 dark:text-amber-200 mb-2">
            ⚠️ Codes de secours - copiez-les MAINTENANT
          </p>
          <p className="text-xs text-amber-800 dark:text-amber-300 mb-3">
            Ces codes ne seront plus jamais affichés. Stockez-les dans un
            gestionnaire de mots de passe ou imprimez-les. Chaque code est à
            usage unique.
          </p>
          <ul className="grid grid-cols-2 gap-2 font-mono text-sm">
            {shownBackupCodes.map((c) => (
              <li
                key={c}
                className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded px-2 py-1"
              >
                {c}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(shownBackupCodes.join("\n"));
            }}
            className="btn-secondary text-xs mt-3"
          >
            📋 Copier tous les codes
          </button>
          <button
            type="button"
            onClick={() => setShownBackupCodes(null)}
            className="text-xs underline ml-2"
          >
            J'ai sauvegardé mes codes
          </button>
        </div>
      )}

      {/* Etat actif : codes de secours, regeneration, desactivation */}
      {mfaEnabled && !shownBackupCodes && (
        <div className="space-y-3">
          <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 text-sm">
            <p>
              Codes de secours restants :{" "}
              <strong>{backupCodesRemaining}</strong> / 10
            </p>
            {backupCodesRemaining < 3 && (
              <p className="text-amber-700 dark:text-amber-300 text-xs mt-1">
                ⚠️ Il vous reste peu de codes de secours, pensez à les
                regénérer.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onRegenerate}
              disabled={pending}
              className="btn-secondary text-sm"
            >
              🔄 Regénérer les codes de secours
            </button>
            {!mfaForced && (
              <button
                type="button"
                onClick={() => setDisabling(true)}
                disabled={pending}
                className="text-sm text-rose-700 hover:underline"
              >
                Désactiver la 2FA
              </button>
            )}
          </div>

          {disabling && (
            <form
              onSubmit={onDisable}
              className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-3 space-y-2"
            >
              <p className="text-sm font-bold text-rose-900 dark:text-rose-200">
                Désactiver la 2FA fragilise votre compte. Confirmez avec votre
                mot de passe.
              </p>
              {hasPassword && (
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={disablePwd}
                  onChange={(e) => setDisablePwd(e.target.value)}
                  placeholder="Votre mot de passe"
                  className="block w-full rounded-lg border-2 border-rose-300 dark:border-rose-700 p-2 text-sm"
                />
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold"
                >
                  Désactiver
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDisabling(false);
                    setDisablePwd("");
                  }}
                  className="btn-secondary text-sm"
                >
                  Annuler
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  );
}

// ===========================================================================
// TotpEnrollmentBox - QR code + URI + secret en saisie manuelle (fallback)
// ===========================================================================
function TotpEnrollmentBox({
  secret,
  otpauthUri,
  email,
}: {
  secret: string;
  otpauthUri: string;
  email: string;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(otpauthUri, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 220,
      color: { dark: "#0B3D91", light: "#FFFFFF" },
    })
      .then((url) => setQrDataUrl(url))
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "QR error";
        setQrError(msg);
      });
  }, [otpauthUri]);

  return (
    <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 space-y-3">
      <p className="text-sm font-bold">
        1. Ajoutez ce compte à votre application d&apos;authentification
      </p>
      <p className="text-xs text-gray-600 dark:text-gray-300">
        Ouvrez Google Authenticator, Authy, 1Password, Microsoft Authenticator
        ou FreeOTP et choisissez l&apos;une des 3 options ci-dessous.
      </p>

      {/* Option A - QR code (recommandé) */}
      <div className="bg-white dark:bg-slate-900 border-2 border-accent-200 dark:border-accent-900/40 rounded-lg p-3 flex items-start gap-3">
        <div className="shrink-0">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt="QR code de configuration 2FA"
              width={140}
              height={140}
              className="block bg-white p-1 rounded"
            />
          ) : qrError ? (
            <div className="w-[140px] h-[140px] flex items-center justify-center text-xs text-rose-700 bg-rose-50 rounded">
              QR indisponible : {qrError}
            </div>
          ) : (
            <div className="w-[140px] h-[140px] flex items-center justify-center text-xs text-gray-400 bg-gray-100 rounded animate-pulse">
              Génération…
            </div>
          )}
        </div>
        <div className="text-xs space-y-1">
          <p className="font-bold text-accent-700 dark:text-accent-300">
            Option A · QR code (recommandé)
          </p>
          <p>
            Dans votre app, choisissez « Scanner un QR code » et pointez la
            caméra sur l&apos;image à gauche.
          </p>
        </div>
      </div>

      {/* Option B - Saisie manuelle (secret) */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded p-2 text-xs">
        <p className="font-bold text-gray-700 dark:text-gray-200 mb-1">
          Option B · Saisie manuelle
        </p>
        <p className="text-gray-500 mb-1">
          Si la caméra n&apos;est pas dispo. Choisissez « Saisir le code
          manuellement » et entrez :
        </p>
        <ul className="space-y-1 mt-1">
          <li>
            <span className="text-gray-500">Compte :</span>{" "}
            <code className="font-mono">{email}</code>
          </li>
          <li>
            <span className="text-gray-500">Émetteur :</span>{" "}
            <code className="font-mono">Humanix Académie</code>
          </li>
          <li>
            <span className="text-gray-500">Secret (base32) :</span>
          </li>
        </ul>
        <p className="font-mono break-all select-all mt-1 bg-gray-50 dark:bg-slate-800 p-1 rounded">
          {secret}
        </p>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(secret);
          }}
          className="text-xs underline mt-1 text-accent-700"
        >
          📋 Copier le secret
        </button>
      </div>

      {/* Option C - URI otpauth (avancé, pour 1Password / passwordstate) */}
      <details className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded p-2 text-xs">
        <summary className="cursor-pointer font-bold text-gray-700 dark:text-gray-200">
          Option C · URI otpauth (avancé)
        </summary>
        <p className="text-gray-500 mt-2">
          Pour les apps qui acceptent un import par URI (1Password,
          Bitwarden) - collez le lien ci-dessous.
        </p>
        <p className="font-mono break-all select-all mt-1 bg-gray-50 dark:bg-slate-800 p-1 rounded">
          {otpauthUri}
        </p>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(otpauthUri);
          }}
          className="text-xs underline mt-1 text-accent-700"
        >
          📋 Copier l&apos;URI
        </button>
      </details>
    </div>
  );
}
