import { describe, expect, it } from "vitest";
import {
  ajouterJours,
  dateLocale,
  depuisChampLocal,
  formaterDateHeure,
  instantLocal,
  lundiDe,
  partiesLocales,
  versChampLocal,
} from "@/lib/temps";

describe("temps (Montréal)", () => {
  it("convertit une heure locale en UTC, heure avancée et normale", () => {
    expect(instantLocal("2026-07-15", "11:30").toISOString()).toBe("2026-07-15T15:30:00.000Z");
    expect(instantLocal("2026-12-15", "11:30").toISOString()).toBe("2026-12-15T16:30:00.000Z");
  });

  it("donne la date locale, pas la date UTC", () => {
    expect(dateLocale(new Date("2026-10-21T02:00:00Z"))).toBe("2026-10-20");
    expect(partiesLocales(new Date("2026-10-21T02:00:00Z")).heure).toBe(22);
  });

  it("aller-retour avec un champ datetime-local", () => {
    const iso = depuisChampLocal("2026-10-20T11:30");
    expect(iso).toBe("2026-10-20T15:30:00.000Z");
    expect(versChampLocal(iso)).toBe("2026-10-20T11:30");
    expect(depuisChampLocal("")).toBeNull();
  });

  it("calcule les jours et les lundis", () => {
    expect(ajouterJours("2026-10-31", 1)).toBe("2026-11-01");
    expect(lundiDe("2026-10-18")).toBe("2026-10-12"); // dimanche
    expect(lundiDe("2026-10-12")).toBe("2026-10-12");
    expect(lundiDe("2026-10-14")).toBe("2026-10-12");
  });

  it("formate en français", () => {
    expect(formaterDateHeure(new Date("2026-10-20T15:30:00Z"))).toBe("mardi 20 octobre à 11 h 30");
    expect(formaterDateHeure(new Date("2026-10-20T13:00:00Z"))).toBe("mardi 20 octobre à 9 h");
  });
});
