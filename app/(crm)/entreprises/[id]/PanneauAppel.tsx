"use client";

import { useState } from "react";
import { Erreur } from "@/app/components/ui";
import { changementApresAppel, RESULTATS_APPEL, type ResultatAppel } from "@/lib/pipeline";
import { supabase } from "@/lib/supabase";
import { ajouterJours, dateLocale, depuisChampLocal } from "@/lib/temps";
import type { Entreprise, Membre } from "@/lib/types";

// Résultat d'un appel en un clic. La dégustation se réserve dans le
// formulaire à côté.
export default function PanneauAppel({
  entreprise,
  membre,
  onReserver,
  onChange,
}: {
  entreprise: Entreprise;
  membre: Membre;
  onReserver: () => void;
  onChange: () => void;
}) {
  const [note, setNote] = useState("");
  const [rappel, setRappel] = useState(`${ajouterJours(dateLocale(new Date()), 2)}T10:00`);
  const [choixRappel, setChoixRappel] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function enregistrer(resultat: ResultatAppel) {
    if (resultat === "ne_plus_appeler" && !window.confirm("Ne plus jamais appeler cette entreprise?")) return;
    const dateRappel = resultat === "rappel" ? depuisChampLocal(rappel) : null;
    if (resultat === "rappel" && !dateRappel) return setErreur("Choisis la date du rappel.");

    setEnvoi(true);
    setErreur(null);
    const changement = changementApresAppel(entreprise.statut, resultat, dateRappel);
    const { error } = await supabase.from("activites").insert({
      entreprise_id: entreprise.id,
      membre_id: membre.id,
      type: "appel",
      resultat: RESULTATS_APPEL[resultat],
      note: note.trim() || null,
    });
    if (!error && Object.keys(changement).length) {
      const { error: erreurMaj } = await supabase.from("entreprises").update(changement).eq("id", entreprise.id);
      if (erreurMaj) setErreur(erreurMaj.message);
    }
    if (error) setErreur(error.message);
    setEnvoi(false);
    setNote("");
    setChoixRappel(false);
    onChange();
  }

  if (entreprise.ne_plus_appeler) {
    return (
      <div className="carte border-red-200 bg-red-50">
        <p className="font-semibold text-red-800">Ne plus appeler</p>
        <p className="text-sm text-red-700">Cette entreprise a demandé de ne plus être sollicitée.</p>
      </div>
    );
  }

  return (
    <div className="carte">
      <h2 className="mb-1 font-bold">Résultat de l&apos;appel</h2>
      <p className="mb-3 text-xs text-stone-500">
        « Bonjour, c&apos;est Jonathan de Chef Mayer à St-Jérôme. J&apos;aimerais venir faire goûter mes repas à votre équipe, gratuitement, un midi. »
      </p>
      <textarea className="champ mb-3" rows={2} placeholder="Note (facultatif)" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="grid gap-2 sm:grid-cols-2">
        <button className="bouton" disabled={envoi} onClick={onReserver}>
          Dégustation réservée
        </button>
        <button className="bouton-secondaire" disabled={envoi} onClick={() => setChoixRappel(!choixRappel)}>
          Rappeler plus tard
        </button>
        <button className="bouton-secondaire" disabled={envoi} onClick={() => enregistrer("pas_joint")}>
          Pas joint
        </button>
        <button className="bouton-secondaire" disabled={envoi} onClick={() => enregistrer("message_laisse")}>
          Message laissé
        </button>
        <button className="bouton-secondaire" disabled={envoi} onClick={() => enregistrer("non_interesse")}>
          Pas intéressé
        </button>
        <button className="bouton-secondaire text-red-700" disabled={envoi} onClick={() => enregistrer("ne_plus_appeler")}>
          Ne plus appeler
        </button>
      </div>
      {choixRappel && (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-md bg-stone-50 p-3">
          <div className="grow">
            <label className="etiquette">Rappeler le</label>
            <input type="datetime-local" className="champ" value={rappel} onChange={(e) => setRappel(e.target.value)} />
          </div>
          <button className="bouton" disabled={envoi} onClick={() => enregistrer("rappel")}>
            Enregistrer le rappel
          </button>
        </div>
      )}
      <div className="mt-2">
        <Erreur message={erreur} />
      </div>
    </div>
  );
}
