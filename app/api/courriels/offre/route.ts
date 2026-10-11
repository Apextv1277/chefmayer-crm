import { NextResponse, type NextRequest } from "next/server";
import { depotSupabase } from "@/lib/automatisations/depotSupabase";
import { executerEnvois } from "@/lib/automatisations/executer";
import { contexteAutomatisations, expediteurs } from "@/lib/automatisations/passe";
import { normaliserCourriel } from "@/lib/coordonnees";
import { courrielOffre } from "@/lib/gabarits";
import { lienDesabonnement } from "@/lib/liens";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { membreDeLaRequete, peutVoirEntreprise } from "@/lib/supabaseServeur";
import { dateLocale } from "@/lib/temps";

export const runtime = "nodejs";

// Courriel d'offre de dégustation, envoyé à la main depuis une fiche.
// Une seule fois par jour et par contact.
export async function POST(request: NextRequest) {
  const membre = await membreDeLaRequete();
  if (!membre) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { contactId } = (await request.json().catch(() => ({}))) as { contactId?: string };
  if (!contactId) return NextResponse.json({ error: "Contact manquant." }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: contact } = await admin
    .from("contacts")
    .select("id, prenom, courriel, courriel_desabonne, entreprise_id, entreprise:entreprises(nom, ne_plus_appeler)")
    .eq("id", contactId)
    .maybeSingle();
  if (!contact || !(await peutVoirEntreprise(membre, contact.entreprise_id))) {
    return NextResponse.json({ error: "Contact introuvable." }, { status: 404 });
  }
  const entreprise = contact.entreprise as unknown as { nom: string; ne_plus_appeler: boolean } | null;
  const courriel = normaliserCourriel(contact.courriel);
  if (!courriel) return NextResponse.json({ error: "Ce contact n'a pas de courriel valide." }, { status: 400 });
  if (contact.courriel_desabonne || entreprise?.ne_plus_appeler) {
    return NextResponse.json({ error: "Ce contact ne veut plus être sollicité." }, { status: 409 });
  }

  const maintenant = new Date();
  const ctx = await contexteAutomatisations(admin, maintenant);
  const message = courrielOffre(
    { entreprise: entreprise?.nom ?? "votre entreprise", prenom: contact.prenom },
    ctx.signature,
    lienDesabonnement(contact.id, ctx.site, ctx.cleLiens)
  );

  const bilan = await executerEnvois(
    [
      {
        cle: `offre:${contact.id}:${dateLocale(maintenant)}`,
        canal: "courriel",
        type: "offre",
        destinataire: courriel,
        sujet: message.sujet,
        texte: message.texte,
        html: message.html,
        entreprise_id: contact.entreprise_id,
        degustation_id: null,
        contact_id: contact.id,
      },
    ],
    depotSupabase(admin, membre.id),
    expediteurs()
  );

  if (bilan.dejaFaits) return NextResponse.json({ error: "Une offre a déjà été envoyée à ce contact aujourd'hui." }, { status: 409 });
  if (bilan.echecs) return NextResponse.json({ error: "Le courriel n'a pas pu partir. Voir le journal des messages." }, { status: 502 });

  await admin.from("activites").insert({
    entreprise_id: contact.entreprise_id,
    membre_id: membre.id,
    type: "courriel",
    resultat: bilan.tests ? "Offre de dégustation (mode test)" : "Offre de dégustation envoyée",
    note: `À ${courriel}`,
  });
  return NextResponse.json({ ok: true, test: bilan.tests > 0 });
}
