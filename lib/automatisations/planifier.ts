import { normaliserCourriel, normaliserTelephone } from "../coordonnees";
import { degustationActive, type StatutDegustation } from "../degustations";
import {
  alerteConfirmee,
  alerteNonConfirmee,
  alerteNouvelleReservation,
  alerteReport,
  courrielConfirmation,
  courrielRappelVeille,
  courrielRemerciement,
  smsConfirmation,
  smsRappelAvant,
  smsRappelVeille,
  smsRemerciement,
  type InfosAlerte,
  type InfosCommande,
  type InfosDegustation,
  type Signature,
} from "../gabarits";
import { lienDegustation, lienDesabonnement } from "../liens";
import { ajouterJours, dateLocale, partiesLocales } from "../temps";

// Planification des envois automatiques d'une dégustation. Fonction pure :
// à partir de l'état de la dégustation et de l'heure, elle dit quels
// messages sont dus. Chaque message a une clé unique : l'exécuteur ne
// l'envoie qu'une fois, même si la planification repasse aux 15 minutes.
//
// Au client (contact de l'entreprise) :
//   confirmation   dès la réservation        texto + courriel
//   rappel_veille  la veille, 10 h – 20 h      texto + courriel
//   rappel_avant   2 h avant                 texto
//   remerciement   le lendemain d'une dégustation faite, 9 h – 17 h
//                                            texto + courriel (lien, code)
// À l'équipe (Jonathan et la personne qui a réservé) :
//   nouvelle       dès la réservation (au chef)
//   confirmee      quand le client confirme (à la personne qui a réservé)
//   non_confirmee  la veille à 16 h si le client n'a pas confirmé
//   report         quand le client demande de reporter

export type ContactPlan = {
  id: string;
  prenom: string | null;
  nom: string | null;
  telephone: string | null;
  courriel: string | null;
  sms_desabonne: boolean;
  courriel_desabonne: boolean;
};

export type MembrePlan = { id: string; nom: string; telephone: string | null };

export type DegustationPlan = {
  id: string;
  entreprise_id: string;
  entreprise_nom: string;
  code_rabais: string | null;
  debut: string;
  statut: StatutDegustation;
  adresse: string | null;
  nb_personnes: number | null;
  created_at: string;
  contact: ContactPlan | null;
  reserve_par: MembrePlan | null;
};

export type ContextePlan = {
  maintenant: Date;
  site: string;
  cleLiens: string;
  // Membres alertés de chaque nouvelle dégustation (le chef qui cuisine).
  chefs: MembrePlan[];
  signature: Signature;
  lienCommande: string;
};

export type Envoi = {
  cle: string;
  canal: "sms" | "courriel";
  type: string;
  destinataire: string;
  sujet: string | null;
  texte: string;
  html: string | null;
  entreprise_id: string;
  degustation_id: string | null;
  contact_id: string | null;
};

const HEURE = 60 * 60 * 1000;

// Pas de texto à un client la nuit.
function heureTexteClient(h: number) {
  return h >= 8 && h < 21;
}

function heureAlerteEquipe(h: number) {
  return h >= 7 && h < 22;
}

