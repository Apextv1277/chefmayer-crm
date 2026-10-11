import type { NextRequest } from "next/server";
import { mettreAJourSession } from "./lib/supabaseProxy";

export async function proxy(request: NextRequest) {
  return mettreAJourSession(request);
}

export const config = {
  matcher: [
    // Publiques (chacune a sa propre sécurité) :
    //   /c/<jeton>, /api/degustations/reponse : le client confirme ou
    //     reporte sa dégustation (lien signé, lib/liens.ts)
    //   /d/<jeton>, /api/desabonnement : désabonnement (lien signé)
    //   /api/telnyx/entrant : textos reçus (signature Telnyx)
    "/((?!_next/static|_next/image|favicon.ico|c/|d/|api/degustations/reponse|api/desabonnement|api/telnyx/entrant|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
