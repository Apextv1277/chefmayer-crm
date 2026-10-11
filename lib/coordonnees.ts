// Normalisation des coordonnées, utilisée partout où une donnée entre dans
// le CRM (saisie, import, webhooks). C'est elle qui rend la détection des
// doublons fiable : « (514) 555-1234 », « 514.555.1234 » et
// « +1 514 555 1234 » deviennent tous « +15145551234 ».

export type TelephoneNormalise = {
  // Format E.164 (+15145551234), ou null si le numéro est inutilisable.
  e164: string | null;
  extension: string | null;
  valide: boolean;
};

const MOTIF_EXTENSION = /\s*(?:#|x|ext\.?|extension|poste|p\.)\s*(\d{1,6})\s*$/i;

export function normaliserTelephone(brut: string | null | undefined): TelephoneNormalise {
  const invalide: TelephoneNormalise = { e164: null, extension: null, valide: false };
  if (!brut) return invalide;

  let texte = brut.trim();
  let extension: string | null = null;
  const correspondance = texte.match(MOTIF_EXTENSION);
  if (correspondance) {
    extension = correspondance[1];
    texte = texte.slice(0, correspondance.index);
  }

  const international = texte.startsWith("+") || texte.startsWith("00");
  let chiffres = texte.replace(/\D/g, "");
  if (texte.startsWith("00")) chiffres = chiffres.slice(2);
  if (!chiffres) return invalide;

  // Amérique du Nord (Canada, États-Unis) : 10 chiffres, ou 11 avec le 1.
  if (chiffres.length === 11 && chiffres.startsWith("1")) {
    chiffres = chiffres.slice(1);
  } else if (international && !chiffres.startsWith("1")) {
    // Numéro international hors Amérique du Nord : on garde tel quel.
    if (chiffres.length >= 8 && chiffres.length <= 15) {
      return { e164: `+${chiffres}`, extension, valide: true };
    }
    return { ...invalide, extension };
  }

  if (chiffres.length !== 10) return { ...invalide, extension };

  // Indicatif régional et central : ne commencent ni par 0 ni par 1.
  if (/^[01]/.test(chiffres) || /^[01]/.test(chiffres.slice(3))) {
    return { ...invalide, extension };
  }

  return { e164: `+1${chiffres}`, extension, valide: true };
}

// Affichage lisible d'un numéro E.164 nord-américain : (514) 555-1234.
export function formaterTelephone(e164: string | null | undefined): string {
  if (!e164) return "";
  const nord = e164.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  return nord ? `(${nord[1]}) ${nord[2]}-${nord[3]}` : e164;
}

export type CourrielNormalise = {
  courriel: string | null;
  valide: boolean;
  // Vrai si une faute de frappe connue a été corrigée (gmial.com → gmail.com).
  corrige: boolean;
};

// Courriel : minuscules, sans espaces ; null si la forme est invalide.
export function normaliserCourriel(brut: string | null | undefined): string | null {
  const valeur = brut?.trim().toLowerCase().replace(/\s+/g, "") ?? "";
  return /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(valeur) ? valeur : null;
}
