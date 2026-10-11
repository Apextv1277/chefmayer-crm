import type { Config } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { passeAutomatisations } from "../../lib/automatisations/passe";

// Aux 15 minutes : confirmations, rappels de la veille et de 2 h avant,
// remerciements et alertes à l'équipe. Chaque message a une clé unique au
// journal : relancer ce passage ne double jamais un envoi.
// Interrupteur : AUTOMATISATIONS_ACTIVES=1 (après la migration Supabase).
async function automatisations() {
  if (process.env.AUTOMATISATIONS_ACTIVES !== "1") {
    return new Response("Automatisations désactivées.", { status: 200 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !cle) return new Response("Variables Supabase manquantes.", { status: 500 });

  const supabase = createClient(url, cle, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const bilan = await passeAutomatisations(supabase);
    if (bilan.envoyes || bilan.tests || bilan.echecs) console.log("AUTOMATISATIONS :", JSON.stringify(bilan));
    return new Response(JSON.stringify(bilan), { status: 200 });
  } catch (erreur) {
    console.error("AUTOMATISATIONS : échec du passage", erreur);
    return new Response("Échec du passage.", { status: 500 });
  }
}

export default automatisations;

export const config: Config = {
  schedule: "*/15 * * * *",
};
