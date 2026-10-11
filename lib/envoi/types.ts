export type ResultatEnvoi =
  | { envoye: true; mode: "reel" | "test"; idExterne?: string }
  | { envoye: false; raison: string };

export type Env = Record<string, string | undefined>;

// Les envois réels sont désactivés tant que ENVOIS_REELS n'est pas « 1 » :
// en mode test, chaque message est inscrit au journal sans partir.
export function envoisReels(env: Env = process.env): boolean {
  return env.ENVOIS_REELS?.trim() === "1";
}
