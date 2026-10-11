import type { SupabaseClient } from "@supabase/supabase-js";
import { envoyerCourriel } from "../envoi/courriel";
import { envoyerSms } from "../envoi/sms";
import { cleLiens, sitePublic } from "../liens";
import { depotSupabase } from "./depotSupabase";
import { executerEnvois, type Bilan, type Expediteurs } from "./executer";
import { envoisDus, type ContextePlan, type DegustationPlan, type MembrePlan } from "./planifier";

// Un passage des automatisations : charge les dégustations récentes et à
// venir, calcule les envois dus, les exécute. Lancé aux 15 minutes par
// Netlify, et tout de suite après une réservation ou une réponse du client.

export const LIEN_COMMANDE_PAR_DEFAUT = "https://chefmayer.ca/collections/meal-prep";

const COLONNES = `id, entreprise_id, debut, statut, adresse, nb_personnes, created_at,
  entreprise:entreprises(nom, code_rabais),
  contact:contacts(id, prenom, nom, telephone, courriel, sms_desabonne, courriel_desabonne),
  reserve:membres!degustations_reserve_par_fkey(id, nom, telephone)`;

type Ligne = {
  id: string;
  entreprise_id: string;
  debut: string;
  statut: DegustationPlan["statut"];
  adresse: string | null;
  nb_personnes: number | null;
  created_at: string;
  entreprise: { nom: string; code_rabais: string | null } | null;
  contact: DegustationPlan["contact"];
  reserve: MembrePlan | null;
};

function versPlan(l: Ligne): DegustationPlan {
  return {
    id: l.id,
    entreprise_id: l.entreprise_id,
    entreprise_nom: l.entreprise?.nom ?? "votre entreprise",
    code_rabais: l.entreprise?.code_rabais ?? null,
    debut: l.debut,
    statut: l.statut,
    adresse: l.adresse,
    nb_personnes: l.nb_personnes,
    created_at: l.created_at,
    contact: l.contact,
    reserve_par: l.reserve,
  };
}

export async function contexteAutomatisations(supabase: SupabaseClient, maintenant: Date): Promise<ContextePlan> {
  const { data: chefs, error } = await supabase
    .from("membres")
    .select("id, nom, telephone")
    .eq("role", "chef")
    .eq("actif", true);
  if (error) throw new Error(`Membres : ${error.message}`);
  const chef = (chefs ?? [])[0] as MembrePlan | undefined;
  return {
    maintenant,
    site: sitePublic(),
    cleLiens: cleLiens(),
    chefs: (chefs ?? []) as MembrePlan[],
    signature: {
      nomChef: process.env.NOM_CHEF?.trim() || chef?.nom?.split(" ")[0] || "Jonathan",
      telephone: process.env.TELEPHONE_CHEF?.trim() || chef?.telephone || null,
    },
    lienCommande: process.env.LIEN_COMMANDE?.trim() || LIEN_COMMANDE_PAR_DEFAUT,
  };
}

export function expediteurs(): Expediteurs {
  return {
    sms: (to, texte) => envoyerSms(to, texte),
    courriel: (to, message) => envoyerCourriel(to, message),
  };
}

export async function passeAutomatisations(
  supabase: SupabaseClient,
  options: { maintenant?: Date; degustationId?: string } = {}
): Promise<Bilan & { degustations: number }> {
  const maintenant = options.maintenant ?? new Date();
  let requete = supabase.from("degustations").select(COLONNES).neq("statut", "annulee");
  if (options.degustationId) {
    requete = requete.eq("id", options.degustationId);
  } else {
    const jour = 24 * 60 * 60 * 1000;
    requete = requete
      .gte("debut", new Date(maintenant.getTime() - 6 * jour).toISOString())
      .lte("debut", new Date(maintenant.getTime() + 3 * jour).toISOString());
  }

  const { data, error } = await requete;
  if (error) throw new Error(`Dégustations : ${error.message}`);

  const ctx = await contexteAutomatisations(supabase, maintenant);
  const envois = ((data ?? []) as unknown as Ligne[]).flatMap((l) => envoisDus(versPlan(l), ctx));
  const bilan = await executerEnvois(envois, depotSupabase(supabase), expediteurs());
  return { ...bilan, degustations: data?.length ?? 0 };
}
