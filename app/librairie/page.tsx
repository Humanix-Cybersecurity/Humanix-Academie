// Catalogue librairie micro-learning
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LibrairiePage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/demo");

  const { category } = await searchParams;

  const articles = await db.libraryArticle.findMany({
    where: {
      isPublished: true,
      ...(category ? { category } : {}),
    },
    orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
  });

  const allCategories = await db.libraryArticle.findMany({
    where: { isPublished: true },
    select: { category: true },
    distinct: ["category"],
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 animate-fadeIn">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-primary-500 mb-2">📚 Librairie</h1>
      <p className="text-gray-600 mb-6">
        Articles courts et autonomes pour apprendre à ton rythme. 5 à 10 minutes par lecture.
      </p>

      <div className="flex flex-wrap gap-2 mb-6 text-xs">
        <Link
          href="/librairie"
          className={`px-3 py-1 rounded-full border ${
            !category ? "bg-accent-500 text-white border-accent-500" : "bg-white border-gray-200 hover:border-accent-500"
          }`}
        >
          Tous
        </Link>
        {allCategories.map((c) => (
          <Link
            key={c.category}
            href={`/librairie?category=${c.category}`}
            className={`px-3 py-1 rounded-full border ${
              category === c.category ? "bg-accent-500 text-white border-accent-500" : "bg-white border-gray-200 hover:border-accent-500"
            }`}
          >
            {c.category}
          </Link>
        ))}
      </div>

      {articles.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-5xl mb-3">📖</p>
          <p className="text-gray-500">Aucun article dans cette catégorie.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {articles.map((a) => (
            <Link
              key={a.id}
              href={`/librairie/${a.slug}`}
              className="card hover:scale-[1.02] hover:shadow-lg transition-all flex flex-col"
            >
              <div className="text-5xl mb-3">{a.emoji}</div>
              <h3 className="font-bold text-primary-500 text-lg mb-1">{a.title}</h3>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2 flex-1">{a.description}</p>
              <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                <span>⏱ {a.readTimeMinutes} min</span>
                <span className="bg-gray-100 px-2 py-0.5 rounded-full">{a.category}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
