/**
 * onboardingContent.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized plain-language copy for the 5 PULSO Onboarding screens.
 * Designed to match the editorial reference layout in both Dark and Light modes:
 * - Plain words a 12-year-old can read
 * - <= 12 words per sentence
 * - One idea per sentence
 * - Consistent vocabulary ("concern", "report", "City Engineering", "tracking code")
 * - Translatable structure ready for Filipino (Tagalog) localization.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const ONBOARDING_CONTENT = {
  header: {
    title: 'City Engineering Office',
    subtitle: 'Citizen Services',
    shortTitle: 'City Engineering',
    sealAlt: 'City Engineering Department, Caloocan City, PULSO seal',
    backAria: 'Go to previous step',
    skipLabel: 'Skip',
    skipAria: 'Skip onboarding'
  },
  screen1: {
    step: 1,
    eyebrow: 'CALOOCAN CITY',
    title: 'Report a concern in your area.',
    subtitle: 'Send a report to City Engineering about a concern in your area.',
    howItWorksHeading: 'How it works',
    howItWorks: [
      { number: 1, title: 'Describe your concern', description: 'Tell us what problem needs help in your area.' },
      { number: 2, title: 'Add the location and details', description: 'Confirm the address and add extra details.' },
      { number: 3, title: 'Review and submit your report', description: 'Check your report and send it to our team.' }
    ],
    primaryButton: 'Start a report',
    secondaryText: 'Already have an account?',
    secondaryLink: 'Sign in.'
  },
  screen2: {
    step: 2,
    title: 'Report in 3 Easy Steps',
    subtitle: 'Here is what you need to do.',
    steps: [
      {
        number: 1,
        title: 'Take a photo',
        description: 'Add a clear photo of your concern.'
      },
      {
        number: 2,
        title: 'Choose a category',
        description: 'Select the category that best fits your report.'
      },
      {
        number: 3,
        title: 'Confirm the location',
        description: 'Check the location and adjust it if needed.'
      }
    ],
    primaryButton: 'Next'
  },
  screen3: {
    step: 3,
    title: 'How City Engineering Helps',
    subtitle: 'What happens after you send a report.',
    steps: [
      {
        number: 1,
        title: 'We review your report',
        description: 'Our team checks the details and location you provide.'
      },
      {
        number: 2,
        title: 'We plan the repairs',
        description: 'A city repair team is dispatched to fix it.'
      },
      {
        number: 3,
        title: 'You receive updates',
        description: 'Follow the status of your report until work finishes.'
      }
    ],
    primaryButton: 'Next'
  },
  screen4: {
    step: 4,
    title: 'Follow Your Report Progress',
    subtitle: 'Each report has a tracking code so you can check its status.',
    exampleBadge: 'EXAMPLE REPORT',
    trackingLabel: 'Tracking code',
    sampleTrackingCode: 'PUL-2026-1049',
    statusBadge: 'In progress',
    milestones: [
      {
        id: 'received',
        number: 1,
        status: 'done',
        title: 'Received',
        badge: null,
        description: 'Your report has been submitted.'
      },
      {
        id: 'in_progress',
        number: 2,
        status: 'current',
        title: 'In progress',
        badge: 'Current',
        description: 'Your concern is being addressed.'
      },
      {
        id: 'resolved',
        number: 3,
        status: 'next',
        title: 'Resolved',
        badge: null,
        description: 'A final update is available.'
      }
    ],
    primaryButton: 'Next'
  },
  screen5: {
    step: 5,
    title: 'You Are Ready to Report',
    subtitle: 'Create an account to submit your first report and follow its progress.',
    cardTitle: 'Caloocan City Engineering',
    cardDescription: 'Your reports are sent to City Engineering for review.',
    primaryButton: 'Create Account',
    primaryButtonProfile: 'Back to Settings',
    secondaryText: 'Already have an account?',
    secondaryLink: 'Sign in'
  },

  // Tagalog (tl) localization dictionary
  tl: {
    header: {
      title: 'City Engineering Office',
      subtitle: 'Mga Serbisyong Pambayan',
      shortTitle: 'City Engineering',
      sealAlt: 'Kagawaran ng City Engineering, Lungsod ng Caloocan, tatak ng PULSO',
      backAria: 'Bumalik sa nakaraang hakbang',
      skipLabel: 'Laktawan',
      skipAria: 'Laktawan ang onboarding'
    },
    screen1: {
      eyebrow: 'LUNGSOD NG CALOOCAN',
      title: 'Mag-ulat ng problema sa inyong lugar.',
      subtitle: 'Magpadala ng ulat sa City Engineering tungkol sa problema sa komunidad.',
      howItWorksHeading: 'Paano ito gumagana',
      howItWorks: [
        { number: 1, title: 'Ilarawan ang inyong problema', description: 'Sabihin kung ano ang kailangang ayusin sa inyong lugar.' },
        { number: 2, title: 'Ilagay ang lokasyon at detalye', description: 'Kumpirmahin ang tirahan at dagdag na impormasyon.' },
        { number: 3, title: 'Suriin at ipadala ang ulat', description: 'Tingnan ang buod at ipadala sa aming koponan.' }
      ],
      primaryButton: 'Magsimula ng ulat',
      secondaryText: 'May account ka na ba?',
      secondaryLink: 'Mag-sign in.'
    },
    screen2: {
      title: 'Mag-ulat sa 3 Simpleng Hakbang',
      subtitle: 'Ito ang kailangan ninyong gawin.',
      steps: [
        {
          number: 1,
          title: 'Kumuha ng litrato',
          description: 'Maglagay ng malinaw na litrato ng sira.'
        },
        {
          number: 2,
          title: 'Pumili ng kategorya',
          description: 'Piliin ang kategoryang angkop sa ulat.'
        },
        {
          number: 3,
          title: 'Kumpirmahin ang lugar',
          description: 'Tingnan ang lokasyon at ayusin kung kailangan.'
        }
      ],
      primaryButton: 'Susunod'
    },
    screen3: {
      title: 'Paano Tumutulong ang City Engineering',
      subtitle: 'Ito ang mangyayari pagkatapos maipadala ang ulat.',
      steps: [
        {
          number: 1,
          title: 'Sinusuri namin ang ulat',
          description: 'Tinitingnan ng aming koponan ang litrato at lokasyon.'
        },
        {
          number: 2,
          title: 'Ipinaplano ang pagkukumpuni',
          description: 'Ipapadala ang repair team upang ayusin ito.'
        },
        {
          number: 3,
          title: 'May natatanggap kang abiso',
          description: 'Sundan ang kalagayan hanggang matapos ang gawa.'
        }
      ],
      primaryButton: 'Susunod'
    },
    screen4: {
      title: 'Sundan ang Progreso ng Ulat',
      subtitle: 'Bawat ulat ay may tracking code upang tingnan ang estado.',
      exampleBadge: 'HALIMBAWANG ULAT',
      trackingLabel: 'Tracking code',
      sampleTrackingCode: 'PUL-2026-1049',
      statusBadge: 'Ginagawa na',
      milestones: [
        {
          id: 'received',
          number: 1,
          status: 'done',
          title: 'Natanggap',
          badge: null,
          description: 'Naipadala at natanggap na ang inyong ulat.'
        },
        {
          id: 'in_progress',
          number: 2,
          status: 'current',
          title: 'Ginagawa na',
          badge: 'Kasalukuyan',
          description: 'Kasalukuyang inaayos ng repair team ang sira.'
        },
        {
          id: 'resolved',
          number: 3,
          status: 'next',
          title: 'Naayos na',
          badge: null,
          description: 'May huling ulat at litrato ng patunay.'
        }
      ],
      primaryButton: 'Susunod'
    },
    screen5: {
      title: 'Handa Ka Nang Mag-ulat',
      subtitle: 'Gumawa ng account para maipadala ang ulat at masubaybayan ito.',
      cardTitle: 'City Engineering ng Caloocan',
      cardDescription: 'Direktang ipinapadala ang inyong mga ulat sa City Engineering.',
      primaryButton: 'Gumawa ng Account',
      primaryButtonProfile: 'Bumalik sa Settings',
      secondaryText: 'May account ka na ba?',
      secondaryLink: 'Mag-sign in'
    }
  }
};

export default ONBOARDING_CONTENT;
