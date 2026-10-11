import type { Metadata } from "next";
import PagePublique from "@/app/components/PagePublique";
import { lireJeton } from "@/lib/liens";
import Desabonnement from "./Desabonnement";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Désabonnement Chef Mayer", robots: { index: false, follow: false } };

export default async function PageDesabonnement({ params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  return (
    <PagePublique>
      {lireJeton("desabonnement", jeton) ? (
        <Desabonnement jeton={jeton} />
      ) : (
        <p>Ce lien n&apos;est pas valide. Répondez simplement « désabonner » au courriel reçu.</p>
      )}
    </PagePublique>
  );
}
