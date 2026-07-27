export const germanB2UploadGuidance = {
  title: 'German B2 note upload template',
  warning: 'Uploaded notes are seeds, not final webpage copy. The pipeline turns them into reviewed vocabulary cards, grammar exercises, reading questions, and writing prompts with source provenance.',
  acceptedSourceTypes: ['pdf', 'txt', 'markdown'],
  outputRules: [
    'Vocabulary rows become flip cards with German fronts, Hungarian backs, verb metadata, and learner tasks.',
    'Grammar notes become tutor exercises: concept check, transformation, fill-in, correction, and short production.',
    'Reading notes become source-backed passages and answerable questions; do not invent external articles.',
    'Writing notes become prompts with expected length, required reuse words, help words, and a checklist.',
  ],
  markdownTemplate: `# Lektion N — topic

## Wortschatz
| German | Hungarian | Notes |
| --- | --- | --- |
| der Antrag | kérvény | plural: die Anträge |
| sich kümmern um | gondoskodni valamiről | present: kümmert sich um | past: kümmerte sich um | perfect: hat sich gekümmert um | irregular: false |

## Grammatik
- Nebensätze mit obwohl: Obwohl der Termin knapp ist, reicht sie den Antrag ein.

## Lesen
Kurzer Lesetext: Der Antrag ist wichtig, weil die Frist morgen endet.
Fragen:
- Warum ist der Antrag wichtig?

## Schreiben
Aufgabe: Schreiben Sie eine kurze Nachricht über den Antrag.
Hilfe-Wörter: Antrag, Frist, kümmern`,
};
