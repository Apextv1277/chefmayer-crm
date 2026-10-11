import { normaliserTelephone } from "../coordonnees";
import { envoisReels, type Env, type ResultatEnvoi } from "./types";

// Textos par Telnyx. Variables : TELNYX_API_KEY et TELNYX_NUMERO (numéro
// d'envoi Chef Mayer, ex. +14505551234, activé pour les messages).

export function smsConfigure(env: Env = process.env): boolean {
  return Boolean(env.TELNYX_API_KEY?.trim() && normaliserTelephone(env.TELNYX_NUMERO).e164);
}

export async function envoyerSms(
  destinataire: string,
  texte: string,
  env: Env = process.env,
  requete: typeof fetch = fetch
): Promise<ResultatEnvoi> {
  const numero = normaliserTelephone(destinataire);
  if (!numero.valide || !numero.e164) return { envoye: false, raison: "Numéro de téléphone invalide." };
  if (!envoisReels(env)) return { envoye: true, mode: "test" };
  if (!smsConfigure(env)) return { envoye: false, raison: "Telnyx n'est pas configuré (TELNYX_API_KEY, TELNYX_NUMERO)." };

  try {
    const reponse = await requete("https://api.telnyx.com/v2/messages", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.TELNYX_API_KEY!.trim()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: normaliserTelephone(env.TELNYX_NUMERO).e164, to: numero.e164, text: texte }),
    });
    if (!reponse.ok) {
      const detail = await reponse.text().catch(() => "");
      return { envoye: false, raison: `Telnyx ${reponse.status} : ${detail.slice(0, 300)}` };
    }
    const corps = (await reponse.json().catch(() => null)) as { data?: { id?: string } } | null;
    return { envoye: true, mode: "reel", idExterne: corps?.data?.id };
  } catch (erreur) {
    return { envoye: false, raison: erreur instanceof Error ? erreur.message : "Erreur inconnue (texto)." };
  }
}
