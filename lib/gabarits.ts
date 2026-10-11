import { formaterTelephone } from "./coordonnees";
import { formaterDateHeure, formaterHeure } from "./temps";

// Textes des courriels et textos automatiques. Ton : Jonathan qui écrit
// lui-même, en vouvoyant le client.

export type Message = { sujet: string; texte: string; html: string };

export type InfosDegustation = {
  entreprise: string;
  prenom: string | null;
  debut: Date;
  adresse: string | null;
  nbPersonnes: number | null;
  lienReponse: string;
};

export type Signature = {
  nomChef: string;
  telephone: string | null;
};

function bonjour(prenom: string | null) {
  return prenom ? `Bonjour ${prenom},` : "Bonjour,";
}

function echapper(valeur: string) {
  return valeur
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function telephoneAffiche(s: Signature) {
  return s.telephone ? formaterTelephone(s.telephone) : "";
}

const ROUGE = "#e10600";

function bouton(texte: string, lien: string, plein = true) {
  const style = plein
    ? `background:${ROUGE};color:#fff;border:2px solid ${ROUGE}`
    : `background:#fff;color:#111;border:2px solid #111`;
  return `<a href="${echapper(lien)}" style="${style};display:inline-block;padding:12px 20px;margin:4px 8px 4px 0;border-radius:6px;font-weight:700;text-decoration:none;font-family:Arial,sans-serif">${echapper(texte)}</a>`;
}

// Gabarit HTML commun : bandeau Chef Mayer, contenu, signature, lien de
// désabonnement (loi antipourriel).
function enveloppe(paragraphes: string[], extra: string, s: Signature, lienDesabonnement: string): string {
  const corps = paragraphes.map((p) => `<p style="margin:0 0 14px">${p}</p>`).join("");
  const tel = telephoneAffiche(s);
  return `<!doctype html><html><body style="margin:0;background:#f4f4f4">
<div style="max-width:560px;margin:0 auto;background:#fff;font-family:Arial,sans-serif;color:#222;font-size:15px;line-height:1.55">
<div style="background:#111;padding:18px 24px"><span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:2px">CHEF <span style="color:${ROUGE}">MAYER</span></span></div>
<div style="padding:24px">${corps}${extra}
<p style="margin:22px 0 0">${echapper(s.nomChef)}<br><span style="color:#666">Chef Mayer, St-Jérôme${tel ? ` · ${echapper(tel)}` : ""}</span></p></div>
<div style="padding:14px 24px;background:#fafafa;color:#888;font-size:12px">Chef Mayer, St-Jérôme (Québec). Vous recevez ce message au sujet d'une dégustation pour votre entreprise. <a href="${echapper(lienDesabonnement)}" style="color:#888">Se désabonner</a></div>
</div></body></html>`;
}

function details(d: InfosDegustation) {
  const lignes = [
    `<strong>Quand :</strong> ${echapper(formaterDateHeure(d.debut))}`,
    d.adresse ? `<strong>Où :</strong> ${echapper(d.adresse)}` : null,
    d.nbPersonnes ? `<strong>Pour :</strong> environ ${d.nbPersonnes} personnes` : null,
  ].filter(Boolean);
  return lignes.join("<br>");
}

function detailsTexte(d: InfosDegustation) {
  return [
    `Quand : ${formaterDateHeure(d.debut)}`,
    d.adresse ? `Où : ${d.adresse}` : null,
    d.nbPersonnes ? `Pour : environ ${d.nbPersonnes} personnes` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

// --- Courriels au client ---------------------------------------------------

export function courrielConfirmation(d: InfosDegustation, s: Signature, lienDesabonnement: string): Message {
  const sujet = `Votre dégustation Chef Mayer, ${formaterDateHeure(d.debut)}`;
  const paragraphes = [
    echapper(bonjour(d.prenom)),
    `Merci! Votre dégustation gratuite pour l'équipe de ${echapper(d.entreprise)} est réservée.`,
    details(d),
    "Des allergies ou des restrictions dans l'équipe? Répondez simplement à ce courriel et on s'ajuste.",
  ];
  const boutons = `<p>${bouton("Je confirme", `${d.lienReponse}?action=confirmer`)}${bouton("Je dois reporter", `${d.lienReponse}?action=reporter`, false)}</p>`;
  const texte = [
    bonjour(d.prenom),
    "",
    `Merci! Votre dégustation gratuite pour l'équipe de ${d.entreprise} est réservée.`,
    "",
    detailsTexte(d),
    "",
    "Des allergies ou des restrictions dans l'équipe? Répondez simplement à ce courriel.",
    "",
    `Confirmer ou reporter : ${d.lienReponse}`,
    "",
    s.nomChef,
    "Chef Mayer, St-Jérôme",
    "",
    `Se désabonner : ${lienDesabonnement}`,
  ].join("\n");
  return { sujet, texte, html: enveloppe(paragraphes, boutons, s, lienDesabonnement) };
}

export function courrielRappelVeille(d: InfosDegustation, s: Signature, lienDesabonnement: string): Message {
  const sujet = `Demain ${formaterHeure(d.debut)} : votre dégustation Chef Mayer`;
  const paragraphes = [
    echapper(bonjour(d.prenom)),
    `Petit rappel : on arrive demain avec le dîner pour l'équipe de ${echapper(d.entreprise)}.`,
    details(d),
    "Un changement de dernière minute? Dites-le-nous avec le bouton ci-dessous.",
  ];
  const boutons = `<p>${bouton("Je confirme", `${d.lienReponse}?action=confirmer`)}${bouton("Je dois reporter", `${d.lienReponse}?action=reporter`, false)}</p>`;
  const texte = [
    bonjour(d.prenom),
    "",
    `Petit rappel : on arrive demain avec le dîner pour l'équipe de ${d.entreprise}.`,
    "",
    detailsTexte(d),
    "",
    `Confirmer ou reporter : ${d.lienReponse}`,
    "",
    s.nomChef,
    "",
    `Se désabonner : ${lienDesabonnement}`,
  ].join("\n");
  return { sujet, texte, html: enveloppe(paragraphes, boutons, s, lienDesabonnement) };
}

export type InfosCommande = {
  entreprise: string;
  prenom: string | null;
  code: string | null;
  lienCommande: string;
};

export function courrielRemerciement(c: InfosCommande, s: Signature, lienDesabonnement: string): Message {
  const sujet = "Merci pour le dîner! Voici comment vos employés peuvent commander";
  const ligneCode = c.code
    ? `Vos employés commandent sur notre site avec le code <strong>${echapper(c.code)}</strong>. Le rabais monte avec le volume de toute l'équipe : 5 % au départ, 10 % dès 25 repas par semaine et 15 % dès 75.`
    : "Je vous envoie votre code d'entreprise sous peu : il donne à vos employés un rabais qui monte avec le volume de toute l'équipe.";
  const paragraphes = [
    echapper(bonjour(c.prenom)),
    `Merci de nous avoir reçus chez ${echapper(c.entreprise)}! J'espère que l'équipe s'est régalée.`,
    ligneCode,
    "Les repas sont livrés au bureau une journée fixe par semaine. Si vous voulez, je vous envoie un court texte prêt à transférer à vos employés : répondez simplement « oui ».",
  ];
  const extra = `<p>${bouton("Voir le menu et commander", c.lienCommande)}</p>`;
  const texte = [
    bonjour(c.prenom),
    "",
    `Merci de nous avoir reçus chez ${c.entreprise}!`,
    "",
    c.code
      ? `Vos employés commandent avec le code ${c.code} : 5 % de rabais au départ, 10 % dès 25 repas par semaine pour l'équipe, 15 % dès 75.`
      : "Je vous envoie votre code d'entreprise sous peu.",
    "",
    `Menu et commandes : ${c.lienCommande}`,
    "",
    s.nomChef,
    "",
    `Se désabonner : ${lienDesabonnement}`,
  ].join("\n");
  return { sujet, texte, html: enveloppe(paragraphes, extra, s, lienDesabonnement) };
}

export type InfosOffre = { entreprise: string; prenom: string | null };

// Courriel d'offre de dégustation (prospection), envoyé à la main depuis
// la fiche d'une entreprise.
export function courrielOffre(o: InfosOffre, s: Signature, lienDesabonnement: string): Message {
  const sujet = "Un dîner offert à votre équipe";
  const paragraphes = [
    echapper(bonjour(o.prenom)),
    `Je suis ${echapper(s.nomChef)}, chef et propriétaire de Chef Mayer à St-Jérôme. J'aimerais offrir une dégustation gratuite de nos repas à l'équipe de ${echapper(o.entreprise)}, un midi de votre choix.`,
    "Notre programme entreprises donne à vos employés des repas santé à prix réduit, livrés au bureau chaque semaine. Il ne coûte rien à l'entreprise.",
    "Est-ce que mardi ou jeudi prochain vous conviendrait?",
  ];
  const texte = [
    bonjour(o.prenom),
    "",
    `Je suis ${s.nomChef}, chef et propriétaire de Chef Mayer à St-Jérôme. J'aimerais offrir une dégustation gratuite de nos repas à l'équipe de ${o.entreprise}, un midi de votre choix.`,
    "",
    "Notre programme entreprises donne à vos employés des repas santé à prix réduit, livrés au bureau chaque semaine. Il ne coûte rien à l'entreprise.",
    "",
    "Est-ce que mardi ou jeudi prochain vous conviendrait?",
    "",
    s.nomChef,
    "",
    `Se désabonner : ${lienDesabonnement}`,
  ].join("\n");
  return { sujet, texte, html: enveloppe(paragraphes, "", s, lienDesabonnement) };
}

// --- Textos au client ------------------------------------------------------

export function smsConfirmation(d: InfosDegustation): string {
  return `Chef Mayer : dégustation réservée pour ${d.entreprise}, ${formaterDateHeure(d.debut)}. Répondez OUI pour confirmer, ou reportez ici : ${d.lienReponse} (STOP pour ne plus recevoir de textos)`;
}

export function smsRappelVeille(d: InfosDegustation): string {
  return `Chef Mayer : on arrive demain à ${formaterHeure(d.debut)} avec le dîner pour ${d.entreprise}. Répondez OUI pour confirmer. Un changement? ${d.lienReponse}`;
}

export function smsRappelAvant(d: InfosDegustation, s: Signature): string {
  const tel = telephoneAffiche(s);
  return `Chef Mayer : on part bientôt! Dégustation à ${formaterHeure(d.debut)} chez ${d.entreprise}.${tel ? ` Un imprévu? ${s.nomChef} : ${tel}` : ""}`;
}

export function smsRemerciement(c: InfosCommande, s: Signature): string {
  return `Merci de nous avoir reçus! Vos employés peuvent commander ici : ${c.lienCommande}${c.code ? ` avec le code ${c.code}` : ""}. ${s.nomChef}, Chef Mayer`;
}

// --- Alertes à l'équipe ----------------------------------------------------

export type InfosAlerte = {
  entreprise: string;
  debut: Date;
  nbPersonnes: number | null;
  adresse: string | null;
  contact: string | null;
  telephoneContact: string | null;
  reservePar: string | null;
};

function joindre(a: InfosAlerte) {
  const tel = a.telephoneContact ? formaterTelephone(a.telephoneContact) : null;
  return [a.contact, tel].filter(Boolean).join(" au ");
}

export function alerteNouvelleReservation(a: InfosAlerte): string {
  return [
    `Nouvelle dégustation : ${a.entreprise}, ${formaterDateHeure(a.debut)}`,
    a.nbPersonnes ? `${a.nbPersonnes} personnes` : null,
    a.adresse,
    a.reservePar ? `réservée par ${a.reservePar}` : null,
  ]
    .filter(Boolean)
    .join(", ");
}

export function alerteConfirmee(a: InfosAlerte): string {
  return `Confirmé : ${a.entreprise} a confirmé la dégustation du ${formaterDateHeure(a.debut)}.`;
}

export function alerteNonConfirmee(a: InfosAlerte): string {
  const qui = joindre(a);
  return `À confirmer : la dégustation de demain ${formaterHeure(a.debut)} chez ${a.entreprise} n'est pas confirmée.${qui ? ` Appelez ${qui}.` : ""}`;
}

export function alerteReport(a: InfosAlerte): string {
  const qui = joindre(a);
  return `${a.entreprise} demande de reporter la dégustation du ${formaterDateHeure(a.debut)}.${qui ? ` Rappelez ${qui}.` : ""}`;
}
