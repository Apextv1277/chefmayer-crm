"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import CarteDegustation from "@/app/components/degustations/CarteDegustation";
import { EnTete, Vide } from "@/app/components/ui";
import { supabase } from "@/lib/supabase";
import { ajouterJours, dateLocale, formaterJour, instantLocal } from "@/lib/temps";
import type { Contact, Degustation, Entreprise } from "@/lib/types";

type Ligne = Degustation & {
  entreprise: Pick<Entreprise, "id" | "nom"> | null;
  contact: Pick<Contact, "prenom" | "nom" | "telephone"> | null;
};

export default function Degustations() {
  const [vue, setVue] = useState<"a_venir" | "passees">("a_venir");
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [charge, setCharge] = useState(false);

  const charger = useCallback(async () => {
    const aujourdhui = dateLocale(new Date());
    const debutJour = instantLocal(aujourdhui, "00:00").toISOString();
    let requete = supabase.from("degustations").select("*, entreprise:entreprises(id, nom), contact:contacts(prenom, nom, telephone)");
    requete =
      vue === "a_venir"
        ? requete.gte("debut", debutJour).neq("statut", "annulee").order("debut")
        : requete
            .lt("debut", debutJour)
            .gte("debut", instantLocal(ajouterJours(aujourdhui, -60), "00:00").toISOString())
            .order("debut", { ascending: false });
    const { data } = await requete.limit(200);
    setLignes((data as Ligne[]) ?? []);
    setCharge(true);
  }, [vue]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, [charger]);

  // Regroupées par jour (heure de Montréal).
  const jours = new Map<string, Ligne[]>();
  for (const l of lignes) {
    const jour = dateLocale(new Date(l.debut));
    jours.set(jour, [...(jours.get(jour) ?? []), l]);
  }

  const aTerminer = lignes.filter(
    (l) => vue === "passees" && (l.statut === "reservee" || l.statut === "confirmee")
  ).length;

  return (
    <div className="mx-auto max-w-4xl">
      <EnTete titre="Dégustations" sousTitre="Chaque dégustation reçoit sa confirmation, ses rappels et son remerciement automatiquement">
        <div className="flex rounded-md border border-stone-300 bg-white p-0.5 text-sm">
          <button className={`rounded px-3 py-1.5 ${vue === "a_venir" ? "bg-encre text-white" : ""}`} onClick={() => setVue("a_venir")}>
            À venir
          </button>
          <button className={`rounded px-3 py-1.5 ${vue === "passees" ? "bg-encre text-white" : ""}`} onClick={() => setVue("passees")}>
            Passées (60 jours)
          </button>
        </div>
      </EnTete>

      {aTerminer > 0 && (
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {aTerminer} dégustation{aTerminer > 1 ? "s" : ""} passée{aTerminer > 1 ? "s" : ""} sans résultat : indique comment ça s&apos;est
          passé pour déclencher le remerciement.
        </p>
      )}

      {charge && lignes.length === 0 && (
        <Vide>
          {vue === "a_venir" ? "Aucune dégustation à venir." : "Aucune dégustation dans les 60 derniers jours."}{" "}
          <Link href="/entreprises" className="underline">
            Trouver une entreprise à appeler
          </Link>
        </Vide>
      )}

      {[...jours.entries()].map(([jour, liste]) => (
        <section key={jour} className="mb-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-500">
            {formaterJour(instantLocal(jour, "12:00"))}
          </h2>
          <div className="grid gap-3">
            {liste.map((l) => (
              <div key={l.id}>
                <CarteDegustation
                  degustation={l}
                  entrepriseNom={l.entreprise?.nom ?? ""}
                  contact={l.contact}
                  afficherEntreprise
                  onChange={charger}
                />
                <Link href={`/entreprises/${l.entreprise_id}`} className="ml-1 text-xs text-stone-500 hover:text-rouge">
                  Ouvrir la fiche →
                </Link>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
