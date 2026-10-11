import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabaseAdmin";

export type MembreServeur = { id: string; email: string; nom: string; role: "admin" | "chef" | "representant" };

// Membre connecté (actif) d'une route API, ou null.
export async function membreDeLaRequete(): Promise<MembreServeur | null> {
  const magasin = await cookies();
  const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => magasin.getAll(),
      setAll: () => {},
    },
  });
  const {
    data: { user },
  } = await client.auth.getUser();
  const email = user?.email?.trim().toLowerCase();
  if (!email) return null;
  const { data } = await supabaseAdmin()
    .from("membres")
    .select("id, email, nom, role")
    .eq("email", email)
    .eq("actif", true)
    .maybeSingle();
  return (data as MembreServeur | null) ?? null;
}

// Le membre peut-il voir cette entreprise ? (même règle que la RLS)
export async function peutVoirEntreprise(membre: MembreServeur, entrepriseId: string): Promise<boolean> {
  if (membre.role !== "representant") return true;
  const { data } = await supabaseAdmin()
    .from("entreprises")
    .select("id")
    .eq("id", entrepriseId)
    .eq("assigne_a", membre.id)
    .maybeSingle();
  return Boolean(data);
}
