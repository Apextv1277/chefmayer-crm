import { createPublicKey, verify } from "crypto";

// Textos reçus (webhook Telnyx « message.received »).
// Signature : en-têtes telnyx-signature-ed25519 et telnyx-timestamp, sur
// « <timestamp>|<corps brut> », avec la clé publique du compte Telnyx
// (variable TELNYX_CLE_PUBLIQUE, en base64).

const PREFIXE_SPKI_ED25519 = Buffer.from("302a300506032b6570032100", "hex");
const TOLERANCE_SECONDES = 5 * 60;

export function signatureTelnyxValide(
  corps: string,
  signature: string | null,
  horodatage: string | null,
  clePublique: string | undefined,
  maintenant = Date.now()
): boolean {
  if (!signature || !horodatage || !clePublique) return false;
  const secondes = Number(horodatage);
  if (!Number.isFinite(secondes) || Math.abs(maintenant / 1000 - secondes) > TOLERANCE_SECONDES) return false;
  try {
    const brute = Buffer.from(clePublique.trim(), "base64");
    if (brute.length !== 32) return false;
    const cle = createPublicKey({ key: Buffer.concat([PREFIXE_SPKI_ED25519, brute]), format: "der", type: "spki" });
    return verify(null, Buffer.from(`${horodatage}|${corps}`), cle, Buffer.from(signature, "base64"));
  } catch {
    return false;
  }
}

export type IntentionTexto = "stop" | "reprise" | "oui" | "autre";

function simplifier(texte: string) {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Mots-clés reconnus (le message entier, pas un mot dans une phrase, pour
// ne pas désabonner quelqu'un qui écrit « on ne peut pas arrêter... »).
const STOP = new Set(["stop", "arret", "arrete", "arreter", "desabonner", "desabonnement", "unsubscribe", "stopall", "quit", "end"]);
const REPRISE = new Set(["start", "unstop", "reprendre"]);
const OUI = new Set(["oui", "ok", "o", "yes", "confirme", "confirmer", "je confirme", "oui merci", "parfait", "c est confirme", "oui c est confirme"]);

export function intentionTexto(texte: string | null | undefined): IntentionTexto {
  const t = simplifier(texte ?? "");
  if (STOP.has(t)) return "stop";
  if (REPRISE.has(t)) return "reprise";
  if (OUI.has(t)) return "oui";
  return "autre";
}

export type TextoRecu = { de: string; texte: string };

// Extrait le texto d'un événement Telnyx, ou null pour les autres événements.
export function lireTextoRecu(evenement: unknown): TextoRecu | null {
  const data = (evenement as { data?: { event_type?: string; payload?: Record<string, unknown> } })?.data;
  if (data?.event_type !== "message.received") return null;
  const payload = data.payload as { from?: { phone_number?: string }; text?: string } | undefined;
  const de = payload?.from?.phone_number;
  if (!de) return null;
  return { de, texte: payload?.text ?? "" };
}
