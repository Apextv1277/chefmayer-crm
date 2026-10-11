"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EnTete, PastilleDegustation, PastilleStatut, Vide } from "@/app/components/ui";
import { formaterTelephone } from "@/lib/coordonnees";
import { useMembre } from "@/lib/membre";
import { supabase } from "@/lib/supabase";
import { ajouterJours, dateLocale, formaterDateHeure, formaterHeure, instantLocal, lundiDe } from "@/lib/temps";
import { nomContact, type Contact, type Degustation, type Entreprise } from "@/lib/types";

type DegustationJour = Degustation & {
  entreprise: Pick<Entreprise, "id" | "nom"> | null;
  contact: Pick<Contact, "prenom" | "nom" | "telephone"> | null;
};

type Stats = { appels: number; degustations: number; signees: number };

export default function Aujourdhui() {
  const membre = useMembre();
  const [degustations, setDegustations] = useState<DegustationJour[]>([]);
  const [rappels, setRappels] = useState<Entreprise[]>([]);
  const [aAppeler, setAAppeler] = useState<Entreprise[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [charge, setCharge] = useState(false);

  useEffect(() => {
    if (!membre) return;
    const maintenant = new Date();
    const aujourdhui = dateLocale(maintenant);
    const debutJour = instantLocal(aujourdhui, "00:00").toISOString();
    const finDemain = instantLocal(ajouterJours(aujourdhui, 2), "00:00").toISOString();
    const finJour = instantLocal(ajouterJours(aujourdhui, 1), "00:00").toISOString();
    const lundi = instantLocal(lundiDe(aujourdhui), "00:00").toISOString();

    Promise.all([
      supabase
        .from("degustations")
        .select("*, entreprise:entreprises(id, nom), contact:contacts(prenom, nom, telephone)")
        .gte("debut", debutJour)
        .lt("debut", finDemain)
        .neq("statut", "annulee")
        .order("debut"),
      supabase
        .from("entreprises")
        .select("*")
        .eq("ne_plus_appeler", false)
        .not("date_rappel", "is", null)
        .lt("date_rappel", finJour)
        .in("statut", ["À appeler", "Pas joint", "Rappel prévu", "Dégustation faite"])
        .order("date_rappel")
        .limit(50),
      supabase
        .from("entreprises")
        .select("*")
        .eq("ne_plus_appeler", false)
        .in("statut", ["À appeler", "Pas joint"])
        .is("date_rappel", null)
        .order("updated_at")
        .limit(25),
      supabase.from("activites").select("id", { count: "exact", head: true }).eq("type", "appel").eq("membre_id", membre.id).gte("created_at", lundi),
      supabase.from("degustations").select("id", { count: "exact", head: true }).eq("reserve_par", membre.id).gte("created_at", lundi),
      supabase.from("degustations").select("id", { count: "exact", head: true }).eq("resultat", "signee").gte("debut", lundi),
    ]).then(([d, r, a, appels, degus, signees]) => {
      setDegustations((d.data as DegustationJour[]) ?? []);
      setRappels((r.data as Entreprise[]) ?? []);
      setAAppeler((a.data as Entreprise[]) ?? []);
      setStats({ appels: appels.count ?? 0, degustations: degus.count ?? 0, signees: signees.count ?? 0 });
      setCharge(true);
    });
  }, [membre]);

  const aujourdhui = dateLocale(new Date());

  return (
    <div className="mx-auto max-w-5xl">
      <EnTete titre={`Bonjour ${membre?.nom.split(" ")[0] ?? ""}`} sousTitre="Ta journée de prospection" />

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat valeur={stats?.appels} libelle="Mes appels cette semaine" />
        <Stat valeur={stats?.degustations} libelle="Mes dégustations réservées" />
        <Stat valeur={stats?.signees} libelle="Entreprises signées (équipe)" />
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-bold">Dégustations aujourd&apos;hui et demain</h2>
        {charge && degustations.length === 0 && <Vide>Aucune dégustation prévue. On en réserve une?</Vide>}
        <div className="grid gap-3 md:grid-cols-2">
          {degustations.map((d) => (
            <Link key={d.id} href={`/entreprises/${d.entreprise_id}`} className="carte block hover:border-stone-400">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{d.entreprise?.nom}</p>
                  <p className="text-sm text-stone-600">
                    {dateLocale(new Date(d.debut)) === aujourdhui ? "Aujourd'hui" : "Demain"} à {formaterHeure(new Date(d.debut))}
                    {d.nb_personnes ? ` · ${d.nb_personnes} personnes` : ""}
                  </p>
                </div>
                <PastilleDegustation statut={d.statut} />
              </div>
              {d.adresse && <p className="mt-2 text-sm text-stone-600">{d.adresse}</p>}
              {d.contact && (
                <p className="mt-1 text-sm text-stone-600">
                  {nomContact(d.contact)} {d.contact.telephone ? `· ${formaterTelephone(d.contact.telephone)}` : ""}
                </p>
              )}
              {d.allergies && <p className="mt-1 text-sm font-medium text-amber-700">Allergies : {d.allergies}</p>}
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-bold">Rappels dus</h2>
        {charge && rappels.length === 0 && <Vide>Aucun rappel pour aujourd&apos;hui.</Vide>}
        <ListeEntreprises entreprises={rappels} avecRappel />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">À appeler</h2>
        {charge && aAppeler.length === 0 && <Vide>Plus personne à appeler. Demande une nouvelle liste à Tommy.</Vide>}
        <ListeEntreprises entreprises={aAppeler} />
      </section>
    </div>
  );
}

function Stat({ valeur, libelle }: { valeur: number | undefined; libelle: string }) {
  return (
    <div className="carte">
      <p className="text-2xl font-bold">{valeur ?? "–"}</p>
      <p className="text-xs text-stone-500">{libelle}</p>
    </div>
  );
}

function ListeEntreprises({ entreprises, avecRappel = false }: { entreprises: Entreprise[]; avecRappel?: boolean }) {
  if (!entreprises.length) return null;
  return (
    <div className="divide-y divide-stone-100 overflow-hidden rounded-lg border border-stone-200 bg-white">
      {entreprises.map((e) => (
        <Link key={e.id} href={`/entreprises/${e.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-stone-50">
          <div className="min-w-0">
            <p className="truncate font-medium">{e.nom}</p>
            <p className="text-xs text-stone-500">
              {[e.ville, e.nb_employes ? `${e.nb_employes} employés` : null, e.telephone ? formaterTelephone(e.telephone) : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {avecRappel && e.date_rappel && <span className="text-xs text-amber-700">{formaterDateHeure(new Date(e.date_rappel))}</span>}
            <PastilleStatut statut={e.statut} />
          </div>
        </Link>
      ))}
    </div>
  );
}
