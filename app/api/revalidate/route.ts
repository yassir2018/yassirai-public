import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  // Revalidate all locale pages + project detail pages
  revalidatePath("/fr");
  revalidatePath("/en");
  revalidatePath("/ar");
  revalidatePath("/fr/projects/[slug]", "page");
  revalidatePath("/en/projects/[slug]", "page");
  revalidatePath("/ar/projects/[slug]", "page");

  return NextResponse.json({ revalidated: true, now: Date.now() });
}
