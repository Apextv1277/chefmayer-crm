import { generateKeyPairSync, sign } from "crypto";
import { describe, expect, it } from "vitest";
import { intentionTexto, lireTextoRecu, signatureTelnyxValide } from "@/lib/telnyx";

describe("signature Telnyx", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const cleBrute = publicKey.export({ format: "der", type: "spki" }).subarray(12).toString("base64");
  const corps = JSON.stringify({ data: { event_type: "message.received" } });
  const maintenant = 1_800_000_000_000;
  const horodatage = String(maintenant / 1000);
  const signature = sign(null, Buffer.from(`${horodatage}|${corps}`), privateKey).toString("base64");

  it("accepte une signature valide", () => {
    expect(signatureTelnyxValide(corps, signature, horodatage, cleBrute, maintenant)).toBe(true);
  });

  it("refuse un corps modifié, une vieille requête ou une clé absente", () => {
    expect(signatureTelnyxValide(corps + " ", signature, horodatage, cleBrute, maintenant)).toBe(false);
    expect(signatureTelnyxValide(corps, signature, horodatage, cleBrute, maintenant + 10 * 60 * 1000)).toBe(false);
    expect(signatureTelnyxValide(corps, signature, horodatage, undefined, maintenant)).toBe(false);
    expect(signatureTelnyxValide(corps, null, horodatage, cleBrute, maintenant)).toBe(false);
  });
});

describe("textos reçus", () => {
  it("reconnaît les intentions", () => {
    expect(intentionTexto("STOP")).toBe("stop");
    expect(intentionTexto(" Arrêt ")).toBe("stop");
    expect(intentionTexto("Désabonner")).toBe("stop");
    expect(intentionTexto("Oui!")).toBe("oui");
    expect(intentionTexto("Je confirme")).toBe("oui");
    expect(intentionTexto("START")).toBe("reprise");
    expect(intentionTexto("On ne peut pas arrêter de manger vos repas")).toBe("autre");
    expect(intentionTexto("")).toBe("autre");
  });

  it("lit un événement message.received", () => {
    expect(
      lireTextoRecu({ data: { event_type: "message.received", payload: { from: { phone_number: "+14505551234" }, text: "Oui" } } })
    ).toEqual({ de: "+14505551234", texte: "Oui" });
    expect(lireTextoRecu({ data: { event_type: "message.sent" } })).toBeNull();
    expect(lireTextoRecu(null)).toBeNull();
  });
});
