"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EnTete, Erreur, Modale, PastilleStatut, Vide } from "@/app/components/ui";
import { formaterTelephone, normaliserCourriel, normaliserTelephone } from "@/lib/coordonnees";
import { estGestionnaire, useEquipe, useMembre } from "@/lib/membre";
import { STATUTS } from "@/lib/pipeline";
import { supabase } from "@/lib/supabase";
import { formaterDateHeure } from "@/lib/temps";
import type { Entreprise } from "@/lib/types";

const PAR_PAGE = 50;

export default function Entreprises() {
  const membre = useMembre();
  const equipe = useEquipe();
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [total, setTotal] = useState(0);
  const [recherche, setRecherche] = useState("");
  const [statut, setStatut] = useState("");
  const [assigne, setAssigne] = useState("");
  const [page, setPage] = useState(0);
  const [charge, setCharge] = useState(false);
  const [creation, setCreation] = useState(false);

  useEffect(() => {
    const minuterie = setTimeout(async () => {
      let requete = supabase.from("entreprises").select("*", { count: "exact" });
      // Valeurs entre guillemets : un nom avec espaces ou virgules ne casse pas le filtre.
      const terme = recherche.trim().replace(/[%"\\]/g, " ");
      if (terme) requete = requete.or(`nom.ilike."%${terme}%",ville.ilike."%${terme}%",secteur.ilike."%${terme}%"`);
      if (statut === "ne_plus_appeler") requete = requete.eq("ne_plus_appeler", true);
      else if (statut) requete = requete.eq("statut", statut);
      if (assigne === "aucun") requete = requete.is("assigne_a", null);
      else if (assigne) requete = requete.eq("assigne_a", assigne);
      const { data, count } = await requete.order("updated_at", { ascending: false }).range(page * PAR_PAGE, page * PAR_PAGE + PAR_PAGE - 1);
      setEntreprises((data as Entreprise[]) ?? []);
      setTotal(count ?? 0);
      setCharge(true);
    }, 250);
    return () => clearTimeout(minuterie);
  }, [recherche, statut, assigne, page]);

  const noms = useMemo(() => new Map(equipe.map((m) => [m.id, m.nom])), [equipe]);
  const gestion = estGestionnaire(membre);

  return (
    <div className="mx-auto max-w-6xl">
      <EnTete titre="Entreprises" sousTitre={`${total} entreprise${total > 1 ? "s" : ""}`}>
        {gestion && (
          <Link href="/entreprises/import" className="bouton-secondaire">
            Importer une liste
          </Link>
        )}
        <button className="bouton" onClick={() => setCreation(true)}>
          Ajouter une entreprise
        </button>
      </EnTete>

      <div className="mb-4 grid gap-2 md:grid-cols-[1fr_220px_200px]">
        <input
          className="champ"
          placeholder="Rechercher un nom, une ville, un secteur…"
          value={recherche}
          onChange={(e) => {
            setRecherche(e.target.value);
            setPage(0);
          }}
        />
        <select className="champ" value={statut} onChange={(e) => (setStatut(e.target.value), setPage(0))}>
          <option value="">Tous les statuts</option>
          {STATUTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
          <option value="ne_plus_appeler">Ne plus appeler</option>
        </select>
        {gestion && (
          <select className="champ" value={assigne} onChange={(e) => (setAssigne(e.target.value), setPage(0))}>
            <option value="">Tout le monde</option>
            <option value="aucun">Non assignées</option>
            {equipe.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nom}
              </option>
            ))}
          </select>
        )}
      </div>

      {charge && entreprises.length === 0 && <Vide>Aucune entreprise ne correspond.</Vide>}

      {entreprises.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase text-stone-500">
              <tr>
                <th className="px-4 py-2">Entreprise</th>
                <th className="px-4 py-2">Ville</th>
                <th className="px-4 py-2">Employés</th>
                <th className="px-4 py-2">Téléphone</th>
                <th className="px-4 py-2">Statut</th>
                <th className="px-4 py-2">Rappel</th>
                {gestion && <th className="px-4 py-2">Assignée à</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {entreprises.map((e) => (
                <tr key={e.id} className="hover:bg-stone-50">
                  <td className="px-4 py-2 font-medium">
                    <Link href={`/entreprises/${e.id}`} className="hover:text-rouge">
                      {e.nom}
                    </Link>
                    {e.ne_plus_appeler && <span className="ml-2 text-xs font-semibold text-red-700">Ne plus appeler</span>}
                  </td>
                  <td className="px-4 py-2 text-stone-600">{e.ville}</td>
                  <td className="px-4 py-2 text-stone-600">{e.nb_employes ?? ""}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-stone-600">{formaterTelephone(e.telephone)}</td>
                  <td className="px-4 py-2">
                    <PastilleStatut statut={e.statut} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-xs text-stone-600">{e.date_rappel ? formaterDateHeure(new Date(e.date_rappel)) : ""}</td>
                  {gestion && <td className="px-4 py-2 text-stone-600">{e.assigne_a ? noms.get(e.assigne_a) : ""}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > PAR_PAGE && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button className="bouton-secondaire" disabled={page === 0} onClick={() => setPage(page - 1)}>
            Précédente
          </button>
          <span>
            Page {page + 1} sur {Math.ceil(total / PAR_PAGE)}
          </span>
          <button className="bouton-secondaire" disabled={(page + 1) * PAR_PAGE >= total} onClick={() => setPage(page + 1)}>
            Suivante
          </button>
        </div>
      )}

      {creation && <NouvelleEntreprise onFermer={() => setCreation(false)} />}
    </div>
  );
}

function NouvelleEntreprise({ onFermer }: { onFermer: () => void }) {
  const router = useRouter();
  const membre = useMembre();
  const [champs, setChamps] = useState({ nom: "", ville: "", telephone: "", nb_employes: "", prenom: "", nomContact: "", poste: "", courriel: "", telContact: "" });
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  function maj(cle: keyof typeof champs, valeur: string) {
    setChamps({ ...champs, [cle]: valeur });
  }

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    if (!membre) return;
    setEnvoi(true);
    setErreur(null);
    const { data, error } = await supabase
      .from("entreprises")
      .insert({
        nom: champs.nom.trim(),
        ville: champs.ville.trim() || null,
        telephone: normaliserTelephone(champs.telephone).e164,
        nb_employes: champs.nb_employes ? Number(champs.nb_employes) : null,
        assigne_a: membre.role === "representant" ? membre.id : null,
        cree_par: membre.id,
      })
      .select("id")
      .single();
    if (error || !data) {
      setErreur(error?.message ?? "Création impossible.");
      setEnvoi(false);
      return;
    }
    if (champs.prenom || champs.nomContact || champs.courriel || champs.telContact) {
      await supabase.from("contacts").insert({
        entreprise_id: data.id,
        prenom: champs.prenom.trim() || null,
        nom: champs.nomContact.trim() || null,
        poste: champs.poste.trim() || null,
        courriel: normaliserCourriel(champs.courriel),
        telephone: normaliserTelephone(champs.telContact || champs.telephone).e164,
        principal: true,
      });
    }
    router.push(`/entreprises/${data.id}`);
  }

  return (
    <Modale titre="Nouvelle entreprise" onFermer={onFermer}>
      <form onSubmit={creer} className="grid gap-3">
        <div>
          <label className="etiquette">Nom de l&apos;entreprise</label>
          <input className="champ" required value={champs.nom} onChange={(e) => maj("nom", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="etiquette">Ville</label>
            <input className="champ" value={champs.ville} onChange={(e) => maj("ville", e.target.value)} />
          </div>
          <div>
            <label className="etiquette">Employés</label>
            <input className="champ" type="number" min={0} value={champs.nb_employes} onChange={(e) => maj("nb_employes", e.target.value)} />
          </div>
        </div>
        <div>
          <label className="etiquette">Téléphone de l&apos;entreprise</label>
          <input className="champ" value={champs.telephone} onChange={(e) => maj("telephone", e.target.value)} />
        </div>
        <p className="mt-2 text-sm font-semibold">Personne à joindre (RH, direction)</p>
        <div className="grid grid-cols-2 gap-3">
          <input className="champ" placeholder="Prénom" value={champs.prenom} onChange={(e) => maj("prenom", e.target.value)} />
          <input className="champ" placeholder="Nom" value={champs.nomContact} onChange={(e) => maj("nomContact", e.target.value)} />
          <input className="champ" placeholder="Poste" value={champs.poste} onChange={(e) => maj("poste", e.target.value)} />
          <input className="champ" placeholder="Cellulaire ou ligne directe" value={champs.telContact} onChange={(e) => maj("telContact", e.target.value)} />
        </div>
        <input className="champ" type="email" placeholder="Courriel" value={champs.courriel} onChange={(e) => maj("courriel", e.target.value)} />
        <Erreur message={erreur} />
        <button className="bouton" disabled={envoi}>
          {envoi ? "Création…" : "Créer la fiche"}
        </button>
      </form>
    </Modale>
  );
}
