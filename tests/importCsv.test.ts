import { describe, expect, it } from "vitest";
import { analyserCsv, clesDoublon, lireCsv } from "@/lib/importCsv";

describe("lecture CSV", () => {
  it("gère les guillemets, les virgules et les points-virgules", () => {
    expect(lireCsv('a,b\n"x, y","il dit ""oui"""\n')).toEqual([
      ["a", "b"],
      ["x, y", 'il dit "oui"'],
    ]);
    expect(lireCsv("a;b\r\n1;2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("analyse d'une liste", () => {
  it("lit un export Apollo", () => {
    const csv = [
      "First Name,Last Name,Title,Company,Email,Work Direct Phone,Corporate Phone,# Employees,Industry,Website,City,State",
      "Marie,Tremblay,Directrice RH,Usine Laurentides,Marie@Usine.ca,450-555-1234,450 555 0000,51-200,Manufacturing,usine.ca,Saint-Jérôme,Quebec",
      ",,,,,,,,,,,",
      "Paul,,,,,,,,,,,",
    ].join("\n");
    const r = analyserCsv(csv);
    expect(r.ignorees).toBe(1);
    expect(r.lignes).toEqual([
      {
        entreprise: {
          nom: "Usine Laurentides",
          secteur: "Manufacturing",
          ville: "Saint-Jérôme",
          region: "Quebec",
          adresse: null,
          nb_employes: 51,
          telephone: "+14505550000",
          courriel: null,
          site_web: "usine.ca",
          notes: null,
        },
        contact: {
          prenom: "Marie",
          nom: "Tremblay",
          poste: "Directrice RH",
          telephone: "+14505551234",
          courriel: "marie@usine.ca",
        },
      },
    ]);
  });

  it("lit une liste maison en français", () => {
    const r = analyserCsv("Nom;Ville;Téléphone;Contact;Courriel\nGarage Bélanger;Mirabel;(450) 555-9999;Luc Bélanger;luc@garage.ca");
    expect(r.lignes[0].entreprise).toMatchObject({ nom: "Garage Bélanger", ville: "Mirabel", telephone: "+14505559999" });
    expect(r.lignes[0].contact).toEqual({
      prenom: "Luc",
      nom: "Bélanger",
      poste: null,
      telephone: "+14505559999",
      courriel: "luc@garage.ca",
    });
  });

  it("donne des clés de doublon stables", () => {
    expect(clesDoublon({ nom: "Usine Laurentides inc.", ville: "St-Jérôme", telephone: "450.555.0000" })).toEqual([
      "nom:usine laurentides inc|st jerome",
      "tel:+14505550000",
    ]);
  });
});
