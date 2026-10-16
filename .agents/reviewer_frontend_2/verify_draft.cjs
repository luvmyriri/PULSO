// Verify draft logic
const DRAFT_STORAGE_KEY = 'pulso_report_wizard_draft_v1';

const sampleState = {
  version: 1,
  savedAt: Date.now() - 3600000, // 1 hour ago
  currentStep: 3,
  maxStepReached: 4,
  formData: {
    category: 'Roads & Bridges',
    location: {
      lat: 14.7568,
      lng: 121.0454,
      address: 'Camarin Road, Caloocan City',
      barangay: 'Barangay 174',
      landmark: 'Near Church',
      isInCaloocan: true
    },
    evidence: {
      fileName: 'pothole.jpg',
      fileSize: 102400,
      mimeType: 'image/jpeg',
      aiCategorySuggestion: 'Roads & Bridges',
      aiConfidence: 98
    },
    details: {
      description: 'Deep pothole across the north lane.',
      urgency: 'high'
    },
    contact: {
      type: 'anonymous',
      email: '',
      phone: ''
    },
    consentAccepted: false
  }
};

const serialized = JSON.stringify(sampleState);
const parsed = JSON.parse(serialized);

const isFresh = (Date.now() - parsed.savedAt) < 86400000;
console.log('Draft test: Valid JSON:', !!parsed);
console.log('Draft test: Is Fresh (< 24h):', isFresh);
console.log('Draft test: Preserves Step 3:', parsed.currentStep === 3);
console.log('Draft test: Preserves Category:', parsed.formData.category === 'Roads & Bridges');
