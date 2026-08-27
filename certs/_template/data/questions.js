// Canonical question schema consumed by core/js/quiz-engine.js.
// number: required, used for deep-linking (?focus=<number>).
// domain: required only for exam-mode banks (per-domain accuracy stats).
window.CERT_QUESTIONS = [
  {
    uid: 'template-1',
    number: 1,
    domain: 'D1',
    question: 'Example question — replace with real content?',
    options: { A: 'Option A', B: 'Option B', C: 'Option C', D: 'Option D' },
    correct: 'A',
    explanation: 'Why A is correct.'
  }
];
