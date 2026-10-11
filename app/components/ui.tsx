"use client";

import { COULEURS_STATUT, type Statut } from "@/lib/pipeline";
import { STATUTS_DEGUSTATION, type StatutDegustation } from "@/lib/degustations";

export function PastilleStatut({ statut }: { statut: Statut }) {
  const couleur = COULEURS_STATUT[statut] ?? "#6b7280";
  return (
    <span
      className="inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ color: couleur, backgroundColor: `${couleur}1a` }}
    >
      {statut}
    </span>
  );
}

const COULEURS_DEGUSTATION: Record<StatutDegustation, string> = {
  reservee: "#7c3aed",
  confirmee: "#15803d",
  a_reporter: "#b45309",
  faite: "#2563eb",
  annulee: "#9ca3af",
};

export function PastilleDegustation({ statut }: { statut: StatutDegustation }) {
  const couleur = COULEURS_DEGUSTATION[statut];
  return (
    <span
      className="inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ color: couleur, backgroundColor: `${couleur}1a` }}
    >
      {STATUTS_DEGUSTATION[statut]}
    </span>
  );
}

export function EnTete({ titre, sousTitre, children }: { titre: string; sousTitre?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-encre">{titre}</h1>
        {sousTitre && <p className="mt-1 text-sm text-stone-500">{sousTitre}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Vide({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md border border-dashed border-stone-300 p-4 text-center text-sm text-stone-500">{children}</p>;
}

export function Erreur({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>;
}

export function Succes({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{message}</p>;
}

export function Modale({
  titre,
  onFermer,
  children,
}: {
  titre: string;
  onFermer: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 md:items-center" onClick={onFermer}>
      <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{titre}</h2>
          <button onClick={onFermer} className="text-sm text-stone-500 hover:text-stone-900">
            Fermer
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
