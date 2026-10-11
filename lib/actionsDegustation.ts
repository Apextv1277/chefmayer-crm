"use client";

import { RESULTATS_DEGUSTATION, type ResultatDegustation } from "./degustations";
import { supabase } from "./supabase";
import { ajouterJours, dateLocale, formaterDateHeure, instantLocal } from "./temps";
import type { Degustation, Membre } from "./types";

// Actions sur une dégustation depuis le CRM. Chaque action note une
// activité et relance les automatisations (les messages dus partent tout
// de suite).

export type ResultatAction = { ok: true; avertissement?: string } | { ok: false; erreur: string };

export async function declencherAutomatisations(id: string): Promise<string | undefined> {
  try {
    const reponse = await fetch("/api/automatisations/degustation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const corps = await reponse.json().catch(() => ({}));
    if (!reponse.ok) return corps.error ?? "Les messages automatiques n'ont pas pu partir.";
    if (corps.echecs) return `${corps.echecs} message(s) n'ont pas pu partir : voir Textos et courriels.`;
    return undefined;
  } catch {
    return "Les messages automatiques n'ont pas pu partir (réseau).";
  }
}

async function noter(entrepriseId: string, membre: Membre, resultat: string, note: string | null = null) {
  await supabase.from("activites").insert({ entreprise_id: entrepriseId, membre_id: membre.id, type: "degustation", resultat, note });
}

export type Reservation = {
  entrepriseId: string;
  contactId: string | null;
  debut: string;
  adresse: string | null;
  nbPersonnes: number | null;
  allergies: string | null;
  notes: string | null;
};

export async function reserverDegustation(r: Reservation, membre: Membre): Promise<ResultatAction & { id?: string }> {
  const { data, error } = await supabase
    .from("degustations")
    .insert({
      entreprise_id: r.entrepriseId,
      contact_id: r.contactId,
      debut: r.debut,
      adresse: r.adresse,
      nb_personnes: r.nbPersonnes,
      allergies: r.allergies,
      notes: r.notes,
      reserve_par: membre.id,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, erreur: error?.message ?? "Réservation impossible." };

  await supabase
    .from("entreprises")
    .update({ statut: "Dégustation réservée", date_rappel: null })
    .eq("id", r.entrepriseId)
    .neq("statut", "Client actif");
  await noter(r.entrepriseId, membre, "Dégustation réservée", formaterDateHeure(new Date(r.debut)));

  const avertissement = await declencherAutomatisations(data.id);
  return { ok: true, id: data.id, avertissement };
}

export async function changerStatut(d: Degustation, statut: "confirmee" | "annulee", membre: Membre): Promise<ResultatAction> {
  const { error } = await supabase.from("degustations").update({ statut }).eq("id", d.id);
  if (error) return { ok: false, erreur: error.message };
  await noter(d.entreprise_id, membre, statut === "confirmee" ? "Dégustation confirmée" : "Dégustation annulée");
  if (statut === "annulee") {
    await supabase
      .from("entreprises")
      .update({ statut: "Rappel prévu", date_rappel: new Date().toISOString() })
      .eq("id", d.entreprise_id)
      .eq("statut", "Dégustation réservée");
  }
  return { ok: true, avertissement: await declencherAutomatisations(d.id) };
}

// Reporter = annuler l'ancienne et en réserver une nouvelle : le client
// reçoit une nouvelle confirmation avec la bonne date.
export async function reporterDegustation(d: Degustation, nouveauDebut: string, membre: Membre): Promise<ResultatAction> {
  const { error } = await supabase
    .from("degustations")
    .update({ statut: "annulee", notes: [d.notes, `Reportée au ${formaterDateHeure(new Date(nouveauDebut))}.`].filter(Boolean).join("\n") })
    .eq("id", d.id);
  if (error) return { ok: false, erreur: error.message };
  return reserverDegustation(
    {
      entrepriseId: d.entreprise_id,
      contactId: d.contact_id,
      debut: nouveauDebut,
      adresse: d.adresse,
      nbPersonnes: d.nb_personnes,
      allergies: d.allergies,
      notes: d.notes,
    },
    membre
  );
}

// Code de rabais proposé à partir du nom : « Usine Laurentides inc. » → USINELAURENT
export function suggererCode(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\b(INC|LTEE|LTD|ENR|CIE|SENC)\b/g, "")
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
}

export async function terminerDegustation(
  d: Degustation,
  resultat: ResultatDegustation,
  membre: Membre,
  code: string | null
): Promise<ResultatAction> {
  if (resultat === "signee") {
    const valeur = code?.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!valeur) return { ok: false, erreur: "Indique le code de rabais créé dans Shopify." };
    const { error } = await supabase
      .from("entreprises")
      .update({ statut: "Client actif", code_rabais: valeur, date_rappel: null })
      .eq("id", d.entreprise_id);
    if (error) {
      return { ok: false, erreur: error.code === "23505" ? "Ce code est déjà utilisé par une autre entreprise." : error.message };
    }
  } else if (resultat === "a_relancer") {
    await supabase
      .from("entreprises")
      .update({ statut: "Dégustation faite", date_rappel: instantLocal(ajouterJours(dateLocale(new Date()), 3), "10:00").toISOString() })
      .eq("id", d.entreprise_id)
      .neq("statut", "Client actif");
  } else {
    await supabase
      .from("entreprises")
      .update({ statut: "Non intéressé", date_rappel: null })
      .eq("id", d.entreprise_id)
      .neq("statut", "Client actif");
  }

  const { error } = await supabase.from("degustations").update({ statut: "faite", resultat }).eq("id", d.id);
  if (error) return { ok: false, erreur: error.message };
  await noter(d.entreprise_id, membre, `Dégustation faite : ${RESULTATS_DEGUSTATION[resultat]}`, resultat === "signee" ? `Code ${code}` : null);
  return { ok: true, avertissement: await declencherAutomatisations(d.id) };
}
