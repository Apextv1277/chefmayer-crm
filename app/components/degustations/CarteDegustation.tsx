"use client";

import { useState } from "react";
import { Erreur, PastilleDegustation } from "@/app/components/ui";
import {
  changerStatut,
  reporterDegustation,
  suggererCode,
  terminerDegustation,
  type ResultatAction,
} from "@/lib/actionsDegustation";
import { formaterTelephone } from "@/lib/coordonnees";
import { RESULTATS_DEGUSTATION, type ResultatDegustation } from "@/lib/degustations";
import { useMembre } from "@/lib/membre";
import { depuisChampLocal, formaterDateHeure, versChampLocal } from "@/lib/temps";
import { nomContact, type Contact, type Degustation } from "@/lib/types";

type Props = {
  degustation: Degustation;
  entrepriseNom: string;
  contact?: Pick<Contact, "prenom" | "nom" | "telephone"> | null;
  afficherEntreprise?: boolean;
  onChange: () => void;
};

export default function CarteDegustation({ degustation: d, entrepriseNom, contact, afficherEntreprise = false, onChange }: Props) {
  const membre = useMembre();
  const [mode, setMode] = useState<"" | "terminer" | "reporter">("");
  const [resultat, setResultat] = useState<ResultatDegustation>("signee");
  const [code, setCode] = useState(suggererCode(entrepriseNom));
  const [nouvelleDate, setNouvelleDate] = useState(versChampLocal(d.debut));
  const [erreur, setErreur] = useState<string | null>(null);
  const [avertissement, setAvertissement] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const active = d.statut === "reservee" || d.statut === "confirmee" || d.statut === "a_reporter";
  const [maintenant] = useState(() => Date.now());
  const passee = new Date(d.debut).getTime() < maintenant;

  async function executer(action: () => Promise<ResultatAction>) {
    setEnvoi(true);
    setErreur(null);
    const r = await action();
    setEnvoi(false);
    if (!r.ok) return setErreur(r.erreur);
    setAvertissement(r.avertissement ?? null);
    setMode("");
    onChange();
  }

  return (
    <div className="carte">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          {afficherEntreprise && <p className="font-semibold">{entrepriseNom}</p>}
          <p className={afficherEntreprise ? "text-sm text-stone-700" : "font-semibold"}>{formaterDateHeure(new Date(d.debut))}</p>
          <p className="text-sm text-stone-600">
            {[d.nb_personnes ? `${d.nb_personnes} personnes` : null, d.adresse].filter(Boolean).join(" · ")}
          </p>
          {contact && (
            <p className="text-sm text-stone-600">
              {nomContact(contact)}
              {contact.telephone ? ` · ${formaterTelephone(contact.telephone)}` : ""}
            </p>
          )}
          {d.allergies && <p className="text-sm font-medium text-amber-700">Allergies : {d.allergies}</p>}
          {d.resultat && <p className="text-sm font-medium">{RESULTATS_DEGUSTATION[d.resultat]}</p>}
          {d.notes && <p className="mt-1 whitespace-pre-line text-xs text-stone-500">{d.notes}</p>}
        </div>
        <PastilleDegustation statut={d.statut} />
      </div>

      {membre && active && mode === "" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {passee ? (
            <button className="bouton" disabled={envoi} onClick={() => setMode("terminer")}>
              Dégustation faite
            </button>
          ) : (
            d.statut !== "confirmee" && (
              <button className="bouton-secondaire" disabled={envoi} onClick={() => executer(() => changerStatut(d, "confirmee", membre))}>
                Marquer confirmée
              </button>
            )
          )}
          {!passee && (
            <button className="bouton-secondaire" disabled={envoi} onClick={() => setMode("terminer")}>
              Faite
            </button>
          )}
          <button className="bouton-secondaire" disabled={envoi} onClick={() => setMode("reporter")}>
            Reporter
          </button>
          <button
            className="bouton-secondaire"
            disabled={envoi}
            onClick={() => window.confirm("Annuler cette dégustation?") && executer(() => changerStatut(d, "annulee", membre))}
          >
            Annuler
          </button>
        </div>
      )}

      {membre && mode === "terminer" && (
        <div className="mt-3 grid gap-2 rounded-md bg-stone-50 p-3">
          <label className="etiquette">Comment ça s&apos;est passé?</label>
          <select className="champ" value={resultat} onChange={(e) => setResultat(e.target.value as ResultatDegustation)}>
            {Object.entries(RESULTATS_DEGUSTATION).map(([valeur, libelle]) => (
              <option key={valeur} value={valeur}>
                {libelle}
              </option>
            ))}
          </select>
          {resultat === "signee" && (
            <>
              <label className="etiquette">Code de rabais créé dans Shopify</label>
              <input className="champ uppercase" value={code} onChange={(e) => setCode(e.target.value)} />
              <p className="text-xs text-stone-500">Le client reçoit le code et le lien de commande le lendemain matin.</p>
            </>
          )}
          <div className="flex gap-2">
            <button className="bouton" disabled={envoi} onClick={() => executer(() => terminerDegustation(d, resultat, membre, code))}>
              Enregistrer
            </button>
            <button className="bouton-secondaire" onClick={() => setMode("")}>
              Retour
            </button>
          </div>
        </div>
      )}

      {membre && mode === "reporter" && (
        <div className="mt-3 grid gap-2 rounded-md bg-stone-50 p-3">
          <label className="etiquette">Nouvelle date et heure</label>
          <input type="datetime-local" className="champ" value={nouvelleDate} onChange={(e) => setNouvelleDate(e.target.value)} />
          <p className="text-xs text-stone-500">Le client reçoit une nouvelle confirmation avec la nouvelle date.</p>
          <div className="flex gap-2">
            <button
              className="bouton"
              disabled={envoi || !depuisChampLocal(nouvelleDate)}
              onClick={() => executer(() => reporterDegustation(d, depuisChampLocal(nouvelleDate)!, membre))}
            >
              Reporter
            </button>
            <button className="bouton-secondaire" onClick={() => setMode("")}>
              Retour
            </button>
          </div>
        </div>
      )}

      <div className="mt-2">
        <Erreur message={erreur} />
        {avertissement && <p className="text-xs text-amber-700">{avertissement}</p>}
      </div>
    </div>
  );
}
