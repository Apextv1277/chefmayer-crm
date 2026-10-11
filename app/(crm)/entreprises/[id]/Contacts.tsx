"use client";

import { useState } from "react";
import { Erreur, Modale } from "@/app/components/ui";
import { formaterTelephone, normaliserCourriel, normaliserTelephone } from "@/lib/coordonnees";
import { supabase } from "@/lib/supabase";
import { nomContact, type Contact } from "@/lib/types";

export default function Contacts({
  entrepriseId,
  contacts,
  nePlusAppeler,
  onChange,
}: {
  entrepriseId: string;
  contacts: Contact[];
  nePlusAppeler: boolean;
  onChange: () => void;
}) {
  const [edition, setEdition] = useState<Contact | "nouveau" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function envoyerOffre(c: Contact) {
    if (!window.confirm(`Envoyer le courriel d'offre de dégustation à ${c.courriel}?`)) return;
    setMessage(null);
    const reponse = await fetch("/api/courriels/offre", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId: c.id }),
    });
    const corps = await reponse.json().catch(() => ({}));
    setMessage(reponse.ok ? (corps.test ? "Offre inscrite au journal (mode test : rien n'est parti)." : "Offre envoyée.") : corps.error);
    onChange();
  }

  return (
    <div className="carte">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold">Contacts</h2>
        <button className="text-sm font-semibold text-rouge" onClick={() => setEdition("nouveau")}>
          + Ajouter
        </button>
      </div>
      {contacts.length === 0 && <p className="text-sm text-stone-500">Aucun contact. Ajoute la personne des RH ou la direction.</p>}
      <ul className="divide-y divide-stone-100">
        {contacts.map((c) => (
          <li key={c.id} className="py-2 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">
                  {nomContact(c) || "Sans nom"}
                  {c.principal && <span className="ml-2 text-xs text-stone-500">principal</span>}
                </p>
                {c.poste && <p className="text-stone-500">{c.poste}</p>}
                {c.telephone && (
                  <a className="block text-stone-700 hover:text-rouge" href={`tel:${c.telephone}`}>
                    {formaterTelephone(c.telephone)}
                    {c.sms_desabonne && <span className="ml-2 text-xs text-red-700">textos refusés</span>}
                  </a>
                )}
                {c.courriel && (
                  <a className="block text-stone-700 hover:text-rouge" href={`mailto:${c.courriel}`}>
                    {c.courriel}
                    {c.courriel_desabonne && <span className="ml-2 text-xs text-red-700">désabonné</span>}
                  </a>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <button className="text-xs text-stone-500 hover:text-stone-900" onClick={() => setEdition(c)}>
                  Modifier
                </button>
                {c.courriel && !c.courriel_desabonne && !nePlusAppeler && (
                  <button className="text-xs font-semibold text-rouge" onClick={() => envoyerOffre(c)}>
                    Envoyer l&apos;offre
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {message && <p className="mt-2 text-xs text-stone-600">{message}</p>}
      {edition && (
        <EditionContact
          entrepriseId={entrepriseId}
          contact={edition === "nouveau" ? null : edition}
          premier={contacts.length === 0}
          onFermer={() => setEdition(null)}
          onEnregistre={() => {
            setEdition(null);
            onChange();
          }}
        />
      )}
    </div>
  );
}

function EditionContact({
  entrepriseId,
  contact,
  premier,
  onFermer,
  onEnregistre,
}: {
  entrepriseId: string;
  contact: Contact | null;
  premier: boolean;
  onFermer: () => void;
  onEnregistre: () => void;
}) {
  const [c, setC] = useState({
    prenom: contact?.prenom ?? "",
    nom: contact?.nom ?? "",
    poste: contact?.poste ?? "",
    telephone: contact?.telephone ? formaterTelephone(contact.telephone) : "",
    courriel: contact?.courriel ?? "",
    principal: contact?.principal ?? premier,
  });
  const [erreur, setErreur] = useState<string | null>(null);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    const telephone = c.telephone.trim() ? normaliserTelephone(c.telephone) : null;
    if (telephone && !telephone.valide) return setErreur("Numéro de téléphone invalide.");
    const courriel = c.courriel.trim() ? normaliserCourriel(c.courriel) : null;
    if (c.courriel.trim() && !courriel) return setErreur("Courriel invalide.");

    const valeurs = {
      prenom: c.prenom.trim() || null,
      nom: c.nom.trim() || null,
      poste: c.poste.trim() || null,
      telephone: telephone?.e164 ?? null,
      courriel,
      principal: c.principal,
    };
    if (c.principal) {
      const autres = supabase.from("contacts").update({ principal: false }).eq("entreprise_id", entrepriseId);
      await (contact ? autres.neq("id", contact.id) : autres);
    }
    const { error } = contact
      ? await supabase.from("contacts").update(valeurs).eq("id", contact.id)
      : await supabase.from("contacts").insert({ ...valeurs, entreprise_id: entrepriseId });
    if (error) return setErreur(error.message);
    onEnregistre();
  }

  async function supprimer() {
    if (!contact || !window.confirm("Supprimer ce contact?")) return;
    const { error } = await supabase.from("contacts").delete().eq("id", contact.id);
    if (error) return setErreur(error.message);
    onEnregistre();
  }

  return (
    <Modale titre={contact ? "Modifier le contact" : "Nouveau contact"} onFermer={onFermer}>
      <form onSubmit={enregistrer} className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <input className="champ" placeholder="Prénom" value={c.prenom} onChange={(e) => setC({ ...c, prenom: e.target.value })} />
          <input className="champ" placeholder="Nom" value={c.nom} onChange={(e) => setC({ ...c, nom: e.target.value })} />
        </div>
        <input className="champ" placeholder="Poste (ex. Directrice RH)" value={c.poste} onChange={(e) => setC({ ...c, poste: e.target.value })} />
        <input className="champ" placeholder="Cellulaire (pour les textos de confirmation)" value={c.telephone} onChange={(e) => setC({ ...c, telephone: e.target.value })} />
        <input className="champ" type="email" placeholder="Courriel" value={c.courriel} onChange={(e) => setC({ ...c, courriel: e.target.value })} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={c.principal} onChange={(e) => setC({ ...c, principal: e.target.checked })} />
          Contact principal
        </label>
        <Erreur message={erreur} />
        <div className="flex justify-between">
          <button className="bouton">Enregistrer</button>
          {contact && (
            <button type="button" className="text-sm text-red-700" onClick={supprimer}>
              Supprimer
            </button>
          )}
        </div>
      </form>
    </Modale>
  );
}
