"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { Membre } from "./types";

let enCours: Promise<Membre | null> | null = null;

// Membre connecté (côté navigateur), chargé une seule fois.
export function chargerMembre(): Promise<Membre | null> {
  if (!enCours) {
    enCours = (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const email = user?.email?.trim().toLowerCase();
      if (!email) return null;
      const { data } = await supabase.from("membres").select("*").eq("email", email).eq("actif", true).maybeSingle();
      return (data as Membre | null) ?? null;
    })();
  }
  return enCours;
}

export function oublierMembre() {
  enCours = null;
}

export function useMembre() {
  const [membre, setMembre] = useState<Membre | null>(null);
  useEffect(() => {
    chargerMembre().then(setMembre);
  }, []);
  return membre;
}

export function estGestionnaire(membre: Membre | null | undefined): boolean {
  return membre?.role === "admin" || membre?.role === "chef";
}

// Équipe active, pour les listes « assigné à ».
export function useEquipe() {
  const [equipe, setEquipe] = useState<Membre[]>([]);
  useEffect(() => {
    supabase
      .from("membres")
      .select("*")
      .order("nom")
      .then(({ data }) => setEquipe((data as Membre[]) ?? []));
  }, []);
  return equipe;
}
