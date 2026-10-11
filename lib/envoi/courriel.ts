import { normaliserCourriel } from "../coordonnees";
import { envoisReels, type Env, type ResultatEnvoi } from "./types";

// Courriels par Resend (https://resend.com), depuis un domaine Chef Mayer
// vérifié. Variables : RESEND_API_KEY, COURRIEL_EXPEDITEUR (ex.
// « Jonathan - Chef Mayer <jonathan@chefmayer.ca> ») et, au besoin,
// COURRIEL_REPONSE (adresse où arrivent les réponses des clients).
// Le fournisseur pourra changer (Gmail, Outlook) sans toucher au reste :
// tout le CRM passe par envoyerCourriel.

export function courrielConfigure(env: Env = process.env): boolean {
  return Boolean(env.RESEND_API_KEY?.trim() && env.COURRIEL_EXPEDITEUR?.trim());
}

export async function envoyerCourriel(
  destinataire: string,
  message: { sujet: string; texte: string; html: string | null },
  env: Env = process.env,
  requete: typeof fetch = fetch
): Promise<ResultatEnvoi> {
  const adresse = normaliserCourriel(destinataire);
  if (!adresse) return { envoye: false, raison: "Adresse courriel invalide." };
  if (!envoisReels(env)) return { envoye: true, mode: "test" };
  if (!courrielConfigure(env)) {
    return { envoye: false, raison: "L'envoi de courriels n'est pas configuré (RESEND_API_KEY, COURRIEL_EXPEDITEUR)." };
  }

  try {
    const reponse = await requete("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY!.trim()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.COURRIEL_EXPEDITEUR!.trim(),
        to: [adresse],
        subject: message.sujet,
        text: message.texte,
        ...(message.html ? { html: message.html } : {}),
        ...(env.COURRIEL_REPONSE?.trim() ? { reply_to: env.COURRIEL_REPONSE.trim() } : {}),
      }),
    });
    if (!reponse.ok) {
      const detail = await reponse.text().catch(() => "");
      return { envoye: false, raison: `Resend ${reponse.status} : ${detail.slice(0, 300)}` };
    }
    const corps = (await reponse.json().catch(() => null)) as { id?: string } | null;
    return { envoye: true, mode: "reel", idExterne: corps?.id };
  } catch (erreur) {
    return { envoye: false, raison: erreur instanceof Error ? erreur.message : "Erreur inconnue (courriel)." };
  }
}
