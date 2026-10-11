import { NextResponse, type NextRequest } from "next/server";
import { passeAutomatisations } from "@/lib/automatisations/passe";
import { normaliserTelephone } from "@/lib/coordonnees";
import { repondreDegustation } from "@/lib/reponsesClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { intentionTexto, lireTextoRecu, signatureTelnyxValide } from "@/lib/telnyx";

export const runtime = "nodejs";

// Webhook Telnyx : textos reçus sur le numéro Chef Mayer.
//   STOP / ARRÊT  → le contact ne reçoit plus de textos
//   START         → réabonné
//   OUI           → confirme sa prochaine dégustation
// Tout texto reçu est noté dans l'historique de l'entreprise.
export async function POST(request: NextRequest) {
  const corps = await request.text();
  const valide = signatureTelnyxValide(
    corps,
    request.headers.get("telnyx-signature-ed25519"),
    request.headers.get("telnyx-timestamp"),
    process.env.TELNYX_CLE_PUBLIQUE
  );
  if (!valide) return NextResponse.json({ error: "Signature invalide." }, { status: 401 });

  let evenement: unknown;
  try {
    evenement = JSON.parse(corps);
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }
  const texto = lireTextoRecu(evenement);
  if (!texto) return NextResponse.json({ ignore: true });

  const telephone = normaliserTelephone(texto.de).e164;
  if (!telephone) return NextResponse.json({ ignore: true });

  const admin = supabaseAdmin();
  const { data: contacts } = await admin
    .from("contacts")
    .select("id, entreprise_id")
    .eq("telephone", telephone);
  if (!contacts?.length) return NextResponse.json({ inconnu: true });

  const intention = intentionTexto(texto.texte);
  const ids = contacts.map((c) => c.id);
  const entreprises = [...new Set(contacts.map((c) => c.entreprise_id))];

  if (intention === "stop" || intention === "reprise") {
    await admin.from("contacts").update({ sms_desabonne: intention === "stop" }).in("id", ids);
  }

  let confirmee: string | null = null;
  if (intention === "oui") {
    const { data: prochaine } = await admin
      .from("degustations")
      .select("id")
      .in("contact_id", ids)
      .eq("statut", "reservee")
      .gt("debut", new Date().toISOString())
      .order("debut")
      .limit(1)
      .maybeSingle();
    if (prochaine) {
      const r = await repondreDegustation(admin, prochaine.id, "confirmer", "par texto");
      if (r.ok && r.changement) confirmee = prochaine.id;
    }
  }

  await admin.from("activites").insert(
    entreprises.map((entreprise_id) => ({
      entreprise_id,
      membre_id: null,
      type: "texto",
      resultat:
        intention === "stop"
          ? "Désabonné des textos"
          : intention === "reprise"
            ? "Réabonné aux textos"
            : confirmee
              ? "Texto reçu : dégustation confirmée"
              : "Texto reçu",
      note: texto.texte.slice(0, 1000),
    }))
  );

  if (confirmee) {
    await passeAutomatisations(admin, { degustationId: confirmee }).catch((e) => console.error("Alerte équipe", e));
  }
  return NextResponse.json({ ok: true, intention });
}
