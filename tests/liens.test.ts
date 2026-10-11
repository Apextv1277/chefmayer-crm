import { describe, expect, it } from "vitest";
import { jeton, lienDegustation, lireJeton, sitePublic } from "@/lib/liens";

const CLE = "secret-de-test";
const ID = "3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90";

describe("liens signés", () => {
  it("relit un jeton valide", () => {
    expect(lireJeton("degustation", jeton("degustation", ID, CLE), CLE)).toBe(ID);
  });

  it("refuse un jeton d'un autre usage, modifié ou mal formé", () => {
    expect(lireJeton("desabonnement", jeton("degustation", ID, CLE), CLE)).toBeNull();
    const t = jeton("degustation", ID, CLE);
    expect(lireJeton("degustation", t.slice(0, -1) + (t.endsWith("A") ? "B" : "A"), CLE)).toBeNull();
    expect(lireJeton("degustation", "n'importe quoi", CLE)).toBeNull();
    expect(lireJeton("degustation", null, CLE)).toBeNull();
  });

  it("construit l'adresse publique", () => {
    expect(sitePublic({ URL: "https://crm.netlify.app/" })).toBe("https://crm.netlify.app");
    expect(sitePublic({ URL: "https://x.netlify.app", URL_SITE_PUBLIC: "https://crm.chefmayer.ca" })).toBe(
      "https://crm.chefmayer.ca"
    );
    expect(lienDegustation(ID, "https://crm.chefmayer.ca", CLE)).toMatch(/^https:\/\/crm\.chefmayer\.ca\/c\//);
  });
});
