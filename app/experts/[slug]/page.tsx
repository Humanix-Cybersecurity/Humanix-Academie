// Profil expert public + ses modules.

import { notFound } from "next/navigation";
import Link from "next/link";
import { getExpertBySlug } from "@/lib/experts";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const expert = await getExpertBySlug(slug);
  if (!expert) return { title: "Expert introuvable | Humanix Académie" };
  const name = expert.user.name ?? "Expert cyber";
  return {
    title: `${name} — Bibliothèque d'experts | Humanix Académie`,
    description: expert.bio.slice(0, 160),
  };
}

export default async function ExpertProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const expert = await getExpertBySlug(slug);
  if (!expert) notFound();

  const name = expert.user.name ?? expert.user.email.split("@")[0];
  const credentials = expert.credentials.split(",").map((s) => s.trim()).filter(Boolean);
  const tags = expert.expertiseTags.split(",").map((s) => s.trim()).filter(Boolean);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link
        href="/experts"
        className="text-sm text-accent-500 hover:underline mb-6 inline-block"
      >
        ← Retour à la bibliothèque d'experts
      </Link>

      {/* Hero profil */}
      <div className="card mb-8">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {expert.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={expert.avatarUrl}
              alt=""
              className="w-32 h-32 rounded-2xl object-cover border-4 border-accent-200"
            />
          ) : (
            <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-extrabold text-4xl shrink-0">
              {initials(name)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-widest text-accent-500 font-bold mb-1">
              Expert contributeur Humanix
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-primary-500 mb-2">
              {name}
            </h1>
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-3">
              {expert.headline}
            </p>
            {expert.organization && (
              <p className="text-sm text-gray-500 mb-3">
                <span aria-hidden="true">🏢</span> {expert.organization}
              </p>
            )}

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="text-xs font-bold uppercase bg-accent-50 text-accent-700 px-2 py-1 rounded-full"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-3 text-sm">
              {expert.linkedinUrl && (
                <a
                  href={expert.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-500 hover:underline font-medium"
                >
                  LinkedIn ↗
                </a>
              )}
              {expert.websiteUrl && (
                <a
                  href={expert.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-500 hover:underline font-medium"
                >
                  Site ↗
                </a>
              )}
            </div>
          </div>

          <div className="text-center shrink-0 sm:border-l sm:border-gray-200 sm:pl-6 sm:pt-2">
            <p className="text-3xl font-extrabold text-accent-500">
              {expert.modulesCount}
            </p>
            <p className="text-xs uppercase text-gray-500">
              module{expert.modulesCount > 1 ? "s" : ""}
            </p>
            {expert.totalInstalls > 0 && (
              <>
                <p className="text-2xl font-extrabold text-primary-500 mt-3">
                  {expert.totalInstalls}
                </p>
                <p className="text-xs uppercase text-gray-500">
                  installation{expert.totalInstalls > 1 ? "s" : ""}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bio */}
      <section className="card mb-8">
        <h2 className="text-xl font-bold text-primary-500 mb-3">À propos</h2>
        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line text-gray-700 dark:text-gray-300">
          {expert.bio}
        </div>
      </section>

      {/* Distinctions */}
      {credentials.length > 0 && (
        <section className="card mb-8">
          <h2 className="text-xl font-bold text-primary-500 mb-3">
            Certifications &amp; distinctions
          </h2>
          <ul className="space-y-2">
            {credentials.map((c) => (
              <li key={c} className="flex items-start gap-2 text-sm">
                <span className="text-accent-500 mt-0.5" aria-hidden="true">✓</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Modules */}
      <section>
        <h2 className="text-xl font-bold text-primary-500 mb-4">
          Modules signés par {name}
        </h2>
        {expert.user.authoredModules.length === 0 ? (
          <p className="text-sm text-gray-500">
            Aucun module publié pour l'instant. Le premier arrive bientôt.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {expert.user.authoredModules.map((m) => (
              <Link
                key={m.id}
                href={`/marketplace/${m.slug}`}
                className="card hover:shadow-lg transition-all flex flex-col"
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className="text-3xl" aria-hidden="true">{m.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-primary-500">{m.title}</p>
                    {m.isOfficial && (
                      <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                        Officiel Humanix
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">
                  {m.description}
                </p>
                <div className="text-xs text-gray-500 mt-auto pt-2 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
                  <span>
                    {m.category} · {m.difficulty}
                  </span>
                  {m.installCount > 0 && (
                    <span>{m.installCount} install.</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
