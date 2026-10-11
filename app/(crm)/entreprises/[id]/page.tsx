"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import CarteDegustation from "@/app/components/degustations/CarteDegustation";
import { Erreur, PastilleStatut, Succes } from "@/app/components/ui";
import { formaterTelephone, normaliserTelephone } from "@/lib/coordonnees";
import { estGestionnaire, useEquipe, useMembre } from "@/lib/membre";
import { STATUTS, type Statut } from "@/lib/pipeline";
import { supabase } from "@/lib/supabase";
import { formaterDateHeure } from "@/lib/temps";
import type { Activite, Contact, Degustation, Entreprise, MessageJournal } from "@/lib/types";
import Contacts from "./Contacts";
import FormReservation from "./FormReservation";
import PanneauAppel from "./PanneauAppel";

export default function FicheEntreprise() {
  const { id } = useParams<{ id: string }>();
  const membre = useMembre();
  const equipe = useEquipe();
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [degustations, setDegustations] = useState<Degustation[]>([]);
  const [activites, setActivites] = useState<Activite[]>([]);
  const [messages, setMessages] = useState<MessageJournal[]>([]);
  const [introuvable, setIntrouvable] = useState(false);
  const [reservation, setReservation] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const [e, c, d, a, m] = await Promise.all([
      supabase.from("entreprises").select("*").eq("id", id).maybeSingle(),
      supabase.from("contacts").select("*").eq("entreprise_id", id).order("principal", { ascending: false }).order("created_at"),
      supabase.from("degustations").select("*").eq("entreprise_id", id).order("debut", { ascending: false }),
      supabase.from("activites").select("*").eq("entreprise_id", id).order("created_at", { ascending: false }).limit(100),
      supabase.from("messages").select("*").eq("entreprise_id", id).order("created_at", { ascending: false }).limit(50),
    ]);
    if (!e.data) setIntrouvable(true);
    setEntreprise(e.data as Entreprise | null);
    setContacts((c.data as Contact[]) ?? []);
    setDegustations((d.data as Degustation[]) ?? []);
    setActivites((a.data as Activite[]) ?? []);
    setMessages((m.data as MessageJournal[]) ?? []);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, [charger]);

  const noms = useMemo(() => new Map(equipe.map((m) => [m.id, m.nom])), [equipe]);

  if (introuvable) {
    return (
      <p className="text-sm text-stone-600">
        Entreprise introuvable. <Link href="/entreprises" className="underline">Retour à la liste</Link>
      </p>
    );
  }
  if (!entreprise || !membre) return <p className="text-sm text-stone-500">Chargement…</p>;

  const gestion = estGestionnaire(membre);
  const contactsParId = new Map(contacts.map((c) => [c.id, c]));

  async function modifier(changements: Partial<Entreprise>) {
    const { error } = await supabase.from("entreprises").update(changements).eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    if (changements.statut && membre) {
      await supabase.from("activites").insert({ entreprise_id: id, membre_id: membre.id, type: "statut", resultat: changements.statut });
    }
    charger();
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/entreprises" className="text-sm text-stone-500 hover:text-stone-900">
        ← Entreprises
      </Link>
      <div className="mb-6 mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{entreprise.nom}</h1>
          <p className="text-sm text-stone-600">
            {[entreprise.secteur, entreprise.ville, entreprise.nb_employes ? `${entreprise.nb_employes} employés` : null].filter(Boolean).join(" · ")}
          </p>
          {entreprise.telephone && (
            <a href={`tel:${entreprise.telephone}`} className="text-sm font-semibold text-rouge">
              {formaterTelephone(entreprise.telephone)}
            </a>
          )}
          {entreprise.code_rabais && <p className="mt-1 text-sm">Code de rabais : <strong>{entreprise.code_rabais}</strong></p>}
          {entreprise.date_rappel && <p className="mt-1 text-sm text-amber-700">Rappel : {formaterDateHeure(new Date(entreprise.date_rappel))}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PastilleStatut statut={entreprise.statut} />
          <select className="champ w-auto" value={entreprise.statut} onChange={(e) => modifier({ statut: e.target.value as Statut })}>
            {STATUTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          {gestion && (
            <select className="champ w-auto" value={entreprise.assigne_a ?? ""} onChange={(e) => modifier({ assigne_a: e.target.value || null })}>
              <option value="">Non assignée</option>
              {equipe.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nom}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <Succes message={confirmation} />

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="grid content-start gap-4">
          <PanneauAppel entreprise={entreprise} membre={membre} onReserver={() => setReservation(true)} onChange={charger} />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-bold">Dégustations</h2>
              {!entreprise.ne_plus_appeler && (
                <button className="text-sm font-semibold text-rouge" onClick={() => setReservation(true)}>
                  + Réserver
                </button>
              )}
            </div>
            {degustations.length === 0 && <p className="text-sm text-stone-500">Aucune dégustation pour l&apos;instant.</p>}
            <div className="grid gap-3">
              {degustations.map((d) => (
                <CarteDegustation
                  key={d.id}
                  degustation={d}
                  entrepriseNom={entreprise.nom}
                  contact={d.contact_id ? contactsParId.get(d.contact_id) : null}
                  onChange={charger}
                />
              ))}
            </div>
          </div>

          <Historique activites={activites} messages={messages} noms={noms} />
        </div>

        <div className="grid content-start gap-4">
          <Contacts entrepriseId={entreprise.id} contacts={contacts} nePlusAppeler={entreprise.ne_plus_appeler} onChange={charger} />
          <Infos entreprise={entreprise} gestion={gestion} onEnregistrer={modifier} />
        </div>
      </div>

      {reservation && (
        <FormReservation
          entreprise={entreprise}
          contacts={contacts}
          membre={membre}
          onFermer={() => setReservation(false)}
          onReservee={(avertissement) => {
            setReservation(false);
            setConfirmation(avertissement ? `Dégustation réservée. ${avertissement}` : "Dégustation réservée : la confirmation est partie au client.");
            charger();
          }}
        />
      )}
    </div>
  );
}

function Infos({
  entreprise,
  gestion,
  onEnregistrer,
}: {
  entreprise: Entreprise;
  gestion: boolean;
  onEnregistrer: (changements: Partial<Entreprise>) => Promise<void>;
}) {
  const [edition, setEdition] = useState(false);
  const [v, setV] = useState({
    secteur: entreprise.secteur ?? "",
    ville: entreprise.ville ?? "",
    adresse: entreprise.adresse ?? "",
    nb_employes: entreprise.nb_employes?.toString() ?? "",
    telephone: entreprise.telephone ? formaterTelephone(entreprise.telephone) : "",
    site_web: entreprise.site_web ?? "",
    notes: entreprise.notes ?? "",
    exclue_royaute: entreprise.exclue_royaute,
    ne_plus_appeler: entreprise.ne_plus_appeler,
  });
  const [erreur, setErreur] = useState<string | null>(null);

  async function enregistrer() {
    const tel = v.telephone.trim() ? normaliserTelephone(v.telephone) : null;
    if (tel && !tel.valide) return setErreur("Numéro de téléphone invalide.");
    await onEnregistrer({
      secteur: v.secteur.trim() || null,
      ville: v.ville.trim() || null,
      adresse: v.adresse.trim() || null,
      nb_employes: v.nb_employes ? Number(v.nb_employes) : null,
      telephone: tel?.e164 ?? null,
      site_web: v.site_web.trim() || null,
      notes: v.notes.trim() || null,
      ne_plus_appeler: v.ne_plus_appeler,
      ...(gestion ? { exclue_royaute: v.exclue_royaute } : {}),
    });
    setEdition(false);
  }

  if (!edition) {
    return (
      <div className="carte text-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold">Informations</h2>
          <button className="text-xs text-stone-500 hover:text-stone-900" onClick={() => setEdition(true)}>
            Modifier
          </button>
        </div>
        <dl className="grid grid-cols-[110px_1fr] gap-y-1">
          <dt className="text-stone-500">Adresse</dt>
          <dd>{[entreprise.adresse, entreprise.ville].filter(Boolean).join(", ") || "—"}</dd>
          <dt className="text-stone-500">Site web</dt>
          <dd className="truncate">
            {entreprise.site_web ? (
              <a className="hover:text-rouge" href={entreprise.site_web.startsWith("http") ? entreprise.site_web : `https://${entreprise.site_web}`} target="_blank" rel="noreferrer">
                {entreprise.site_web}
              </a>
            ) : (
              "—"
            )}
          </dd>
          <dt className="text-stone-500">Royauté</dt>
          <dd>{entreprise.exclue_royaute ? "Exclue (déjà cliente)" : "Oui"}</dd>
        </dl>
        {entreprise.notes && <p className="mt-2 whitespace-pre-line text-stone-700">{entreprise.notes}</p>}
      </div>
    );
  }

  return (
    <div className="carte grid gap-2 text-sm">
      <h2 className="font-bold">Informations</h2>
      <input className="champ" placeholder="Secteur" value={v.secteur} onChange={(e) => setV({ ...v, secteur: e.target.value })} />
      <input className="champ" placeholder="Adresse" value={v.adresse} onChange={(e) => setV({ ...v, adresse: e.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        <input className="champ" placeholder="Ville" value={v.ville} onChange={(e) => setV({ ...v, ville: e.target.value })} />
        <input className="champ" type="number" min={0} placeholder="Employés" value={v.nb_employes} onChange={(e) => setV({ ...v, nb_employes: e.target.value })} />
      </div>
      <input className="champ" placeholder="Téléphone" value={v.telephone} onChange={(e) => setV({ ...v, telephone: e.target.value })} />
      <input className="champ" placeholder="Site web" value={v.site_web} onChange={(e) => setV({ ...v, site_web: e.target.value })} />
      <textarea className="champ" rows={3} placeholder="Notes" value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} />
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={v.ne_plus_appeler} onChange={(e) => setV({ ...v, ne_plus_appeler: e.target.checked })} />
        Ne plus appeler
      </label>
      {gestion && (
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={v.exclue_royaute} onChange={(e) => setV({ ...v, exclue_royaute: e.target.checked })} />
          Exclue de la royauté (déjà cliente avant l&apos;entente)
        </label>
      )}
      <Erreur message={erreur} />
      <div className="flex gap-2">
        <button className="bouton" onClick={enregistrer}>
          Enregistrer
        </button>
        <button className="bouton-secondaire" onClick={() => setEdition(false)}>
          Annuler
        </button>
      </div>
    </div>
  );
}

const LIBELLES_MESSAGE: Record<string, string> = {
  confirmation: "Confirmation",
  rappel_veille: "Rappel la veille",
  rappel_avant: "Rappel 2 h avant",
  remerciement: "Remerciement et code",
  offre: "Offre de dégustation",
  nouvelle: "Alerte : nouvelle dégustation",
  confirmee: "Alerte : confirmée",
  non_confirmee: "Alerte : pas confirmée",
  report: "Alerte : à reporter",
};

function Historique({ activites, messages, noms }: { activites: Activite[]; messages: MessageJournal[]; noms: Map<string, string> }) {
  const elements = [
    ...activites.map((a) => ({
      cle: `a-${a.id}`,
      date: a.created_at,
      titre: a.resultat ?? a.type,
      detail: a.note,
      qui: a.membre_id ? noms.get(a.membre_id) ?? "" : "Automatique",
    })),
    ...messages
      .filter((m) => m.contact_id !== null || m.type === "offre")
      .map((m) => ({
        cle: `m-${m.id}`,
        date: m.created_at,
        titre: `${m.canal === "sms" ? "Texto" : "Courriel"} : ${LIBELLES_MESSAGE[m.type] ?? m.type}`,
        detail: m.statut === "echec" ? `Échec : ${m.erreur}` : m.statut === "test" ? "Mode test : rien n'est parti" : `À ${m.destinataire}`,
        qui: "Envoi",
      })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      <h2 className="mb-2 font-bold">Historique</h2>
      {elements.length === 0 && <p className="text-sm text-stone-500">Rien encore.</p>}
      <ol className="divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white">
        {elements.map((e) => (
          <li key={e.cle} className="px-4 py-2 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="font-medium">{e.titre}</span>
              <span className="text-xs text-stone-500">
                {formaterDateHeure(new Date(e.date))}
                {e.qui ? ` · ${e.qui}` : ""}
              </span>
            </div>
            {e.detail && <p className="whitespace-pre-line text-stone-600">{e.detail}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}
