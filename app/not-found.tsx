import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <p className="text-8xl sm:text-9xl font-bold tracking-tighter text-white/10 select-none">
        404
      </p>
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mt-4">
        Page introuvable
      </h1>
      <p className="text-muted mt-2 max-w-md">
        La page que vous cherchez n&apos;existe pas ou a ete deplacee.
      </p>
      <Link
        href="/fr"
        className="mt-8 px-6 py-3 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-full transition-colors"
      >
        Retour a l&apos;accueil
      </Link>
    </div>
  );
}
