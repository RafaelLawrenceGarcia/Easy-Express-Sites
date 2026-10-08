// Mirrors the ten knowledge questions in PCTutorialQuestionBank.cs (Unity 6000.3.2f1).
export const questions = {
  'case-safe': { answer: 0, skill: 'Safe handling' },
  'cables-diagnose': { answer: 0, skill: 'Power connections' },
  'gpu-identify': { category: 'GPU', skill: 'Component identification' },
  'ram-identify': { category: 'RAM', skill: 'Component identification' },
  'storage-diagnose': { answer: 0, skill: 'Storage diagnosis' },
  'fan-airflow': { answer: 0, skill: 'Cooling' },
  'cooler-identify': { category: 'Cooler', skill: 'Component identification' },
  'paste-diagnose': { answer: 0, skill: 'Cooling' },
  'cpu-safe': { answer: 0, skill: 'Safe handling' },
  'psu-identify': { category: 'PSU', skill: 'Component identification' },
};
export const scenario = {
  id: 'pc-components', version: '1', title: 'PC component fundamentals', difficulty: 'Foundation',
  purpose: 'Identify PC components and apply safe handling and basic diagnostic procedures in the existing Unity tutorial.',
  objectives: ['Identify the GPU, RAM, cooler and power supply', 'Handle components safely', 'Check power, storage and cooling symptoms'],
  criteria: 'Ten first-try answers in a pre-test, post-test or replay check. The server grades selected answers against the versioned question bank.',
  source: 'PCComponentIntroductionTutorial / PCTutorialQuestionBank',
};
export const rubric = { version: 'components-1', passPercent: 80, questionCount: 10 };
export const metricDefinitions = [
  ['Completion rate', 'Assignments with at least one finalized assessment ÷ all assignments in the current workspace. Practice is excluded.'],
  ['Pass rate', 'Passed finalized assigned assessments ÷ finalized assigned assessments with a score. Shows attempt sample size.'],
  ['Knowledge accuracy', 'Correct first-try answers ÷ 10, for the selected check phase. Graded on the server.'],
  ['Tutorial time', 'Client-reported tutorialSeconds from the existing tutorial clock. Includes time in tutorial UI; not active hands-on task time.'],
  ['Presence', 'Online: heartbeat ≤ 60 seconds. Recent activity: ≤ 5 minutes. Unknown/stale: > 5 minutes. Ended sessions stay ended.'],
  ['Due dates and timestamps', 'Due dates are UTC calendar dates and become overdue on the following UTC day. Activity timestamps are displayed in your browser’s local time.'],
  ['Unavailable measurements', 'Diagnosis accuracy, assembly errors, hints and active task time are not recorded by this integration. Game currency and reputation are excluded.'],
];
