import { describe, expect, it } from "vitest";
import {
  palierRabais,
  prixApresRabais,
  releveDuMois,
  repasParTranche,
  royauteSemaine,
} from "@/lib/royaute";

describe("royauté par tranches", () => {
  it("répartit les repas dans les tranches", () => {
    expect(repasParTranche(20)).toEqual([20, 0, 0]);
    expect(repasParTranche(50)).toEqual([24, 26, 0]);
    expect(repasParTranche(100)).toEqual([24, 50, 26]);
    expect(repasParTranche(0)).toEqual([0, 0, 0]);
  });

  it("donne les montants de la proposition", () => {
    expect(royauteSemaine(20, 20 * 11.4)).toBe(22.8);
    expect(royauteSemaine(50, 50 * 10.8)).toBe(48.38);
    expect(royauteSemaine(100, 100 * 10.2)).toBe(83.84);
  });

  it("ne baisse jamais quand le volume monte (même prix)", () => {
    let precedent = 0;
    for (let repas = 1; repas <= 200; repas++) {
      const r = royauteSemaine(repas, repas * 10.8);
      expect(r).toBeGreaterThanOrEqual(precedent);
      precedent = r;
    }
  });

  it("vaut zéro sans ventes", () => {
    expect(royauteSemaine(0, 0)).toBe(0);
    expect(royauteSemaine(10, 0)).toBe(0);
  });
});

describe("paliers de rabais", () => {
  it("choisit le bon palier", () => {
    expect(palierRabais(10).rabais).toBe(0.05);
    expect(palierRabais(25).rabais).toBe(0.1);
    expect(palierRabais(74).rabais).toBe(0.1);
    expect(palierRabais(75).rabais).toBe(0.15);
    expect(prixApresRabais(75)).toBe(10.2);
  });
});

describe("relevé du mois", () => {
  it("additionne les semaines dont le lundi tombe dans le mois", () => {
    const releve = releveDuMois(
      [
        { entreprise_id: "a", semaine: "2026-11-02", repas: 50, ventes_nettes: 540 },
        { entreprise_id: "a", semaine: "2026-11-09", repas: 50, ventes_nettes: 540 },
        { entreprise_id: "a", semaine: "2026-10-26", repas: 50, ventes_nettes: 540 },
        { entreprise_id: "b", semaine: "2026-11-02", repas: 20, ventes_nettes: 228 },
      ],
      "2026-11"
    );
    expect(releve).toEqual([
      { entreprise_id: "a", semaines: 2, repas: 100, ventes_nettes: 1080, royaute: 96.76 },
      { entreprise_id: "b", semaines: 1, repas: 20, ventes_nettes: 228, royaute: 22.8 },
    ]);
  });
});
