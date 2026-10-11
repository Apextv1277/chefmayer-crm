import type { SupabaseClient } from "@supabase/supabase-js";
import { degustationActive, type StatutDegustation } from "./degustations";

// Réponse d'un client à sa dégustation (lien du courriel ou texto « OUI »).
export type ActionClient = "confirmer" | "reporter";

export type ResultatReponse =
  | { ok: true; statut: StatutDegustation; changement: boolean }
  | { ok: false; raison: string };

export async function repondreDegustation(
  supabase: SupabaseClient,
  degustationId: string,
  action: ActionClient,
  source: string
): Promise<ResultatReponse> {
  const { data: d, error } = await supabase
    .from("degustations")
    .select("id, entreprise_id, statut, debut")
    .eq("id", degustationId)
    .maybeSingle();
  if (error) return { ok: false, raison: error.message };
  if (!d) return { ok: false, raison: "Dégustation introuvable." };

  const statut = d.statut as StatutDegustation;
  if (!degustationActive(statut) && statut !== "a_reporter") {
    return { ok: false, raison: "Cette dégustation n'est plus modifiable." };
  }
  if (new Date(d.debut).getTime() < Date.now()) {
    return { ok: false, raison: "Cette dégustation est déjà passée." };
  }

  const nouveau: StatutDegustation = action === "confirmer" ? "confirmee" : "a_reporter";
  if (nouveau === statut) return { ok: true, statut, changement: false };

  const { error: erreurMaj } = await supabase
    .from("degustations")
    .update({ statut: nouveau })
    .eq("id", d.id)
    .eq("statut", statut);
  if (erreurMaj) return { ok: false, raison: erreurMaj.message };

  await supabase.from("activites").insert({
    entreprise_id: d.entreprise_id,
    membre_id: null,
    type: "degustation",
    resultat: action === "confirmer" ? "Confirmée par le client" : "Le client demande de reporter",
    note: `Réponse reçue ${source}.`,
  });

  if (action === "reporter") {
    await supabase
      .from("entreprises")
      .update({ statut: "Rappel prévu", date_rappel: new Date().toISOString() })
      .eq("id", d.entreprise_id)
      .eq("statut", "Dégustation réservée");
  }

  return { ok: true, statut: nouveau, changement: true };
}
