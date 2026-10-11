import { NextResponse, type NextRequest } from "next/server";
import { lireJeton } from "@/lib/liens";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

// Public : désabonnement des courriels et textos (lien signé /d/<jeton>).
export async function POST(request: NextRequest) {
  const { jeton } = (await request.json().catch(() => ({}))) as { jeton?: string };
  const id = lireJeton("desabonnement", jeton);
  if (!id) return NextResponse.json({ error: "Lien invalide." }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: contact, error } = await admin
    .from("contacts")
    .update({ sms_desabonne: true, courriel_desabonne: true })
    .eq("id", id)
    .select("entreprise_id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!contact) return NextResponse.json({ error: "Contact introuvable." }, { status: 404 });

  await admin.from("activites").insert({
    entreprise_id: contact.entreprise_id,
    membre_id: null,
    type: "note",
    resultat: "Désabonné",
    note: "Le contact s'est désabonné des courriels et textos.",
  });
  return NextResponse.json({ ok: true });
}
