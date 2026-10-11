"use client";

import { useState } from "react";

export default function Desabonnement({ jeton }: { jeton: string }) {
  const [fait, setFait] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function confirmer() {
    const reponse = await fetch("/api/desabonnement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jeton }),
    });
    if (reponse.ok) setFait(true);
    else setErreur("Une erreur est survenue. Répondez « désabonner » au courriel reçu.");
  }

  if (fait) return <p className="rounded-md bg-green-50 p-3 text-green-800">C&apos;est fait : vous ne recevrez plus de courriels ni de textos de Chef Mayer.</p>;
  return (
    <div>
      <h1 className="mb-2 text-xl font-bold">Se désabonner</h1>
      <p className="mb-4 text-stone-600">Vous ne recevrez plus de courriels ni de textos de Chef Mayer.</p>
      <button className="bouton w-full" onClick={confirmer}>
        Confirmer le désabonnement
      </button>
      {erreur && <p className="mt-2 text-sm text-red-700">{erreur}</p>}
    </div>
  );
}
