import { NextResponse, type NextRequest } from "next/server";
import { normaliserCourriel, normaliserTelephone } from "@/lib/coordonnees";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { membreDeLaRequete } from "@/lib/supabaseServeur";

export const runtime = "nodejs";

const ROLES = ["admin", "chef", "representant"] as const;

// Ajout d'un membre (admin seulement) : crée son accès Supabase avec un
// mot de passe temporaire et sa fiche dans l'équipe.
export async function POST(request: NextRequest) {
  const membre = await membreDeLaRequete();
  if (membre?.role !== "admin") return NextResponse.json({ error: "Réservé à l'administrateur." }, { status: 403 });

  const corps = (await request.json().catch(() => ({}))) as {
    email?: string;
    nom?: string;
    role?: string;
    telephone?: string;
    motDePasse?: string;
  };
  const email = normaliserCourriel(corps.email);
  const nom = corps.nom?.trim();
  const role = ROLES.find((r) => r === corps.role);
  if (!email || !nom || !role) return NextResponse.json({ error: "Courriel, nom et rôle sont obligatoires." }, { status: 400 });
  if (!corps.motDePasse || corps.motDePasse.length < 10) {
    return NextResponse.json({ error: "Le mot de passe temporaire doit avoir au moins 10 caractères." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { error: erreurAuth } = await admin.auth.admin.createUser({
    email,
    password: corps.motDePasse,
    email_confirm: true,
  });
  if (erreurAuth && !/already|registered|exists/i.test(erreurAuth.message)) {
    return NextResponse.json({ error: erreurAuth.message }, { status: 400 });
  }

  const { error } = await admin.from("membres").upsert(
    { email, nom, role, telephone: normaliserTelephone(corps.telephone).e164, actif: true },
    { onConflict: "email" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
