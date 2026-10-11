import { describe, expect, it } from "vitest";
import { envoisDus, type ContextePlan, type DegustationPlan } from "@/lib/automatisations/planifier";

const JONATHAN = { id: "m-chef", nom: "Jonathan", telephone: "450-555-0001" };
const REP = { id: "m-rep", nom: "Julie", telephone: "450-555-0002" };

function degustation(champs: Partial<DegustationPlan> = {}): DegustationPlan {
  return {
    id: "3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90",
    entreprise_id: "e1",
    entreprise_nom: "Usine Laurentides",
    code_rabais: "USINE",
    // Mardi 20 octobre 2026, 11 h 30 à Montréal
    debut: "2026-10-20T15:30:00.000Z",
    statut: "reservee",
    adresse: "12 rue Principale, St-Jérôme",
    nb_personnes: 15,
    // Réservée le mercredi 14 octobre
    created_at: "2026-10-14T14:00:00.000Z",
    contact: {
      id: "c1",
      prenom: "Marie",
      nom: "Tremblay",
      telephone: "(450) 555-1234",
      courriel: "marie@usine.ca",
      sms_desabonne: false,
      courriel_desabonne: false,
    },
    reserve_par: REP,
    ...champs,
  };
}

function contexte(maintenantIso: string): ContextePlan {
  return {
    maintenant: new Date(maintenantIso),
    site: "https://crm.test",
    cleLiens: "cle",
    chefs: [JONATHAN],
    signature: { nomChef: "Jonathan", telephone: "+14505550001" },
    lienCommande: "https://chefmayer.ca/collections/meal-prep",
  };
}

function cles(envois: ReturnType<typeof envoisDus>) {
  return envois.map((e) => e.cle.replace(/^deg:[^:]+:/, "")).sort();
}

describe("envois dus d'une dégustation", () => {
  it("confirme au client et alerte le chef dès la réservation", () => {
    const envois = envoisDus(degustation(), contexte("2026-10-14T14:05:00.000Z"));
    expect(cles(envois)).toEqual([
      "confirmation:courriel",
      "confirmation:sms",
      "nouvelle:membre:m-chef",
    ]);
    const sms = envois.find((e) => e.cle.endsWith("confirmation:sms"))!;
    expect(sms.destinataire).toBe("+14505551234");
    expect(sms.texte).toContain("mardi 20 octobre à 11 h 30");
    expect(sms.texte).toContain("https://crm.test/c/");
    const courriel = envois.find((e) => e.canal === "courriel")!;
    expect(courriel.html).toContain("Se désabonner");
    expect(courriel.html).toContain("action=reporter");
  });

  it("n'alerte pas le chef d'une dégustation qu'il a réservée lui-même", () => {
    const envois = envoisDus(degustation({ reserve_par: JONATHAN }), contexte("2026-10-14T14:05:00.000Z"));
    expect(cles(envois)).not.toContain("nouvelle:membre:m-chef");
  });

  it("attend 8 h pour texter un client la nuit, mais envoie le courriel", () => {
    // 23 h à Montréal
    const envois = envoisDus(degustation(), contexte("2026-10-15T03:00:00.000Z"));
    expect(cles(envois)).toEqual(["confirmation:courriel"]);
  });

  it("rappelle la veille, et alerte l'équipe à 16 h si ce n'est pas confirmé", () => {
    // Lundi 19 octobre, 11 h
    expect(cles(envoisDus(degustation(), contexte("2026-10-19T15:00:00.000Z")))).toEqual([
      "confirmation:courriel",
      "confirmation:sms",
      "nouvelle:membre:m-chef",
      "rappel_veille:courriel",
      "rappel_veille:sms",
    ]);
    // Lundi 19 octobre, 16 h 30
    const apresMidi = cles(envoisDus(degustation(), contexte("2026-10-19T20:30:00.000Z")));
    expect(apresMidi).toContain("non_confirmee:membre:m-chef");
    expect(apresMidi).toContain("non_confirmee:membre:m-rep");
    // Confirmée : pas d'alerte, mais la personne qui a réservé le sait.
    const confirmee = cles(envoisDus(degustation({ statut: "confirmee" }), contexte("2026-10-19T20:30:00.000Z")));
    expect(confirmee).not.toContain("non_confirmee:membre:m-chef");
    expect(confirmee).toContain("confirmee:membre:m-rep");
  });

  it("ne fait pas de rappel la veille pour une réservation de dernière minute", () => {
    const envois = envoisDus(
      degustation({ created_at: "2026-10-19T14:00:00.000Z" }),
      contexte("2026-10-19T15:00:00.000Z")
    );
    expect(cles(envois)).not.toContain("rappel_veille:sms");
  });

  it("texte 2 h avant, seulement par texto", () => {
    // 10 h, dégustation à 11 h 30
    const envois = envoisDus(degustation({ statut: "confirmee" }), contexte("2026-10-20T14:00:00.000Z"));
    expect(cles(envois)).toContain("rappel_avant:sms");
    expect(cles(envois)).not.toContain("rappel_avant:courriel");
  });

  it("remercie le lendemain d'une dégustation faite, avec le code", () => {
    const envois = envoisDus(degustation({ statut: "faite" }), contexte("2026-10-21T14:00:00.000Z"));
    expect(cles(envois)).toEqual(["remerciement:courriel", "remerciement:sms"]);
    expect(envois[0].texte).toContain("USINE");
    // Pas le jour même, ni une semaine plus tard
    expect(envoisDus(degustation({ statut: "faite" }), contexte("2026-10-20T18:00:00.000Z"))).toEqual([]);
    expect(envoisDus(degustation({ statut: "faite" }), contexte("2026-10-28T14:00:00.000Z"))).toEqual([]);
  });

  it("arrête les rappels d'une dégustation à reporter et alerte l'équipe", () => {
    const envois = envoisDus(degustation({ statut: "a_reporter" }), contexte("2026-10-19T15:00:00.000Z"));
    expect(cles(envois)).toEqual(["report:membre:m-chef", "report:membre:m-rep"]);
    expect(envois[0].texte).toContain("Marie Tremblay au (450) 555-1234");
  });

  it("n'envoie rien pour une dégustation annulée", () => {
    expect(envoisDus(degustation({ statut: "annulee" }), contexte("2026-10-19T15:00:00.000Z"))).toEqual([]);
  });

  it("respecte les désabonnements", () => {
    const d = degustation();
    d.contact = { ...d.contact!, sms_desabonne: true, courriel_desabonne: true };
    expect(cles(envoisDus(d, contexte("2026-10-14T14:05:00.000Z")))).toEqual(["nouvelle:membre:m-chef"]);
  });

  it("ne texte pas deux fois le même numéro d'un membre", () => {
    const envois = envoisDus(
      degustation({ reserve_par: { ...REP, telephone: JONATHAN.telephone } }),
      contexte("2026-10-19T20:30:00.000Z")
    );
    expect(cles(envois).filter((c) => c.startsWith("non_confirmee"))).toEqual(["non_confirmee:membre:m-chef"]);
  });
});
