import { ONBOARDING_CONTENT } from './onboardingContent';

export const NATIVE_GUIDE_CONTENT = {
  en: {
    label: 'Quick guide', step: 'Step', of: 'of', next: 'Continue', finish: 'Get started', overview: 'How reporting works',
    steps: [
      { label: 'Getting started', title: 'Report a problem in', accent: 'Caloocan.',
        icons: ['clipboard-list', 'map-pin', 'send'] },
      { label: 'The details', title: 'Describe', accent: 'the problem.' },
      { label: 'The location', title: 'Mark', accent: 'the location.' },
      { label: 'The photo', title: 'Add', accent: 'a clear photo.' },
      { label: 'After submitting', title: 'Follow', accent: 'your report.',
        subtitle: 'Save your ticket ID and tracking code to check for updates.',
        items: [
          { icon: 'clipboard-check', title: 'Keep your receipt', description: 'Save the ticket ID and tracking code.' },
          { icon: 'list', title: 'Track your report', description: 'Use Track a report on the home screen.' },
          { icon: 'message-square', title: 'Read the latest update', description: 'Check the status and any requests for details.' },
        ] },
    ],
  },
  tl: {
    label: 'Maikling gabay', step: 'Hakbang', of: 'sa', next: 'Magpatuloy', finish: 'Magsimula', overview: 'Paano mag-ulat',
    steps: [
      { label: 'Pagsisimula', title: 'Mag-ulat ng problema sa', accent: 'Caloocan.',
        icons: ['clipboard-list', 'map-pin', 'send'] },
      { label: 'Ang detalye', title: 'Ilarawan', accent: 'ang problema.' },
      { label: 'Ang lokasyon', title: 'Itakda', accent: 'ang lokasyon.' },
      { label: 'Ang larawan', title: 'Magdagdag ng', accent: 'malinaw na larawan.' },
      { label: 'Pagkatapos magpadala', title: 'Subaybayan', accent: 'ang iyong ulat.',
        subtitle: 'Itabi ang ticket ID at tracking code para makita ang mga update.',
        items: [
          { icon: 'clipboard-check', title: 'Itabi ang resibo', description: 'Itago ang ticket ID at tracking code.' },
          { icon: 'list', title: 'Subaybayan ang ulat', description: 'Gamitin ang Subaybayan ang ulat sa home screen.' },
          { icon: 'message-square', title: 'Basahin ang pinakabagong update', description: 'Tingnan ang estado at mga hinihinging detalye.' },
        ] },
    ],
  },
};

export function nativeGuideStep(language, step) {
  const copy = NATIVE_GUIDE_CONTENT[language] || NATIVE_GUIDE_CONTENT.en;
  const original = language === 'tl' ? ONBOARDING_CONTENT.tl : ONBOARDING_CONTENT;
  return { ...original[`screen${step}`], ...copy.steps[step - 1] };
}
