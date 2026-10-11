import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

describe("code de rabais suggéré", async () => {
  const { suggererCode } = await import("@/lib/actionsDegustation");
  it("garde les lettres utiles du nom", () => {
    expect(suggererCode("Usine Laurentides inc.")).toBe("USINELAURENT");
    expect(suggererCode("Garage Bélanger")).toBe("GARAGEBELANG");
    expect(suggererCode("3M")).toBe("3M");
  });
});
