// Page detail moderation : voir l'integralite du module avant de trancher
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminNav from "@/components/AdminNav";
import { shortHash } from "@/lib/marketplace/integrity";
import type { ModulePayload } from "@/lib/marketplace/schema";
import ModerationActions from "@/components/marketplace/ModerationActions";

export const dynamic = "force-dynamic";

export default async function ModerationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/demo");
  const role = (session.user as any).role;
  if (role !== "SUPERADMIN") redirect("/admin");

  const { id } = await params;
  const m = await db.marketplaceModule.findUnique({
    where: { id },
    include: { author: { select: { name: true, email: true } } },
  });
  if (!m) notFound();
  const payload = m.payload as unknown as ModulePayload;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-extrabold text-primary-500">Console dirigeant</h1>
      <p className="text-gray-600 mb-6">Gestion fine de votre programme de sensibilisation cyber.</p>
      <AdminNav />

      <Link href="/admin/moderation" className="text-sm text-gray-500 hover:text-primary-500 mb-3 inline-block">
        ← File de modération
      </Link>

      <div className="card mb-4">
        <div className="flex items-start gap-4">
          <span className="text-5xl">{m.emoji}</span>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-primary-500">{m.title}</h2>
            <p className="text-gray-600 mt-1">{m.description}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{m.category}</span>
              <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{m.difficulty}</span>
              <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{m.license}</span>
              <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{m.language.toUpperCase()}</span>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Auteur : <strong>{m.author.name ?? m.author.email}</strong>
              {m.authorOrgName && <> ({m.authorOrgName})</>}
              <br />
              Soumis le {m.submittedAt?.toLocaleString("fr-FR")}<br />
              Slug : <code>{m.slug}</code>
              <br />
              SHA-256 : <code className="font-mono">{shortHash(m.contentHash)}</code>
            </p>
          </div>
        </div>
      </div>

      {/* Episodes detail */}
      {payload.episodes.map((ep, i) => (
        <div key={i} className="card mb-3">
          <h3 className="font-bold text-primary-500 text-lg mb-2">
            Épisode {i + 1} — {ep.title} ({ep.durationMinutes} min · +{ep.xpReward} XP)
          </h3>

          <p className="text-xs uppercase tracking-wide text-gray-500 font-bold mt-2">Scénario</p>
          <div className="bg-gray-50 rounded-xl p-3 my-2 whitespace-pre-line text-sm">{ep.scenario}</div>

          <p className="text-xs uppercase tracking-wide text-gray-500 font-bold mt-3">Choix</p>
          <ul className="text-sm space-y-2 mt-1">
            {ep.choices.map((c) => (
              <li key={c.id} className="bg-white border rounded-xl p-2">
                <p className="font-medium">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded mr-2 ${
                      c.outcome === "good" ? "bg-success/10 text-success" : c.outcome === "bad" ? "bg-red-100 text-warn" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {c.outcome.toUpperCase()} · {c.points >= 0 ? "+" : ""}{c.points}
                  </span>
                  {c.label}
                </p>
                <p className="text-xs text-gray-600 italic mt-1">{c.feedback}</p>
              </li>
            ))}
          </ul>

          <p className="text-xs uppercase tracking-wide text-gray-500 font-bold mt-3">Débrief</p>
          <div className="bg-primary-50 rounded-xl p-3 my-2 whitespace-pre-line text-sm border-l-4 border-accent-500">
            {ep.debrief}
          </div>

          <p className="text-xs uppercase tracking-wide text-gray-500 font-bold mt-3">Quiz</p>
          <ol className="text-sm space-y-2 mt-1 list-decimal pl-5">
            {ep.quiz.map((q, qi) => (
              <li key={qi}>
                <p className="font-medium">{q.question}</p>
                <ul className="text-xs space-y-0.5 mt-1">
                  {q.choices.map((c) => (
                    <li key={c.id} className={c.correct ? "text-success font-bold" : "text-gray-600"}>
                      {c.correct ? "✓ " : "○ "}
                      {c.label}
                    </li>
                  ))}
                </ul>
                <p className="text-xs italic text-gray-500 mt-1">→ {q.explanation}</p>
              </li>
            ))}
          </ol>
        </div>
      ))}

      <div className="card sticky bottom-4 shadow-lg flex flex-wrap gap-2 justify-end items-center">
        <span className="text-sm text-gray-600 mr-auto">
          Décision pour : <strong>{m.title}</strong>
        </span>
        <ModerationActions moduleId={m.id} />
      </div>
    </div>
  );
}
