"use client";

import Link from "next/link";
import { useState } from "react";
import { EnTete, Erreur, Succes } from "@/app/components/ui";
import { chargerToutesLesLignes } from "@/lib/chargement";
import { analyserCsv, clesDoublon, type LigneImport } from "@/lib/importCsv";
import { estGestionnaire, useEquipe, useMembre } from "@/lib/membre";
import { supabase } from "@/lib/supabase";

type Apercu = { nouvelles: LigneImport[]; doublons: number; ignorees: number; colonnes: string[] };

const LOT = 200;

export default function ImportListe() {
  const membre = useMembre();
  const equipe = useEquipe();
  const [nomListe, setNomListe] = useState("");
  const [assigne, setAssigne] = useState("");
  const [apercu, setApercu] = useState<Apercu | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  if (membre && !estGestionnaire(membre)) {
    return <p className="text-sm text-stone-600">L&apos;import des listes est réservé à Tommy et Jonathan.</p>;
  }

  async function lireFichier(fichier: File) {
    setErreur(null);
    setSucces(null);
    setApercu(null);
    if (!nomListe) setNomListe(fichier.name.replace(/\.[^.]+$/, ""));
    const resultat = analyserCsv(await fichier.text());
    if (!resultat.lignes.length) {
      setErreur("Aucune entreprise trouvée. Il faut au moins une colonne « Entreprise » (ou « Company »).");
      return;
    }

    // Doublons : déjà au CRM, ou en double dans le fichier.
    const { data: existantes, error } = await chargerToutesLesLignes<{ nom: string; ville: string | null; telephone: string | null }>(
      (debut, fin) => supabase.from("entreprises").select("nom, ville, telephone").range(debut, fin)
    );
    if (error) {
      setErreur(error.message);
      return;
    }
    const connues = new Set(existantes.flatMap(clesDoublon));
    const nouvelles: LigneImport[] = [];
    let doublons = 0;
    for (const ligne of resultat.lignes) {
      const cles = clesDoublon(ligne.entreprise);
      if (cles.some((c) => connues.has(c))) {
        doublons++;
        continue;
      }
      cles.forEach((c) => connues.add(c));
      nouvelles.push(ligne);
    }
    setApercu({ nouvelles, doublons, ignorees: resultat.ignorees, colonnes: resultat.colonnesReconnues });
  }

  async function importer() {
    if (!apercu || !membre) return;
    setEnvoi(true);
    setErreur(null);

    const { data: liste, error: erreurListe } = await supabase
      .from("listes")
      .insert({ nom: nomListe.trim() || "Liste sans nom", nb_entreprises: apercu.nouvelles.length, importee_par: membre.id })
      .select("id")
      .single();
    if (erreurListe || !liste) {
      setErreur(erreurListe?.message ?? "Création de la liste impossible.");
      setEnvoi(false);
      return;
    }

    let importees = 0;
    for (let i = 0; i < apercu.nouvelles.length; i += LOT) {
      // Identifiants créés ici : chaque contact est relié à coup sûr à son
      // entreprise, peu importe l'ordre de retour.
      const lot = apercu.nouvelles.slice(i, i + LOT).map((l) => ({ ...l, id: crypto.randomUUID() }));
      const { data, error } = await supabase
        .from("entreprises")
        .insert(
          lot.map((l) => ({
            id: l.id,
            ...l.entreprise,
            liste_id: liste.id,
            assigne_a: assigne || null,
            cree_par: membre.id,
          }))
        )
        .select("id");
      if (error || !data) {
        setErreur(`Import arrêté après ${importees} entreprises : ${error?.message}`);
        setEnvoi(false);
        return;
      }
      const contacts = lot.flatMap((l) => (l.contact ? [{ ...l.contact, entreprise_id: l.id, principal: true }] : []));
      if (contacts.length) {
        const { error: erreurContacts } = await supabase.from("contacts").insert(contacts);
        if (erreurContacts) setErreur(`Certains contacts n'ont pas été importés : ${erreurContacts.message}`);
      }
      importees += data.length;
    }

    setSucces(`${importees} entreprises importées dans la liste « ${nomListe} ».`);
    setApercu(null);
    setEnvoi(false);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <EnTete titre="Importer une liste" sousTitre="Fichier CSV : export Apollo, Google Sheets ou Excel (Enregistrer sous… CSV)" />

      <div className="carte grid gap-4">
        <div>
          <label className="etiquette">Fichier CSV</label>
          <input type="file" accept=".csv,text/csv" className="champ" onChange={(e) => e.target.files?.[0] && lireFichier(e.target.files[0])} />
          <p className="mt-1 text-xs text-stone-500">
            Colonnes reconnues : Entreprise, Ville, Région, Adresse, Employés, Secteur, Téléphone, Site web, Prénom, Nom, Poste,
            Courriel, Cellulaire, Notes (en français ou en anglais).
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="etiquette">Nom de la liste</label>
            <input className="champ" value={nomListe} onChange={(e) => setNomListe(e.target.value)} placeholder="Ex. Usines St-Jérôme, octobre" />
          </div>
          <div>
            <label className="etiquette">Assigner à</label>
            <select className="champ" value={assigne} onChange={(e) => setAssigne(e.target.value)}>
              <option value="">Personne (Jonathan voit tout)</option>
              {equipe
                .filter((m) => m.actif)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nom}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {apercu && (
          <div className="rounded-md bg-stone-50 p-3 text-sm">
            <p>
              <strong>{apercu.nouvelles.length}</strong> nouvelles entreprises à importer
              {apercu.doublons ? `, ${apercu.doublons} déjà au CRM (ignorées)` : ""}
              {apercu.ignorees ? `, ${apercu.ignorees} lignes sans nom d'entreprise` : ""}.
            </p>
            <p className="mt-1 text-xs text-stone-500">Colonnes reconnues : {apercu.colonnes.join(", ")}</p>
            <ul className="mt-2 list-disc pl-5 text-xs text-stone-600">
              {apercu.nouvelles.slice(0, 5).map((l, i) => (
                <li key={i}>
                  {l.entreprise.nom}
                  {l.entreprise.ville ? `, ${l.entreprise.ville}` : ""}
                  {l.contact?.prenom ? ` (${[l.contact.prenom, l.contact.nom].filter(Boolean).join(" ")})` : ""}
                </li>
              ))}
              {apercu.nouvelles.length > 5 && <li>…</li>}
            </ul>
          </div>
        )}

        <Erreur message={erreur} />
        <Succes message={succes} />

        <div className="flex gap-2">
          <button className="bouton" disabled={!apercu?.nouvelles.length || envoi} onClick={importer}>
            {envoi ? "Import en cours…" : "Importer"}
          </button>
          <Link href="/entreprises" className="bouton-secondaire">
            Retour aux entreprises
          </Link>
        </div>
      </div>
    </div>
  );
}
