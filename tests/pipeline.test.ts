import { describe, expect, it } from "vitest";
import { appelable, changementApresAppel, estStatut } from "@/lib/pipeline";

describe("pipeline", () => {
  it("fait avancer un lead au téléphone", () => {
    expect(changementApresAppel("À appeler", "pas_joint")).toEqual({ statut: "Pas joint" });
    expect(changementApresAppel("Pas joint", "rappel", "2026-11-03T14:00:00.000Z")).toEqual({
      statut: "Rappel prévu",
      date_rappel: "2026-11-03T14:00:00.000Z",
    });
    expect(changementApresAppel("Rappel prévu", "non_interesse")).toEqual({
      statut: "Non intéressé",
      date_rappel: null,
    });
  });

  it("ne fait jamais reculer une dégustation ou un client", () => {
    expect(changementApresAppel("Dégustation réservée", "pas_joint")).toEqual({});
    expect(changementApresAppel("Client actif", "non_interesse")).toEqual({});
    expect(changementApresAppel("Client actif", "rappel", "x")).toEqual({ date_rappel: "x" });
  });

  it("respecte une demande de ne plus appeler", () => {
    expect(changementApresAppel("À appeler", "ne_plus_appeler")).toEqual({
      ne_plus_appeler: true,
      date_rappel: null,
      statut: "Non intéressé",
    });
    expect(changementApresAppel("Client actif", "ne_plus_appeler")).toEqual({
      ne_plus_appeler: true,
      date_rappel: null,
    });
    expect(appelable({ statut: "À appeler", ne_plus_appeler: true })).toBe(false);
    expect(appelable({ statut: "Pas joint", ne_plus_appeler: false })).toBe(true);
    expect(appelable({ statut: "Client actif", ne_plus_appeler: false })).toBe(false);
  });

  it("valide les statuts", () => {
    expect(estStatut("Client actif")).toBe(true);
    expect(estStatut("Mandat signé")).toBe(false);
  });
});
