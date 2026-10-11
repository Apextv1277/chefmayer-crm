"use client";

import { useState } from "react";
import { oublierMembre } from "@/lib/membre";
import { supabase } from "@/lib/supabase";

export default function Connexion() {
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function seConnecter(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setErreur(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: motDePasse });
    if (error) {
      setErreur("Courriel ou mot de passe incorrect.");
      setEnvoi(false);
      return;
    }
    oublierMembre();
    // Rechargement complet : le garde du CRM vérifie que le compte fait
    // partie de l'équipe.
    window.location.assign("/aujourdhui");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-encre px-4">
      <form onSubmit={seConnecter} className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <p className="text-xl font-extrabold tracking-widest">
          CHEF <span className="text-rouge">MAYER</span>
        </p>
        <p className="mb-6 text-sm text-stone-500">CRM du programme Repas Entreprises</p>
        <label className="etiquette" htmlFor="email">Courriel</label>
        <input id="email" type="email" className="champ mb-3" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label className="etiquette" htmlFor="mdp">Mot de passe</label>
        <input id="mdp" type="password" className="champ mb-4" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} required />
        {erreur && <p className="mb-3 text-sm text-red-700">{erreur}</p>}
        <button className="bouton w-full" disabled={envoi}>
          {envoi ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
