import { describe, expect, it } from "vitest";
import { depotMemoire, executerEnvois, type Expediteurs } from "@/lib/automatisations/executer";
import type { Envoi } from "@/lib/automatisations/planifier";
import { envoyerSms } from "@/lib/envoi/sms";
import { envoyerCourriel } from "@/lib/envoi/courriel";

function envoi(cle: string, canal: "sms" | "courriel" = "sms"): Envoi {
  return {
    cle,
    canal,
    type: "confirmation",
    destinataire: canal === "sms" ? "+14505551234" : "a@b.ca",
    sujet: canal === "sms" ? null : "Sujet",
    texte: "Bonjour",
    html: null,
    entreprise_id: "e1",
    degustation_id: "d1",
    contact_id: "c1",
  };
}

describe("exécution des envois", () => {
  it("n'envoie jamais deux fois la même clé", async () => {
    const { depot } = depotMemoire();
    const envoyes: string[] = [];
    const exp: Expediteurs = {
      sms: async (to) => (envoyes.push(to), { envoye: true, mode: "reel" }),
      courriel: async (to) => (envoyes.push(to), { envoye: true, mode: "reel" }),
    };
    const a = await executerEnvois([envoi("k1"), envoi("k2", "courriel")], depot, exp);
    const b = await executerEnvois([envoi("k1"), envoi("k2", "courriel")], depot, exp);
    expect(a).toEqual({ envoyes: 2, tests: 0, echecs: 0, dejaFaits: 0 });
    expect(b).toEqual({ envoyes: 0, tests: 0, echecs: 0, dejaFaits: 2 });
    expect(envoyes).toEqual(["+14505551234", "a@b.ca"]);
  });

  it("retente un échec, au plus 3 fois", async () => {
    const { depot, lignes } = depotMemoire();
    let appels = 0;
    const exp: Expediteurs = {
      sms: async () => (appels++, { envoye: false, raison: "panne" }),
      courriel: async () => ({ envoye: true, mode: "reel" }),
    };
    for (let i = 0; i < 5; i++) await executerEnvois([envoi("k1")], depot, exp);
    expect(appels).toBe(3);
    expect(lignes.get("k1")).toMatchObject({ statut: "echec", tentatives: 3, erreur: "panne" });
  });

  it("compte une exception comme un échec", async () => {
    const { depot } = depotMemoire();
    const exp: Expediteurs = {
      sms: async () => {
        throw new Error("réseau");
      },
      courriel: async () => ({ envoye: true, mode: "test" }),
    };
    expect(await executerEnvois([envoi("k1"), envoi("k2", "courriel")], depot, exp)).toEqual({
      envoyes: 0,
      tests: 1,
      echecs: 1,
      dejaFaits: 0,
    });
  });
});

describe("expéditeurs", () => {
  const appelInterdit = (async () => {
    throw new Error("aucun appel réseau en mode test");
  }) as unknown as typeof fetch;

  it("restent en mode test sans ENVOIS_REELS=1", async () => {
    expect(await envoyerSms("450-555-1234", "x", {}, appelInterdit)).toEqual({ envoye: true, mode: "test" });
    expect(await envoyerCourriel("a@b.ca", { sujet: "s", texte: "t", html: null }, {}, appelInterdit)).toEqual({
      envoye: true,
      mode: "test",
    });
  });

  it("refusent une coordonnée invalide", async () => {
    expect((await envoyerSms("123", "x", {}, appelInterdit)).envoye).toBe(false);
    expect((await envoyerCourriel("pas-valide", { sujet: "s", texte: "t", html: null }, {}, appelInterdit)).envoye).toBe(false);
  });

  it("appellent Telnyx en mode réel", async () => {
    let corps: unknown = null;
    const faux = (async (_url: string, init: RequestInit) => {
      corps = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ data: { id: "msg_1" } }), { status: 200 });
    }) as unknown as typeof fetch;
    const env = { ENVOIS_REELS: "1", TELNYX_API_KEY: "k", TELNYX_NUMERO: "450 555 0000" };
    expect(await envoyerSms("(450) 555-1234", "Bonjour", env, faux)).toEqual({
      envoye: true,
      mode: "reel",
      idExterne: "msg_1",
    });
    expect(corps).toEqual({ from: "+14505550000", to: "+14505551234", text: "Bonjour" });
  });

  it("gardent les courriels en mode test sans fournisseur, même en mode réel", async () => {
    expect(await envoyerCourriel("a@b.ca", { sujet: "s", texte: "t", html: null }, { ENVOIS_REELS: "1" }, appelInterdit)).toEqual({
      envoye: true,
      mode: "test",
    });
  });

  it("signalent un texto impossible sans Telnyx en mode réel", async () => {
    expect(await envoyerSms("450-555-1234", "x", { ENVOIS_REELS: "1" }, appelInterdit)).toMatchObject({ envoye: false });
  });
});