export function envoisDus(d: DegustationPlan, ctx: ContextePlan): Envoi[] {
  const maintenant = ctx.maintenant.getTime();
  const debut = new Date(d.debut);
  const avance = debut.getTime() - new Date(d.created_at).getTime();
  const local = partiesLocales(ctx.maintenant);
  const aujourdhui = dateLocale(ctx.maintenant);
  const jourDegustation = dateLocale(debut);
  const active = degustationActive(d.statut);
  const avenir = debut.getTime() > maintenant;

  const envois: Envoi[] = [];
  const base = { entreprise_id: d.entreprise_id, degustation_id: d.id };

  // --- Client -------------------------------------------------------------
  const c = d.contact;
  const telephone = c && !c.sms_desabonne ? normaliserTelephone(c.telephone).e164 : null;
  const courriel = c && !c.courriel_desabonne ? normaliserCourriel(c.courriel) : null;
  const desabonnement = c ? lienDesabonnement(c.id, ctx.site, ctx.cleLiens) : "";

  const infos: InfosDegustation = {
    entreprise: d.entreprise_nom,
    prenom: c?.prenom?.trim() || null,
    debut,
    adresse: d.adresse,
    nbPersonnes: d.nb_personnes,
    lienReponse: lienDegustation(d.id, ctx.site, ctx.cleLiens),
  };

  function auClient(type: string, sms: string | null, message: { sujet: string; texte: string; html: string } | null) {
    if (!c) return;
    if (sms && telephone && heureTexteClient(local.heure)) {
      envois.push({
        ...base,
        cle: `deg:${d.id}:${type}:sms`,
        canal: "sms",
        type,
        destinataire: telephone,
        sujet: null,
        texte: sms,
        html: null,
        contact_id: c.id,
      });
    }
    if (message && courriel) {
      envois.push({
        ...base,
        cle: `deg:${d.id}:${type}:courriel`,
        canal: "courriel",
        type,
        destinataire: courriel,
        sujet: message.sujet,
        texte: message.texte,
        html: message.html,
        contact_id: c.id,
      });
    }
  }

  if (active && avenir) {
    auClient(
      "confirmation",
      smsConfirmation(infos),
      courrielConfirmation(infos, ctx.signature, desabonnement)
    );

    const veille = jourDegustation === ajouterJours(aujourdhui, 1);
    if (veille && local.heure >= 10 && local.heure < 20 && avance > 30 * HEURE) {
      auClient("rappel_veille", smsRappelVeille(infos), courrielRappelVeille(infos, ctx.signature, desabonnement));
    }

    const avantDebut = debut.getTime() - maintenant;
    if (avantDebut <= 2 * HEURE && avantDebut > 0.5 * HEURE && avance > 4 * HEURE) {
      auClient("rappel_avant", smsRappelAvant(infos, ctx.signature), null);
    }
  }

  if (
    d.statut === "faite" &&
    aujourdhui > jourDegustation &&
    maintenant - debut.getTime() < 5 * 24 * HEURE &&
    local.heure >= 9 &&
    local.heure < 17
  ) {
    const commande: InfosCommande = {
      entreprise: d.entreprise_nom,
      prenom: infos.prenom,
      code: d.code_rabais,
      lienCommande: ctx.lienCommande,
    };
    auClient(
      "remerciement",
      smsRemerciement(commande, ctx.signature),
      courrielRemerciement(commande, ctx.signature, desabonnement)
    );
  }

  // --- Équipe -------------------------------------------------------------
  if (!heureAlerteEquipe(local.heure)) return envois;

  const alerte: InfosAlerte = {
    entreprise: d.entreprise_nom,
    debut,
    nbPersonnes: d.nb_personnes,
    adresse: d.adresse,
    contact: c ? [c.prenom, c.nom].filter(Boolean).join(" ") || null : null,
    telephoneContact: c?.telephone ?? null,
    reservePar: d.reserve_par?.nom ?? null,
  };

  function aMembres(type: string, membres: MembrePlan[], texte: string) {
    const dejaVus = new Set<string>();
    for (const m of membres) {
      const tel = normaliserTelephone(m.telephone).e164;
      if (!tel || dejaVus.has(tel)) continue;
      dejaVus.add(tel);
      envois.push({
        ...base,
        cle: `deg:${d.id}:${type}:membre:${m.id}`,
        canal: "sms",
        type,
        destinataire: tel,
        sujet: null,
        texte,
        html: null,
        contact_id: null,
      });
    }
  }

  const equipe = [...ctx.chefs, ...(d.reserve_par ? [d.reserve_par] : [])];

  if (active && avenir) {
    // Le chef est alerté de chaque nouvelle dégustation, sauf s'il l'a
    // réservée lui-même.
    aMembres(
      "nouvelle",
      ctx.chefs.filter((m) => m.id !== d.reserve_par?.id),
      alerteNouvelleReservation(alerte)
    );
  }

  if (d.statut === "confirmee" && avenir && d.reserve_par) {
    aMembres("confirmee", [d.reserve_par], alerteConfirmee(alerte));
  }

  if (d.statut === "reservee" && jourDegustation === ajouterJours(aujourdhui, 1) && local.heure >= 16) {
    aMembres("non_confirmee", equipe, alerteNonConfirmee(alerte));
  }

  if (d.statut === "a_reporter" && maintenant - debut.getTime() < 24 * HEURE) {
    aMembres("report", equipe, alerteReport(alerte));
  }

  return envois;
}
