"use client";

import { useState } from "react";
import { Erreur, Modale } from "@/app/components/ui";
import { reserverDegustation } from "@/lib/actionsDegustation";
import { ajouterJours, dateLocale, depuisChampLocal } from "@/lib/temps";
import { nomContact, type Contact, type Entreprise, type Membre } from "@/lib/types";

export default function FormReservation({
  entreprise,
  contacts,
  membre,
  onFermer,
  onReservee,
}: {
  entreprise: Entreprise;
  contacts: Contact[];
  membre: Membre;
  onFermer: () => void;
  onReservee: (avertissement?: string) => void;
}) {
  const principal = contacts.find((c) => c.principal) ?? contacts[0];
  const [contactId, setContactId] = useState(principal?.id ?? "");
  const [debut, setDebut] = useState(`${ajouterJours(dateLocale(new Date()), 7)}T11:30`);
  const [nb, setNb] = useState("15");
  const [adresse, setAdresse] = useState([entreprise.adresse, entreprise.ville].filter(Boolean).join(", "));
  const [allergies, setAllergies] = useState("");
  const [notes, setNotes] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const contact = contacts.find((c) => c.id === contactId);
  const joignable = contact && (contact.telephone || contact.courriel);

  async function reserver(e: React.FormEvent) {
    e.preventDefault();
    const iso = depuisChampLocal(debut);
    if (!iso || new Date(iso).getTime() < Date.now()) return setErreur("Choisis une date à venir.");
    setEnvoi(true);
    setErreur(null);
    const r = await reserverDegustation(
      {
        entrepriseId: entreprise.id,
        contactId: contactId || null,
        debut: iso,
        adresse: adresse.trim() || null,
        nbPersonnes: nb ? Number(nb) : null,
        allergies: allergies.trim() || null,
        notes: notes.trim() || null,
      },
      membre
    );
    setEnvoi(false);
    if (!r.ok) return setErreur(r.erreur);
    onReservee(r.avertissement);
  }

  return (
    <Modale titre={`Réserver une dégustation : ${entreprise.nom}`} onFermer={onFermer}>
      <form onSubmit={reserver} className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="etiquette">Date et heure</label>
            <input type="datetime-local" className="champ" value={debut} onChange={(e) => setDebut(e.target.value)} required />
          </div>
          <div>
            <label className="etiquette">Personnes</label>
            <input type="number" min={1} className="champ" value={nb} onChange={(e) => setNb(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="etiquette">Adresse de livraison</label>
          <input className="champ" value={adresse} onChange={(e) => setAdresse(e.target.value)} />
        </div>
        <div>
          <label className="etiquette">Personne responsable</label>
          <select className="champ" value={contactId} onChange={(e) => setContactId(e.target.value)}>
            <option value="">Aucune (pas de confirmation automatique)</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {nomContact(c) || c.courriel || c.telephone}
              </option>
            ))}
          </select>
          {contactId && !joignable && (
            <p className="mt-1 text-xs text-amber-700">Ce contact n&apos;a ni cellulaire ni courriel : aucune confirmation ne partira.</p>
          )}
        </div>
        <div>
          <label className="etiquette">Allergies et restrictions</label>
          <input className="champ" value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="Ex. 2 végétariens, 1 allergie aux noix" />
        </div>
        <div>
          <label className="etiquette">Notes pour Jonathan</label>
          <textarea className="champ" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <p className="text-xs text-stone-500">
          Dès la réservation : texto et courriel de confirmation au client (avec boutons Je confirme / Je dois reporter), puis rappels la
          veille et 2 h avant.
        </p>
        <Erreur message={erreur} />
        <button className="bouton" disabled={envoi}>
          {envoi ? "Réservation…" : "Réserver et envoyer la confirmation"}
        </button>
      </form>
    </Modale>
  );
}
