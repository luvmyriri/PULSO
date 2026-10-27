/**
 * onboardingContent.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized copy for the 5 PULSO Onboarding screens matching target design:
 * - Step 1: A better neighborhood starts with you.
 * - Step 2: Show us what needs attention.
 * - Step 3: Put the issue on the map.
 * - Step 4: A clear photo tells the story.
 * - Step 5: Stay informed after you submit.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const ONBOARDING_CONTENT = {
  header: {
    city: 'CALOOCAN CITY',
    title: 'City Engineering Department',
    subtitle: 'powered by PULSO',
    shortTitle: 'City Engineering Department',
    sealAlt: 'Caloocan City Engineering Department Logo',
    backAria: 'Go to previous step',
    skipLabel: 'Skip',
    skipAria: 'Skip onboarding'
  },
  screen1: {
    step: 1,
    eyebrow: 'CALOOCAN CITY',
    title: 'A better neighborhood starts with you.',
    subtitle: "Report local infrastructure concerns and follow the city's response.",
    howItWorksHeading: 'How it works',
    items: [
      {
        number: 1,
        icon: 'number',
        title: 'Describe the concern',
        description: 'Tell us what needs attention.'
      },
      {
        number: 2,
        icon: 'number',
        title: 'Pin the location',
        description: 'Add the spot and a clear photo.'
      },
      {
        number: 3,
        icon: 'number',
        title: 'Review and submit',
        description: 'Check your details before sending.'
      }
    ],
    primaryButton: 'Start a report',
    secondaryText: 'Already have an account?',
    secondaryLink: 'Sign in'
  },
  screen2: {
    step: 2,
    title: 'Show us what needs attention.',
    subtitle: 'Choose a category and describe the concern.',
    items: [
      {
        icon: 'wrench',
        title: 'Roads and public facilities',
        description: 'Report issues like roads, sidewalks, streetlights and more.'
      },
      {
        icon: 'message-square',
        title: 'Clear specific description',
        description: 'Share what you see in simple details.'
      },
      {
        icon: 'clipboard-list',
        title: 'One concern per report',
        description: 'Keep each report focused on one issue.'
      }
    ],
    backButton: 'Back',
    primaryButton: 'Continue'
  },
  screen3: {
    step: 3,
    title: 'Put the issue on the map.',
    subtitle: 'Pin the exact location so the team knows where to look.',
    items: [
      {
        icon: 'map-pin',
        title: 'Place the map pin',
        description: 'Tap the map to mark the exact location.'
      },
      {
        icon: 'map',
        title: 'Add a street or landmark',
        description: 'Include a nearby street address or landmark to help.'
      },
      {
        icon: 'crosshair',
        title: 'Check the location',
        description: 'Make sure the pin is in the right spot before continuing.'
      }
    ],
    backButton: 'Back',
    primaryButton: 'Continue'
  },
  screen4: {
    step: 4,
    title: 'A clear photo tells the story.',
    subtitle: 'Add useful evidence from a safe place.',
    items: [
      {
        icon: 'camera',
        title: 'Show the issue clearly',
        description: 'Capture the problem in good light and focus.'
      },
      {
        icon: 'image',
        title: 'Include nearby surroundings',
        description: 'Show the area around the issue to provide context.'
      },
      {
        icon: 'user',
        title: 'Avoid unnecessary personal details',
        description: 'Keep people\'s faces, license plates and private information out of photos.'
      }
    ],
    backButton: 'Back',
    primaryButton: 'Continue'
  },
  screen5: {
    step: 5,
    title: 'Stay informed after you submit.',
    subtitle: 'Find your report ID and follow updates in My Reports.',
    items: [
      {
        icon: 'bell',
        title: 'Check report status',
        description: 'See progress and any changes in My Reports.'
      },
      {
        icon: 'message-square',
        title: 'Read department feedback',
        description: 'Look for messages or requests for more information.'
      },
      {
        icon: 'clipboard-check',
        title: 'Review any next steps',
        description: 'Follow any instructions provided by the department.'
      }
    ],
    backButton: 'Back',
    primaryButton: 'Start a report',
    secondaryText: 'Already have an account?',
    secondaryLink: 'Sign in'
  },

  // Tagalog (tl) localization dictionary
  tl: {
    header: {
      title: 'City Engineering Department',
      subtitle: 'powered by PULSO',
      shortTitle: 'City Engineering Department',
      sealAlt: 'Caloocan City Engineering Department Logo',
      backAria: 'Bumalik sa nakaraang hakbang',
      skipLabel: 'Laktawan',
      skipAria: 'Laktawan ang onboarding'
    },
    screen1: {
      step: 1,
      eyebrow: 'LUNGSOD NG CALOOCAN',
      title: 'Nagsisimula sa inyo ang mas maayos na komunidad.',
      subtitle: 'Iulat ang mga sira sa inyong lugar at subaybayan ang aksyon ng lungsod.',
      howItWorksHeading: 'Paano ito gumagana',
      items: [
        {
          number: 1,
          icon: 'number',
          title: 'Ilarawan ang problema',
          description: 'Sabihin kung ano ang kailangang ayusin.'
        },
        {
          number: 2,
          icon: 'number',
          title: 'I-pin ang lokasyon',
          description: 'Ilagay ang lugar at malinaw na litrato.'
        },
        {
          number: 3,
          icon: 'number',
          title: 'Suriin at ipadala',
          description: 'Tingnan ang detalye bago magpadala.'
        }
      ],
      primaryButton: 'Magsimula ng ulat',
      secondaryText: 'May account ka na ba?',
      secondaryLink: 'Mag-sign in'
    },
    screen2: {
      step: 2,
      title: 'Ipakita ang kailangang bigyang-pansin.',
      subtitle: 'Pumili ng kategorya at ilarawan ang problema.',
      items: [
        {
          icon: 'wrench',
          title: 'Mga kalsada at pampublikong pasilidad',
          description: 'Mag-ulat ng mga sira tulad ng kalsada, bangketa, at ilaw.'
        },
        {
          icon: 'message-square',
          title: 'Malinaw at tiyak na paglalarawan',
          description: 'Ibahagi ang inyong nakikita sa simpleng detalye.'
        },
        {
          icon: 'clipboard-list',
          title: 'Isang problema bawat ulat',
          description: 'Panatilihing nakatutok ang bawat ulat sa isang isyu.'
        }
      ],
      backButton: 'Bumalik',
      primaryButton: 'Magpatuloy'
    },
    screen3: {
      step: 3,
      title: 'Ilagay ang problema sa mapa.',
      subtitle: 'I-pin ang eksaktong lokasyon para malaman ng koponan kung saan pupunta.',
      items: [
        {
          icon: 'map-pin',
          title: 'Ilagay ang map pin',
          description: 'Pindutin ang mapa upang itakda ang eksaktong lugar.'
        },
        {
          icon: 'map',
          title: 'Maglagay ng kalye o palatandaan',
          description: 'Magsama ng kalapit na tirahan, kalye, o landmark.'
        },
        {
          icon: 'crosshair',
          title: 'Suriin ang lokasyon',
          description: 'Siguraduhing nasa tamang lugar ang pin bago magpatuloy.'
        }
      ],
      backButton: 'Bumalik',
      primaryButton: 'Magpatuloy'
    },
    screen4: {
      step: 4,
      title: 'Mas malinaw ang kwento gamit ang litrato.',
      subtitle: 'Magdagdag ng patunay mula sa ligtas na lugar.',
      items: [
        {
          icon: 'camera',
          title: 'Ipakita nang malinaw ang sira',
          description: 'Kunan ang problema sa magandang ilaw at linaw.'
        },
        {
          icon: 'image',
          title: 'Isama ang paligid',
          description: 'Ipakita ang paligid upang magbigay ng konteksto.'
        },
        {
          icon: 'user',
          title: 'Iwasan ang mga personal na detalye',
          description: 'Iwasang makuhanan ang mukha ng tao at plaka ng sasakyan.'
        }
      ],
      backButton: 'Bumalik',
      primaryButton: 'Magpatuloy'
    },
    screen5: {
      step: 5,
      title: 'Manatiling updated pagkatapos magsumite.',
      subtitle: 'Alamin ang inyong report ID at sundan ang update sa My Reports.',
      items: [
        {
          icon: 'bell',
          title: 'Tingnan ang estado ng ulat',
          description: 'Tingnan ang progreso at anumang pagbabago sa My Reports.'
        },
        {
          icon: 'message-square',
          title: 'Basahin ang tugon ng departamento',
          description: 'Maghintay ng mensahe o kahilingan para sa dagdag na impormasyon.'
        },
        {
          icon: 'clipboard-check',
          title: 'Suriin ang susunod na hakbang',
          description: 'Sundin ang anumang tagubilin mula sa departamento.'
        }
      ],
      backButton: 'Bumalik',
      primaryButton: 'Magsimula ng ulat',
      secondaryText: 'May account ka na ba?',
      secondaryLink: 'Mag-sign in'
    }
  }
};
