"use client";

import { useEffect, useState } from "react";
import { EnTete, Erreur, Succes } from "@/app/components/ui";
import { formaterTelephone, normaliserTelephone } from "@/lib/coordonnees";
import { useMembre } from "@/lib/membre";
import { supabase } from "@/lib/supabase";
import type { Membre, Role } from "@/lib/types";

const ROLES: Record<Role, string> = {
  admin: "Administrateur (listes, CRM, rapports)",
  chef: "Chef (voit tout, reçoit les alertes de dégustation)",
  representant: "Représentant (ses entreprises seulement)",
};

export default function Equipe() {
  const membre = useMembre();
  const [equipe, setEquipe] = useState<Membre[]>([]);
  const [nouveau, setNouveau] = useState({ nom: "", email: "", role: "representant" as Role, telephone: "", motDePasse: "" });
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    supabase
      .from("membres")
      .select("*")
      .order("nom")
      .then(({ data }) => setEquipe((data as Membre[]) ?? []));
  }, [version]);

  if (membre && membre.role !== "admin") return <p className="text-sm text-stone-600">Réservé à l&apos;administrateur.</p>;

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setSucces(null);
    const reponse = await fetch("/api/equipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nouveau),
    });
    const corps = await reponse.json().catch(() => ({}));
    if (!reponse.ok) return setErreur(corps.error ?? "Ajout impossible.");
    setSucces(`${nouveau.nom} peut se connecter avec ${nouveau.email} et le mot de passe temporaire.`);
    setNouveau({ nom: "", email: "", role: "representant", telephone: "", motDePasse: "" });
    setVersion(version + 1);
  }

  async function modifier(m: Membre, changements: Partial<Membre>) {
    const { error } = await supabase.from("membres").update(changements).eq("id", m.id);
    if (error) return setErreur(error.message);
    setVersion(version + 1);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <EnTete titre="Équipe" sousTitre="Le cellulaire de chaque membre reçoit les alertes de dégustation par texto" />

      <div className="mb-6 divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white">
        {equipe.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
            <div>
              <p className="font-medium">
                {m.nom} {!m.actif && <span className="text-xs text-red-700">(désactivé)</span>}
              </p>
              <p className="text-xs text-stone-500">
                {m.email}
                {m.telephone ? ` · ${formaterTelephone(m.telephone)}` : " · pas de cellulaire (aucune alerte)"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select className="champ w-auto" value={m.role} disabled={m.id === membre?.id} onChange={(e) => modifier(m, { role: e.target.value as Role })}>
                {Object.entries(ROLES).map(([valeur, libelle]) => (
                  <option key={valeur} value={valeur}>
                    {libelle.split(" (")[0]}
                  </option>
                ))}
              </select>
              <button
                className="bouton-secondaire"
                onClick={() => {
                  const tel = window.prompt("Cellulaire pour les alertes", m.telephone ? formaterTelephone(m.telephone) : "");
                  if (tel === null) return;
                  const n = normaliserTelephone(tel);
                  if (tel && !n.valide) return setErreur("Numéro invalide.");
                  modifier(m, { telephone: n.e164 });
                }}
              >
                Cellulaire
              </button>
              {m.id !== membre?.id && (
                <button className="bouton-secondaire" onClick={() => modifier(m, { actif: !m.actif })}>
                  {m.actif ? "Désactiver" : "Réactiver"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={ajouter} className="carte grid gap-3">
        <h2 className="font-bold">Ajouter un membre</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input className="champ" required placeholder="Nom" value={nouveau.nom} onChange={(e) => setNouveau({ ...nouveau, nom: e.target.value })} />
          <input className="champ" required type="email" placeholder="Courriel" value={nouveau.email} onChange={(e) => setNouveau({ ...nouveau, email: e.target.value })} />
          <input className="champ" placeholder="Cellulaire (alertes)" value={nouveau.telephone} onChange={(e) => setNouveau({ ...nouveau, telephone: e.target.value })} />
          <input
            className="champ"
            required
            minLength={10}
            placeholder="Mot de passe temporaire (10 caractères et plus)"
            value={nouveau.motDePasse}
            onChange={(e) => setNouveau({ ...nouveau, motDePasse: e.target.value })}
          />
        </div>
        <select className="champ" value={nouveau.role} onChange={(e) => setNouveau({ ...nouveau, role: e.target.value as Role })}>
          {Object.entries(ROLES).map(([valeur, libelle]) => (
            <option key={valeur} value={valeur}>
              {libelle}
            </option>
          ))}
        </select>
        <Erreur message={erreur} />
        <Succes message={succes} />
        <button className="bouton">Ajouter</button>
      </form>
    </div>
  );
}
