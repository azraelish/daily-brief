import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export function supabaseServer() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: CookieOptions }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // RSC can't set cookies — middleware handles session refresh.
          }
        },
      },
    },
  );
}

export function ownerEmail(): string {
  const e = process.env.OWNER_EMAIL;
  if (!e) throw new Error("OWNER_EMAIL env var not set");
  return e.toLowerCase();
}

export async function getOwnerUser() {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  if ((user.email ?? "").toLowerCase() !== ownerEmail()) return null;
  return user;
}
