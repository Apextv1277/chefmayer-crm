"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { estGestionnaire, oublierMembre, useMembre } from "@/lib/membre";
import { supabase } from "@/lib/supabase";

const LIENS = [
  { href: "/aujourdhui", label: "Aujourd'hui", pour: "tous" },
  { href: "/entreprises", label: "Entreprises", pour: "tous" },
  { href: "/degustations", label: "Dégustations", pour: "tous" },
  { href: "/comptes", label: "Comptes et royauté", pour: "gestion" },
  { href: "/messages", label: "Textos et courriels", pour: "gestion" },
  { href: "/scripts", label: "Scripts", pour: "tous" },
  { href: "/equipe", label: "Équipe", pour: "admin" },
] as const;

export default function Sidebar() {
  const chemin = usePathname();
  const router = useRouter();
  const membre = useMembre();
  const [ouvert, setOuvert] = useState(false);

  const liens = LIENS.filter(
    (l) => l.pour === "tous" || (l.pour === "gestion" && estGestionnaire(membre)) || (l.pour === "admin" && membre?.role === "admin")
  );

  async function deconnexion() {
    await supabase.auth.signOut();
    oublierMembre();
    router.replace("/connexion");
  }

  return (
    <>
      <div className="flex items-center justify-between bg-encre px-4 py-3 md:hidden">
        <Logo />
        <button className="text-sm font-semibold text-white" onClick={() => setOuvert(!ouvert)}>
          {ouvert ? "Fermer" : "Menu"}
        </button>
      </div>
      <aside
        className={`${ouvert ? "block" : "hidden"} w-full bg-encre text-white md:sticky md:top-0 md:block md:h-screen md:w-60 md:shrink-0`}
      >
        <div className="hidden px-5 py-6 md:block">
          <Logo />
          <p className="mt-1 text-xs text-stone-400">Programme Repas Entreprises</p>
        </div>
        <nav className="flex flex-col gap-1 px-3 pb-4">
          {liens.map((l) => {
            const actif = chemin === l.href || chemin.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOuvert(false)}
                className={`rounded-md px-3 py-2 text-sm font-medium ${actif ? "bg-rouge text-white" : "text-stone-300 hover:bg-white/10 hover:text-white"}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 px-5 py-4 text-sm md:absolute md:bottom-0 md:w-60">
          <p className="font-semibold">{membre?.nom ?? "…"}</p>
          <p className="text-xs text-stone-400">
            {membre?.role === "admin" ? "Administrateur" : membre?.role === "chef" ? "Chef" : membre ? "Représentant" : ""}
          </p>
          <button onClick={deconnexion} className="mt-2 text-xs text-stone-400 underline hover:text-white">
            Se déconnecter
          </button>
        </div>
      </aside>
    </>
  );
}

function Logo() {
  return (
    <span className="text-lg font-extrabold tracking-widest text-white">
      CHEF <span className="text-rouge">MAYER</span>
    </span>
  );
}
