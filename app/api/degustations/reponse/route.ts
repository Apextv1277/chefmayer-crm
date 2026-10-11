import { NextResponse, type NextRequest } from "next/server";
import { passeAutomatisations } from "@/lib/automatisations/passe";
import { lireJeton } from "@/lib/liens";
import { repondreDegustation, type ActionClient } from "@/lib/reponsesClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

// Public : le client confirme ou reporte depuis le lien signé /c/<jeton>.
export async function POST(request: NextRequest) {
  const { jeton, action } = (await request.json().catch(() => ({}))) as { jeton?: string; action?: string };
  const id = lireJeton("degustation", jeton);
  if (!id || (action !== "confirmer" && action !== "reporter")) {
    return NextResponse.json({ error: "Lien invalide." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const resultat = await repondreDegustation(admin, id, action as ActionClient, "par le lien du courriel");
  if (!resultat.ok) return NextResponse.json({ error: resultat.raison }, { status: 409 });

  if (resultat.changement) {
    // Alerte l'équipe (confirmée ou à reporter) tout de suite.
    await passeAutomatisations(admin, { degustationId: id }).catch((e) => console.error("Alerte équipe", e));
  }
  return NextResponse.json({ statut: resultat.statut });
}
