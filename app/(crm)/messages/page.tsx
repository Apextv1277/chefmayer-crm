"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EnTete, Vide } from "@/app/components/ui";
import { formaterTelephone } from "@/lib/coordonnees";
import { estGestionnaire, useMembre } from "@/lib/membre";
import { supabase } from "@/lib/supabase";
import { formaterDateHeure } from "@/lib/temps";
import type { MessageJournal } from "@/lib/types";

const STATUTS = {
  envoye: { libelle: "Envoyé", couleur: "text-green-700" },
  test: { libelle: "Mode test", couleur: "text-stone-500" },
  echec: { libelle: "Échec", couleur: "text-red-700" },
  en_cours: { libelle: "En cours", couleur: "text-amber-700" },
} as const;

type Ligne = MessageJournal & { entreprise: { nom: string } | null };

export default function Messages() {
  const membre = useMembre();
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [filtre, setFiltre] = useState("");
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [charge, setCharge] = useState(false);

  useEffect(() => {
    let requete = supabase.from("messages").select("*, entreprise:entreprises(nom)").order("created_at", { ascending: false }).limit(300);
    if (filtre) requete = requete.eq("statut", filtre);
    requete.then(({ data }) => {
      setLignes((data as Ligne[]) ?? []);
      setCharge(true);
    });
  }, [filtre]);

  if (membre && !estGestionnaire(membre)) return <p className="text-sm text-stone-600">Réservé à Tommy et Jonathan.</p>;

  const modeTest = lignes.some((l) => l.statut === "test");

  return (
    <div className="mx-auto max-w-5xl">
      <EnTete titre="Textos et courriels" sousTitre="Tout ce qui part du CRM, automatique ou manuel">
        <select className="champ w-auto" value={filtre} onChange={(e) => setFiltre(e.target.value)}>
          <option value="">Tous</option>
          <option value="envoye">Envoyés</option>
          <option value="echec">Échecs</option>
          <option value="test">Mode test</option>
        </select>
      </EnTete>

      {modeTest && (
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Le mode test est actif : les messages sont inscrits ici, mais rien ne part. Pour envoyer pour vrai, mettre ENVOIS_REELS=1 dans
          Netlify (une fois Telnyx et l&apos;adresse courriel configurés).
        </p>
      )}

      {charge && lignes.length === 0 && <Vide>Aucun message pour l&apos;instant.</Vide>}

      <div className="divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white">
        {lignes.map((l) => (
          <div key={l.id} className="px-4 py-2 text-sm">
            <button className="flex w-full flex-wrap items-center justify-between gap-2 text-left" onClick={() => setOuvert(ouvert === l.id ? null : l.id)}>
              <span>
                <span className="font-medium">{l.canal === "sms" ? "Texto" : "Courriel"}</span> · {l.type.replaceAll("_", " ")} ·{" "}
                {l.canal === "sms" ? formaterTelephone(l.destinataire) : l.destinataire}
                {l.entreprise && <span className="text-stone-500"> · {l.entreprise.nom}</span>}
              </span>
              <span className="flex items-center gap-3 text-xs">
                <span className={`font-semibold ${STATUTS[l.statut].couleur}`}>{STATUTS[l.statut].libelle}</span>
                <span className="text-stone-500">{formaterDateHeure(new Date(l.created_at))}</span>
              </span>
            </button>
            {ouvert === l.id && (
              <div className="mt-2 rounded-md bg-stone-50 p-3 text-xs">
                {l.sujet && <p className="mb-1 font-semibold">{l.sujet}</p>}
                <p className="whitespace-pre-line text-stone-700">{l.contenu}</p>
                {l.erreur && <p className="mt-2 text-red-700">Erreur ({l.tentatives} essai{l.tentatives > 1 ? "s" : ""}) : {l.erreur}</p>}
                {l.entreprise_id && (
                  <Link href={`/entreprises/${l.entreprise_id}`} className="mt-2 inline-block text-rouge">
                    Ouvrir la fiche →
                  </Link>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
