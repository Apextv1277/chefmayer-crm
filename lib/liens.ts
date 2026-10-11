import { createHmac, timingSafeEqual } from "crypto";

// Liens publics signés (HMAC) : impossible de deviner le lien d'un autre
// client.
//   /c/<jeton> : le contact confirme ou reporte sa dégustation
//   /d/<jeton> : le contact se désabonne des courriels et textos
// Secret : LIENS_SECRET, sinon la clé service Supabase.

export type Usage = "degustation" | "desabonnement";

export function cleLiens(env: Record<string, string | undefined> = process.env): string {
  const valeur = env.LIENS_SECRET?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!valeur) throw new Error("LIENS_SECRET (ou SUPABASE_SERVICE_ROLE_KEY) est absent.");
  return valeur;
}

function signature(usage: Usage, id: string, cle: string): string {
  return createHmac("sha256", cle).update(`${usage}:${id}`).digest("base64url").slice(0, 16);
}

export function jeton(usage: Usage, id: string, cle = cleLiens()): string {
  return `${id}.${signature(usage, id, cle)}`;
}

// Retourne l'id si le jeton est valide pour cet usage, sinon null.
export function lireJeton(usage: Usage, valeur: string | null | undefined, cle = cleLiens()): string | null {
  const m = /^([0-9a-f-]{36})\.([A-Za-z0-9_-]{16})$/i.exec(valeur?.trim() ?? "");
  if (!m) return null;
  const [, id, recue] = m;
  const attendue = Buffer.from(signature(usage, id, cle));
  const donnee = Buffer.from(recue);
  return attendue.length === donnee.length && timingSafeEqual(attendue, donnee) ? id : null;
}

// Adresse publique du site (liens dans les courriels et textos). Netlify
// fournit URL ; URL_SITE_PUBLIC la remplace (domaine personnalisé).
export function sitePublic(env: Record<string, string | undefined> = process.env): string {
  return (env.URL_SITE_PUBLIC?.trim() || env.URL?.trim() || "http://localhost:3000").replace(/\/+$/, "");
}

export function lienDegustation(id: string, site = sitePublic(), cle = cleLiens()): string {
  return `${site}/c/${jeton("degustation", id, cle)}`;
}

export function lienDesabonnement(contactId: string, site = sitePublic(), cle = cleLiens()): string {
  return `${site}/d/${jeton("desabonnement", contactId, cle)}`;
}
