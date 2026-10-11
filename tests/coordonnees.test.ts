import { describe, expect, it } from "vitest";
import { formaterTelephone, normaliserCourriel, normaliserTelephone } from "@/lib/coordonnees";

describe("coordonnées", () => {
  it("normalise les numéros québécois", () => {
    expect(normaliserTelephone("(450) 555-1234").e164).toBe("+14505551234");
    expect(normaliserTelephone("1 450 555 1234 poste 22")).toEqual({
      e164: "+14505551234",
      extension: "22",
      valide: true,
    });
    expect(normaliserTelephone("555-1234").valide).toBe(false);
    expect(formaterTelephone("+14505551234")).toBe("(450) 555-1234");
  });

  it("normalise les courriels", () => {
    expect(normaliserCourriel(" RH@Entreprise.CA ")).toBe("rh@entreprise.ca");
    expect(normaliserCourriel("pas un courriel")).toBeNull();
    expect(normaliserCourriel(null)).toBeNull();
  });
});
