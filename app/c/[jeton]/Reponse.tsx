"use client";

import { useState } from "react";

export default function Reponse({
  jeton,
  statutInitial,
  actionSuggeree,
}: {
  jeton: string;
  statutInitial: string;
  actionSuggeree: "confirmer" | "reporter";
}) {
  const [statut, setStatut] = useState(statutInitial);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function repondre(action: "confirmer" | "reporter") {
    setEnvoi(true);
    setErreur(null);
    const reponse = await fetch("/api/degustations/reponse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jeton, action }),
    });
    const corps = await reponse.json().catch(() => ({}));
    setEnvoi(false);
    if (!reponse.ok) return setErreur(corps.error ?? "Une erreur est survenue. Réessayez ou répondez au courriel.");
    setStatut(corps.statut);
  }

  if (statut === "confirmee") {
    return <p className="rounded-md bg-green-50 p-3 text-green-800">C&apos;est confirmé, merci! On a hâte de vous faire goûter nos repas.</p>;
  }
  if (statut === "a_reporter") {
    return <p className="rounded-md bg-amber-50 p-3 text-amber-800">Bien reçu. Jonathan vous appelle très bientôt pour choisir une nouvelle date.</p>;
  }
  if (statut === "faite") return <p>Merci de nous avoir reçus!</p>;
  if (statut === "annulee") return <p>Cette dégustation a été annulée. Pour en réserver une autre, répondez au courriel reçu.</p>;

  const confirmer = (
    <button key="c" className="bouton w-full" disabled={envoi} onClick={() => repondre("confirmer")}>
      Je confirme
    </button>
  );
  const reporter = (
    <button key="r" className="bouton-secondaire w-full" disabled={envoi} onClick={() => repondre("reporter")}>
      Je dois reporter
    </button>
  );
  return (
    <div className="grid gap-2">
      {actionSuggeree === "reporter" ? [reporter, confirmer] : [confirmer, reporter]}
      {erreur && <p className="text-sm text-red-700">{erreur}</p>}
    </div>
  );
}
