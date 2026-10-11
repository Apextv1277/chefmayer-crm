import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "./supabaseAdmin";

// Garde du CRM : seuls les membres actifs de l'équipe passent. Les pages
// publiques (liens signés, webhooks) sont exclues dans proxy.ts.
export async function mettreAJourSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cleAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !cleAnon) {
    return NextResponse.json({ error: "Les variables Supabase sont manquantes." }, { status: 500 });
  }

  const supabase = createServerClient(url, cleAnon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(aEnregistrer) {
        aEnregistrer.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        aEnregistrer.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const courriel = user?.email?.trim().toLowerCase() ?? "";

  let autorise = false;
  if (courriel) {
    const { data } = await supabaseAdmin()
      .from("membres")
      .select("actif")
      .eq("email", courriel)
      .eq("actif", true)
      .maybeSingle();
    autorise = Boolean(data);
  }

  const chemin = request.nextUrl.pathname;
  const pageConnexion = chemin === "/connexion";

  function avecCookies(destination: NextResponse) {
    response.cookies.getAll().forEach((c) => destination.cookies.set(c));
    return destination;
  }

  if (!autorise) {
    if (chemin.startsWith("/api/")) return avecCookies(NextResponse.json({ error: "Non autorisé." }, { status: 401 }));
    if (pageConnexion) return response;
    const connexion = request.nextUrl.clone();
    connexion.pathname = "/connexion";
    connexion.search = "";
    return avecCookies(NextResponse.redirect(connexion));
  }

  if (pageConnexion || chemin === "/") {
    const accueil = request.nextUrl.clone();
    accueil.pathname = "/aujourdhui";
    accueil.search = "";
    return avecCookies(NextResponse.redirect(accueil));
  }

  return response;
}
