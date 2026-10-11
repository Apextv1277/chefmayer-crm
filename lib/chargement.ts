// Supabase plafonne chaque requête à 1000 lignes : on pagine jusqu'au bout
// pour ne jamais perdre de données (doublons à l'import, relevés).
export async function chargerToutesLesLignes<T>(
  requete: (debut: number, fin: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<{ data: T[]; error: { message: string } | null }> {
  const toutes: T[] = [];
  const taille = 1000;
  for (let debut = 0; ; debut += taille) {
    const { data, error } = await requete(debut, debut + taille - 1);
    if (error) return { data: toutes, error };
    toutes.push(...(data ?? []));
    if (!data || data.length < taille) break;
  }
  return { data: toutes, error: null };
}
