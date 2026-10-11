"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EnTete, Erreur, Succes, Vide } from "@/app/components/ui";
import { chargerToutesLesLignes } from "@/lib/chargement";
import { estGestionnaire, useMembre } from "@/lib/membre";
import { arrondirCents, palierRabais, releveDuMois, type VolumeSemaine } from "@/lib/royaute";
import { supabase } from "@/lib/supabase";
import { dateLocale, instantLocal, lundiDe } from "@/lib/temps";
import type { Entreprise } from "@/lib/types";

const dollars = new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" });

function moisPrecedent(mois: string, decalage: number) {
  const [a, m] = mois.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + decalage, 1));
  return d.toISOString().slice(0, 7);
}

function nomMois(mois: string) {
  return new Intl.DateTimeFormat("fr-CA", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${mois}-15T12:00:00Z`));
}

type Activite = { compte: number; libelle: string };

export default function Comptes() {
  const membre = useMembre();
  const [mois, setMois] = useState(dateLocale(new Date()).slice(0, 7));
  const [clients, setClients] = useState<Entreprise[]>([]);
  const [volumes, setVolumes] = useState<VolumeSemaine[]>([]);
  const [activite, setActivite] = useState<Activite[]>([]);

  const charger = useCallback(async () => {
    const debut = `${moisPrecedent(mois, -1)}-01`;
    const [c, v] = await Promise.all([
      supabase.from("entreprises").select("*").or('statut.eq."Client actif",code_rabais.not.is.null').order("nom"),
      chargerToutesLesLignes<VolumeSemaine>((d, f) =>
        supabase.from("volumes").select("entreprise_id, semaine, repas, ventes_nettes").gte("semaine", debut).order("semaine").range(d, f)
      ),
    ]);
    setClients((c.data as Entreprise[]) ?? []);
    setVolumes(v.data.map((x) => ({ ...x, ventes_nettes: Number(x.ventes_nettes) })));

    const de = instantLocal(`${mois}-01`, "00:00").toISOString();
    const a = instantLocal(`${moisPrecedent(mois, 1)}-01`, "00:00").toISOString();
    const compter = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count ?? 0);
    const [appels, reservees, faites, signees] = await Promise.all([
      compter(supabase.from("activites").select("id", { count: "exact", head: true }).eq("type", "appel").gte("created_at", de).lt("created_at", a)),
      compter(supabase.from("degustations").select("id", { count: "exact", head: true }).gte("created_at", de).lt("created_at", a)),
      compter(supabase.from("degustations").select("id", { count: "exact", head: true }).eq("statut", "faite").gte("debut", de).lt("debut", a)),
      compter(supabase.from("degustations").select("id", { count: "exact", head: true }).eq("resultat", "signee").gte("debut", de).lt("debut", a)),
    ]);
    setActivite([
      { compte: appels, libelle: "appels" },
      { compte: reservees, libelle: "dégustations réservées" },
      { compte: faites, libelle: "dégustations faites" },
      { compte: signees, libelle: "entreprises signées" },
    ]);
  }, [mois]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, [charger]);

  const parId = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const exclues = useMemo(() => new Set(clients.filter((c) => c.exclue_royaute).map((c) => c.id)), [clients]);
  const releve = useMemo(() => releveDuMois(volumes.filter((v) => !exclues.has(v.entreprise_id)), mois), [volumes, exclues, mois]);
  const total = releve.reduce((s, l) => ({ ventes: s.ventes + l.ventes_nettes, royaute: s.royaute + l.royaute, repas: s.repas + l.repas }), {
    ventes: 0,
    royaute: 0,
    repas: 0,
  });

  // Dernière semaine connue de chaque compte : palier de rabais actuel.
  const derniere = useMemo(() => {
    const m = new Map<string, VolumeSemaine>();
    for (const v of volumes) if (!m.get(v.entreprise_id) || m.get(v.entreprise_id)!.semaine < v.semaine) m.set(v.entreprise_id, v);
    return m;
  }, [volumes]);

  if (membre && !estGestionnaire(membre)) return <p className="text-sm text-stone-600">Réservé à Tommy et Jonathan.</p>;

  function telechargerReleve() {
    const lignes = [
      ["Entreprise", "Code", "Semaines", "Repas", "Ventes nettes", "Royauté"],
      ...releve.map((l) => {
        const e = parId.get(l.entreprise_id);
        return [e?.nom ?? "", e?.code_rabais ?? "", l.semaines, l.repas, l.ventes_nettes.toFixed(2), l.royaute.toFixed(2)];
      }),
      ["Total", "", "", total.repas, arrondirCents(total.ventes).toFixed(2), arrondirCents(total.royaute).toFixed(2)],
    ];
    const csv = lignes.map((l) => l.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\n");
    const lien = document.createElement("a");
    lien.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    lien.download = `releve-royaute-${mois}.csv`;
    lien.click();
  }

  return (
    <div className="mx-auto max-w-5xl">
      <EnTete titre="Comptes et royauté" sousTitre="Volumes hebdomadaires par code (rapport Shopify) et relevé du 15">
        <div className="flex items-center gap-1">
          <button className="bouton-secondaire px-3" onClick={() => setMois(moisPrecedent(mois, -1))}>
            ←
          </button>
          <span className="w-40 text-center text-sm font-semibold capitalize">{nomMois(mois)}</span>
          <button className="bouton-secondaire px-3" onClick={() => setMois(moisPrecedent(mois, 1))}>
            →
          </button>
        </div>
      </EnTete>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {activite.map((a) => (
          <div key={a.libelle} className="carte">
            <p className="text-2xl font-bold">{a.compte}</p>
            <p className="text-xs text-stone-500">{a.libelle}</p>
          </div>
        ))}
      </div>

      <section className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold">Relevé de royauté</h2>
          {releve.length > 0 && (
            <button className="bouton-secondaire" onClick={telechargerReleve}>
              Télécharger (CSV)
            </button>
          )}
        </div>
        <p className="mb-3 text-xs text-stone-500">
          10 % sur les repas 1 à 24 de la semaine, 8 % de 25 à 74, 7 % à partir de 75, par entreprise, sur les ventes nettes. Une semaine
          compte dans le mois de son lundi.
        </p>
        {releve.length === 0 ? (
          <Vide>Aucun volume saisi pour ce mois.</Vide>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
                <tr>
                  <th className="px-4 py-2">Entreprise</th>
                  <th className="px-4 py-2">Code</th>
                  <th className="px-4 py-2 text-right">Semaines</th>
                  <th className="px-4 py-2 text-right">Repas</th>
                  <th className="px-4 py-2 text-right">Ventes nettes</th>
                  <th className="px-4 py-2 text-right">Royauté</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {releve.map((l) => {
                  const e = parId.get(l.entreprise_id);
                  return (
                    <tr key={l.entreprise_id}>
                      <td className="px-4 py-2">
                        <Link href={`/entreprises/${l.entreprise_id}`} className="hover:text-rouge">
                          {e?.nom}
                        </Link>
                      </td>
                      <td className="px-4 py-2">{e?.code_rabais}</td>
                      <td className="px-4 py-2 text-right">{l.semaines}</td>
                      <td className="px-4 py-2 text-right">{l.repas}</td>
                      <td className="px-4 py-2 text-right">{dollars.format(l.ventes_nettes)}</td>
                      <td className="px-4 py-2 text-right font-semibold">{dollars.format(l.royaute)}</td>
                    </tr>
                  );
                })}
                <tr className="bg-stone-50 font-bold">
                  <td className="px-4 py-2" colSpan={3}>
                    Total
                  </td>
                  <td className="px-4 py-2 text-right">{total.repas}</td>
                  <td className="px-4 py-2 text-right">{dollars.format(total.ventes)}</td>
                  <td className="px-4 py-2 text-right">{dollars.format(total.royaute)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div>
          <h2 className="mb-2 text-lg font-bold">Comptes actifs</h2>
          {clients.length === 0 ? (
            <Vide>Aucun compte actif. Une entreprise devient cliente quand sa dégustation est marquée « Signée ».</Vide>
          ) : (
            <div className="divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white">
              {clients.map((c) => {
                const v = derniere.get(c.id);
                const palier = v ? palierRabais(v.repas) : null;
                return (
                  <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
                    <div>
                      <Link href={`/entreprises/${c.id}`} className="font-medium hover:text-rouge">
                        {c.nom}
                      </Link>
                      <p className="text-xs text-stone-500">
                        Code {c.code_rabais ?? "à créer"}
                        {c.exclue_royaute ? " · exclue de la royauté" : ""}
                      </p>
                    </div>
                    <p className="text-right text-xs text-stone-600">
                      {v ? (
                        <>
                          {v.repas} repas la semaine du {v.semaine}
                          <br />
                          Palier : {Math.round((palier?.rabais ?? 0) * 100)} % de rabais
                        </>
                      ) : (
                        "Aucun volume saisi"
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <SaisieVolume clients={clients} onEnregistre={charger} />
      </section>
    </div>
  );
}

function SaisieVolume({ clients, onEnregistre }: { clients: Entreprise[]; onEnregistre: () => void }) {
  const [entreprise, setEntreprise] = useState("");
  const [jour, setJour] = useState(() => lundiDe(dateLocale(new Date(Date.now() - 7 * 24 * 3600 * 1000))));
  const [repas, setRepas] = useState("");
  const [ventes, setVentes] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setSucces(null);
    const semaine = lundiDe(jour);
    const { error } = await supabase.from("volumes").upsert(
      { entreprise_id: entreprise, semaine, repas: Number(repas), ventes_nettes: Number(ventes.replace(",", ".")) },
      { onConflict: "entreprise_id,semaine" }
    );
    if (error) return setErreur(error.message);
    setSucces(`Semaine du ${semaine} enregistrée.`);
    setRepas("");
    setVentes("");
    onEnregistre();
  }

  return (
    <form onSubmit={enregistrer} className="carte grid content-start gap-3">
      <h2 className="font-bold">Saisir une semaine</h2>
      <p className="text-xs text-stone-500">Shopify → Analyse → Ventes par code de réduction, pour la semaine (lundi au dimanche).</p>
      <select className="champ" required value={entreprise} onChange={(e) => setEntreprise(e.target.value)}>
        <option value="">Entreprise…</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nom} {c.code_rabais ? `(${c.code_rabais})` : ""}
          </option>
        ))}
      </select>
      <div>
        <label className="etiquette">Semaine du (lundi)</label>
        <input type="date" className="champ" required value={jour} onChange={(e) => setJour(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="etiquette">Repas</label>
          <input type="number" min={0} className="champ" required value={repas} onChange={(e) => setRepas(e.target.value)} />
        </div>
        <div>
          <label className="etiquette">Ventes nettes ($)</label>
          <input inputMode="decimal" className="champ" required value={ventes} onChange={(e) => setVentes(e.target.value)} placeholder="Après rabais, avant taxes" />
        </div>
      </div>
      <Erreur message={erreur} />
      <Succes message={succes} />
      <button className="bouton" disabled={!entreprise}>
        Enregistrer
      </button>
    </form>
  );
}
