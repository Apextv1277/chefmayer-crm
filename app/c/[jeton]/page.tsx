import type { Metadata } from "next";
import PagePublique from "@/app/components/PagePublique";
import { lireJeton } from "@/lib/liens";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { formaterDateHeure } from "@/lib/temps";
import Reponse from "./Reponse";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Votre dégustation Chef Mayer", robots: { index: false, follow: false } };

// Page publique du lien « Je confirme / Je dois reporter ». Rien ne change
// à l'ouverture (les antivirus de courriel ouvrent les liens) : le client
// doit cliquer.
export default async function PageDegustation({
  params,
  searchParams,
}: {
  params: Promise<{ jeton: string }>;
  searchParams: Promise<{ action?: string }>;
}) {
  const { jeton } = await params;
  const { action } = await searchParams;
  const id = lireJeton("degustation", jeton);

  const { data: d } = id
    ? await supabaseAdmin()
        .from("degustations")
        .select("debut, statut, adresse, nb_personnes, entreprise:entreprises(nom)")
        .eq("id", id)
        .maybeSingle()
    : { data: null };

  if (!d) {
    return (
      <PagePublique>
        <p>Ce lien n&apos;est plus valide. Pour toute question, répondez simplement au courriel reçu.</p>
      </PagePublique>
    );
  }

  const entreprise = (d.entreprise as unknown as { nom: string } | null)?.nom ?? "votre équipe";
  return (
    <PagePublique>
      <h1 className="mb-1 text-xl font-bold">Votre dégustation</h1>
      <p className="mb-4 text-stone-600">{entreprise}</p>
      <p className="font-semibold">{formaterDateHeure(new Date(d.debut))}</p>
      {d.adresse && <p className="text-stone-600">{d.adresse}</p>}
      {d.nb_personnes && <p className="text-stone-600">Environ {d.nb_personnes} personnes</p>}
      <div className="mt-6">
        <Reponse jeton={jeton} statutInitial={d.statut} actionSuggeree={action === "reporter" ? "reporter" : "confirmer"} />
      </div>
    </PagePublique>
  );
}
