// Lecture d'un article librairie
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import MarkdownView from "@/components/MarkdownView";
import TTSButton from "@/components/TTSButton";
import ShareArticleButton from "@/components/ShareArticleButton";
import { markdownToPlainText } from "@/lib/markdown";

export const dynamic = "force-dynamic";

export default async function ArticleReadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  const { slug } = await params;
  const article = await db.libraryArticle.findUnique({ where: { slug } });
  if (!article || !article.isPublished) notFound();

  // Articles publics (audience famille / tous) : accessibles SANS login.
  // Articles pro : auth requise.
  if (article.audience === "pro" && !session?.user) return redirect("/connexion");

  // Increment view count (fire-and-forget)
  db.libraryArticle
    .update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } },
    })
    .catch(() => {});

  const plainText = markdownToPlainText(article.body);

  // Articles "connexes" : meme categorie
  const related = await db.libraryArticle.findMany({
    where: {
      isPublished: true,
      category: article.category,
      id: { not: article.id },
    },
    take: 3,
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 animate-fadeIn">
      <Link
        href="/librairie"
        className="text-sm text-gray-500 hover:text-primary-500 mb-4 inline-block"
      >
        ← Retour à la librairie
      </Link>

      <article className="card">
        <div className="flex items-start gap-4 mb-6 pb-6 border-b border-gray-100">
          <span className="text-6xl">{article.emoji}</span>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary-500">
              {article.title}
            </h1>
            <p className="text-gray-600 mt-2">{article.description}</p>
            <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
              <span>⏱ {article.readTimeMinutes} min de lecture</span>
              <span>·</span>
              <span className="bg-gray-100 px-2 py-0.5 rounded-full">
                {article.category}
              </span>
              {article.authorName && (
                <>
                  <span>·</span>
                  <span>par {article.authorName}</span>
                </>
              )}
            </div>
            <div className="mt-3">
              <TTSButton text={plainText} label="Écouter l'article" />
            </div>
          </div>
        </div>

        <MarkdownView content={article.body} />

        {(article.audience === "famille" || article.audience === "tous") && (
          <ShareArticleButton
            slug={article.slug}
            title={article.title}
            description={article.description}
          />
        )}
      </article>

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-primary-500 mb-4">
            📚 À lire ensuite
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/librairie/${r.slug}`}
                className="card hover:scale-[1.02] hover:shadow-md transition"
              >
                <p className="text-3xl mb-2">{r.emoji}</p>
                <h3 className="font-bold text-primary-500 text-sm mb-1">
                  {r.title}
                </h3>
                <p className="text-xs text-gray-500">
                  ⏱ {r.readTimeMinutes} min
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
