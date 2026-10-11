import { EnTete } from "@/app/components/ui";

// Scripts d'offre de dégustation (version complète dans la proposition).
const ETAPES = [
  ["Ouverture", "« Bonjour [prénom], c'est Jonathan, le chef de Chef Mayer à St-Jérôme. Je vous prends 30 secondes, ça vous va? »"],
  ["L'offre", "« J'aimerais venir faire goûter mes repas à votre équipe, gratuitement, un midi. J'apporte une boîte de dégustation pour une quinzaine de personnes et je vous laisse le dîner. »"],
  ["La raison", "« On a un programme pour les entreprises de la région : vos employés ont des repas santé livrés au bureau chaque semaine, à prix réduit. Pour vous, ça ne coûte rien. C'est un avantage employé de plus, sans facture. »"],
  ["La question", "« Vous avez combien de personnes sur place le midi, à peu près? »"],
  ["La réservation", "« Parfait. Mardi ou jeudi prochain, qu'est-ce qui vous arrange le mieux pour la dégustation? »"],
];

const OBJECTIONS = [
  ["« On n'a pas de budget. »", "« La dégustation est gratuite, et le programme aussi pour vous. Ce sont les employés qui commandent, avec un rabais. »"],
  ["« Envoyez-moi un courriel. »", "« Avec plaisir. Mais un repas parle plus qu'un courriel. Je peux vous réserver mardi midi, et je vous envoie la confirmation par courriel. »"],
  ["« Les employés ne seront pas intéressés. »", "« C'est justement pour ça qu'on commence par une dégustation. Ils goûtent, et vous voyez leur réaction avant de décider quoi que ce soit. »"],
  ["« On a déjà une cafétéria. »", "« Parfait. Beaucoup d'employés s'en servent pour les soupers de la semaine à la maison. »"],
  ["« Ce n'est pas le bon moment. »", "« Aucun problème. Quel mois serait mieux? Je vous rappelle à ce moment-là. » → bouton Rappeler plus tard."],
  ["« Ne rappelez plus. »", "« Bien compris, je vous retire de ma liste. Bonne journée! » → bouton Ne plus appeler, tout de suite."],
];

export default function Scripts() {
  return (
    <div className="mx-auto max-w-3xl">
      <EnTete titre="Scripts" sousTitre="Un seul but par appel : réserver une dégustation gratuite" />

      <section className="carte mb-6">
        <h2 className="mb-3 font-bold">Script d&apos;appel (environ 60 secondes)</h2>
        <ol className="grid gap-3">
          {ETAPES.map(([titre, texte], i) => (
            <li key={titre} className="text-sm">
              <p className="font-semibold">
                {i + 1}. {titre}
              </p>
              <p className="text-stone-700">{texte}</p>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-stone-500">Toujours deux journées au choix, jamais « êtes-vous intéressé? ». Confirmer les allergies et l&apos;heure.</p>
      </section>

      <section className="carte mb-6">
        <h2 className="mb-3 font-bold">Réponses aux objections</h2>
        <dl className="grid gap-3 text-sm">
          {OBJECTIONS.map(([objection, reponse]) => (
            <div key={objection}>
              <dt className="font-semibold">{objection}</dt>
              <dd className="text-stone-700">{reponse}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="carte mb-6 text-sm">
        <h2 className="mb-2 font-bold">Message vocal (moins de 20 secondes)</h2>
        <p className="text-stone-700">
          « Bonjour [prénom], Jonathan de Chef Mayer à St-Jérôme. J&apos;aimerais offrir une dégustation gratuite de mes repas à votre équipe,
          un midi. Je vous rappelle jeudi, ou joignez-moi au [numéro]. Merci! »
        </p>
        <p className="mt-2 text-stone-700">
          Ensuite : bouton <strong>Message laissé</strong>, puis <strong>Envoyer l&apos;offre</strong> par courriel depuis le contact. Après 3
          essais sans réponse, <strong>Rappeler plus tard</strong> dans 3 mois.
        </p>
      </section>

      <section className="carte text-sm">
        <h2 className="mb-2 font-bold">Règles à respecter</h2>
        <ul className="list-disc space-y-1 pl-5 text-stone-700">
          <li>Les appels sont faits par une personne, jamais par un robot (CRTC).</li>
          <li>« Ne plus appeler » est respecté tout de suite et pour toujours.</li>
          <li>Courriels seulement à des adresses d&apos;affaires publiées, avec désabonnement (loi antipourriel). Le CRM l&apos;ajoute tout seul.</li>
          <li>Les textos partent seulement aux personnes qui ont réservé une dégustation. STOP les désabonne automatiquement.</li>
          <li>Les allergies sont confirmées avant chaque dégustation.</li>
        </ul>
      </section>
    </div>
  );
}
