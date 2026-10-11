// Heure de Montréal : toutes les règles (rappel la veille, fenêtres
// d'envoi, semaines de volume) se calculent en heure locale, peu importe
// le fuseau du serveur.

export const FUSEAU = "America/Montreal";

export type PartiesLocales = {
  annee: number;
  mois: number;
  jour: number;
  heure: number;
  minute: number;
  // 0 = dimanche … 6 = samedi
  jourSemaine: number;
};

const JOURS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const formateur = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSEAU,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  weekday: "short",
});

export function partiesLocales(date: Date): PartiesLocales {
  const p = Object.fromEntries(formateur.formatToParts(date).map((x) => [x.type, x.value]));
  return {
    annee: Number(p.year),
    mois: Number(p.month),
    jour: Number(p.day),
    heure: Number(p.hour),
    minute: Number(p.minute),
    jourSemaine: JOURS[p.weekday] ?? 0,
  };
}

function deuxChiffres(n: number) {
  return String(n).padStart(2, "0");
}

// Date locale au format YYYY-MM-DD.
export function dateLocale(date: Date): string {
  const p = partiesLocales(date);
  return `${p.annee}-${deuxChiffres(p.mois)}-${deuxChiffres(p.jour)}`;
}

export function ajouterJours(dateIso: string, jours: number): string {
  const [a, m, j] = dateIso.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1, j + jours));
  return d.toISOString().slice(0, 10);
}

// Lundi de la semaine (ISO) d'une date YYYY-MM-DD.
export function lundiDe(dateIso: string): string {
  const [a, m, j] = dateIso.split("-").map(Number);
  const jour = new Date(Date.UTC(a, m - 1, j)).getUTCDay();
  return ajouterJours(dateIso, jour === 0 ? -6 : 1 - jour);
}

function decalageMinutes(date: Date): number {
  const p = partiesLocales(date);
  const commeUtc = Date.UTC(p.annee, p.mois - 1, p.jour, p.heure, p.minute);
  const arrondi = Math.floor(date.getTime() / 60000) * 60000;
  return (commeUtc - arrondi) / 60000;
}

// « 2026-10-20 » + « 11:30 » à Montréal → instant UTC (gère l'heure avancée).
export function instantLocal(dateIso: string, heure: string): Date {
  const [a, m, j] = dateIso.split("-").map(Number);
  const [h, mi] = heure.split(":").map(Number);
  const naif = Date.UTC(a, m - 1, j, h, mi);
  const essai = new Date(naif - decalageMinutes(new Date(naif)) * 60000);
  return new Date(naif - decalageMinutes(essai) * 60000);
}

// Valeur d'un <input type="datetime-local"> (heure de Montréal) → ISO UTC.
export function depuisChampLocal(valeur: string): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(valeur);
  return m ? instantLocal(m[1], m[2]).toISOString() : null;
}

// ISO UTC → valeur pour <input type="datetime-local"> en heure de Montréal.
export function versChampLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const p = partiesLocales(new Date(iso));
  return `${p.annee}-${deuxChiffres(p.mois)}-${deuxChiffres(p.jour)}T${deuxChiffres(p.heure)}:${deuxChiffres(p.minute)}`;
}

const formateurDate = new Intl.DateTimeFormat("fr-CA", {
  timeZone: FUSEAU,
  weekday: "long",
  day: "numeric",
  month: "long",
});

// « mardi 20 octobre »
export function formaterJour(date: Date): string {
  return formateurDate.format(date);
}

// « 11 h 30 », « 9 h »
export function formaterHeure(date: Date): string {
  const p = partiesLocales(date);
  return p.minute ? `${p.heure} h ${deuxChiffres(p.minute)}` : `${p.heure} h`;
}

// « mardi 20 octobre à 11 h 30 »
export function formaterDateHeure(date: Date): string {
  return `${formaterJour(date)} à ${formaterHeure(date)}`;
}
