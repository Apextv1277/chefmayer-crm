import { NextResponse, type NextRequest } from "next/server";
import { passeAutomatisations } from "@/lib/automatisations/passe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { membreDeLaRequete, peutVoirEntreprise } from "@/lib/supabaseServeur";

export const runtime = "nodejs";

// Appelé par le CRM juste après une réservation ou un changement de
// statut : la confirmation part tout de suite, sans attendre le passage
// des 15 minutes.
export async function POST(request: NextRequest) {
  const membre = await membreDeLaRequete();
  if (!membre) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { id } = (await request.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ error: "Dégustation manquante." }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: d } = await admin.from("degustations").select("entreprise_id").eq("id", id).maybeSingle();
  if (!d || !(await peutVoirEntreprise(membre, d.entreprise_id))) {
    return NextResponse.json({ error: "Dégustation introuvable." }, { status: 404 });
  }

  try {
    const bilan = await passeAutomatisations(admin, { degustationId: id });
    return NextResponse.json(bilan);
  } catch (erreur) {
    console.error("Automatisations (dégustation)", erreur);
    return NextResponse.json({ error: "Les messages n'ont pas pu partir." }, { status: 500 });
  }
}
