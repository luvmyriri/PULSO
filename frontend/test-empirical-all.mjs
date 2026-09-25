import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import geospatial utilities under test
import {
  isPointInPolygon,
  isInCaloocanBounds,
  isInCaloocan,
  getDistrictFromCoords,
  getDistrictLabel,
  getHaversineDistanceMeters,
  estimateBarangayFromCoords,
  CALOOCAN_CENTERS,
  CALOOCAN_BOUNDS
} from './src/utils/geospatial.js';

console.log('================================================================');
console.log('PULSO FRONTEND EMPIRICAL CHALLENGE SUITE (M1-M4)');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;
let totalTests = 0;
const failures = [];

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passCount++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    failCount++;
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    failures.push({ test: name, error: err.message, stack: err.stack });
  }
}

// ============================================================================
// SUITE 1: RAY-CASTING POINT-IN-POLYGON (PIP) ALGORITHM
// ============================================================================
console.log('--- SUITE 1: Ray-Casting & Geometric Corner Cases ---');

test('PIP 1.1: Square Polygon - inside, outside, margins', () => {
  const square = [
    [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
  ];
  assert.strictEqual(isPointInPolygon(5, 5, square), true);
  assert.strictEqual(isPointInPolygon(1, 1, square), true);
  assert.strictEqual(isPointInPolygon(9, 9, square), true);
  assert.strictEqual(isPointInPolygon(-1, 5, square), false);
  assert.strictEqual(isPointInPolygon(11, 5, square), false);
  assert.strictEqual(isPointInPolygon(5, -1, square), false);
  assert.strictEqual(isPointInPolygon(5, 11, square), false);
});

test('PIP 1.2: Polygon with Interior Hole (Donut Exclusion)', () => {
  const donut = [
    [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]], // exterior
    [[3, 3], [7, 3], [7, 7], [3, 7], [3, 3]]      // hole
  ];
  assert.strictEqual(isPointInPolygon(1, 1, donut), true, 'In solid region');
  assert.strictEqual(isPointInPolygon(5, 5, donut), false, 'In hole must be FALSE');
  assert.strictEqual(isPointInPolygon(4, 4, donut), false, 'In hole must be FALSE');
  assert.strictEqual(isPointInPolygon(12, 12, donut), false, 'Outside exterior must be FALSE');
});

test('PIP 1.3: Non-convex U-Shape with Cutout Bay', () => {
  const uShape = [
    [[0, 0], [6, 0], [6, 6], [4, 6], [4, 2], [2, 2], [2, 6], [0, 6], [0, 0]]
  ];
  assert.strictEqual(isPointInPolygon(1, 1, uShape), true);
  assert.strictEqual(isPointInPolygon(5, 1, uShape), true);
  assert.strictEqual(isPointInPolygon(1, 5, uShape), true);
  assert.strictEqual(isPointInPolygon(5, 5, uShape), true);
  assert.strictEqual(isPointInPolygon(3, 4, uShape), false, 'Inside U-bay must be FALSE');
});

test('PIP 1.4: Ray hitting vertex / collinear horizontal edge', () => {
  const diamond = [
    [[5, 0], [10, 5], [5, 10], [0, 5], [5, 0]]
  ];
  assert.strictEqual(isPointInPolygon(2, 5, diamond), true);
  assert.strictEqual(isPointInPolygon(8, 5, diamond), true);
  assert.strictEqual(isPointInPolygon(-2, 5, diamond), false);
});

test('PIP 1.5: Degenerate inputs & robustness', () => {
  assert.strictEqual(isPointInPolygon(5, 5, null), false);
  assert.strictEqual(isPointInPolygon(5, 5, []), false);
  assert.strictEqual(isPointInPolygon(5, 5, [[]]), false);
  assert.strictEqual(isPointInPolygon(5, 5, [[[0, 0], [1, 1]]]), false);
  assert.strictEqual(isPointInPolygon(NaN, 5, [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]), false);
  assert.strictEqual(isPointInPolygon(5, NaN, [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]), false);
});

// ============================================================================
// SUITE 2: CALOOCAN GEOGRAPHIC BOUNDARIES & DISTRICTS ORACLE
// ============================================================================
console.log('\n--- SUITE 2: Caloocan Official GeoJSON Boundary & Surrounding LGUs ---');

const borderJsonPath = path.resolve(__dirname, '../backend/caloocan_border.json');
let allFeatures = [];
let allPolygons = [];

if (fs.existsSync(borderJsonPath)) {
  const rawData = JSON.parse(fs.readFileSync(borderJsonPath, 'utf8'));
  allFeatures = rawData.features || [];
  for (const feat of allFeatures) {
    if (feat.geometry) {
      if (feat.geometry.type === 'Polygon') {
        allPolygons.push(feat.geometry.coordinates);
      } else if (feat.geometry.type === 'MultiPolygon') {
        for (const poly of feat.geometry.coordinates) {
          allPolygons.push(poly);
        }
      }
    }
  }
}
console.log(`  [INFO] Loaded ${allPolygons.length} GeoJSON polygon rings from official backend dataset.`);

test('GEO 2.1: Verify All 188 Caloocan Barangay Centroids in GeoJSON', () => {
  assert.ok(allFeatures.length >= 180, `Expected ~188 features in Caloocan border dataset, got ${allFeatures.length}`);

  let verifiedCentroids = 0;
  for (const feat of allFeatures) {
    const props = feat.properties || {};
    const coords = feat.geometry.coordinates;
    const geomType = feat.geometry.type;

    const ring = geomType === 'Polygon' ? coords[0] : coords[0][0];
    let sumLng = 0;
    let sumLat = 0;
    for (const [lng, lat] of ring) {
      sumLng += lng;
      sumLat += lat;
    }
    const centroidLng = sumLng / ring.length;
    const centroidLat = sumLat / ring.length;

    const insideGeoJson = isInCaloocan(centroidLat, centroidLng, allPolygons);
    assert.ok(insideGeoJson, `Barangay ${props.display_name || props.ADM4_EN} centroid (${centroidLat}, ${centroidLng}) must be inside GeoJSON`);
    verifiedCentroids++;
  }
  console.log(`    [INFO] Verified ${verifiedCentroids} barangay centroids successfully.`);
});

test('GEO 2.2: North Caloocan (District 3) Key Landmarks', () => {
  const northPoints = [
    { name: 'Caloocan City Hall North (Camarin)', lat: 14.7565, lng: 121.0450 },
    { name: 'Bagong Silang (Barangay 176 Phase 1)', lat: 14.7780, lng: 121.0500 },
    { name: 'Tala (Barangay 180 / Holy Redeemer)', lat: 14.7650, lng: 121.0650 },
    { name: 'Deparo (Barangay 168 Center)', lat: 14.7380, lng: 121.0200 },
    { name: 'Bagumbong (Barangay 171)', lat: 14.7350, lng: 121.0250 },
  ];

  for (const pt of northPoints) {
    const inBounds = isInCaloocan(pt.lat, pt.lng);
    const inGeoJson = isInCaloocan(pt.lat, pt.lng, allPolygons);
    const district = getDistrictFromCoords(pt.lat, pt.lng);
    const label = getDistrictLabel(pt.lat, pt.lng);

    assert.strictEqual(inBounds, true, `${pt.name} inBounds`);
    assert.strictEqual(inGeoJson, true, `${pt.name} inGeoJson`);
    assert.strictEqual(district, 3);
    assert.ok(label.includes('District 3'));
  }
});

test('GEO 2.3: South Caloocan (District 1/2) Key Landmarks', () => {
  const southPoints = [
    { name: 'Monumento Circle (Barangay 12)', lat: 14.6570, lng: 120.9830 },
    { name: 'Caloocan City Hall South (Grace Park)', lat: 14.6500, lng: 120.9800 },
    { name: 'Bagong Barrio (Barangay 134-155)', lat: 14.6600, lng: 120.9980 },
    { name: 'Sangandaan (Barangay 8)', lat: 14.6520, lng: 120.9680 },
    { name: 'Grace Park West (Barangay 80)', lat: 14.6480, lng: 120.9850 },
  ];

  for (const pt of southPoints) {
    const inBounds = isInCaloocan(pt.lat, pt.lng);
    const inGeoJson = isInCaloocan(pt.lat, pt.lng, allPolygons);
    const district = getDistrictFromCoords(pt.lat, pt.lng);
    const label = getDistrictLabel(pt.lat, pt.lng);

    assert.strictEqual(inBounds, true);
    assert.strictEqual(inGeoJson, true);
    assert.strictEqual(district, 1);
    assert.ok(label.includes('District 1/2'));
  }
});

test('GEO 2.4: Surrounding LGUs Excluded in GeoJSON Oracle', () => {
  const adjacentMunicipalities = [
    // Quezon City
    { name: 'QC - SM North EDSA', lat: 14.6565, lng: 121.0289 },
    { name: 'QC - Novaliches Bayan', lat: 14.7210, lng: 121.0370 },
    { name: 'QC - Holy Spirit / Commonwealth', lat: 14.6850, lng: 121.0750 },
    { name: 'QC - La Mesa Ecopark Reservoir', lat: 14.7120, lng: 121.0750 },
    { name: 'QC - Cubao Araneta', lat: 14.6191, lng: 121.0534 },
    // Bulacan
    { name: 'Bulacan - SJDM City Hall', lat: 14.8140, lng: 121.0450 },
    { name: 'Bulacan - Marilao SM City', lat: 14.7570, lng: 120.9570 },
    { name: 'Bulacan - Meycauayan Commercial', lat: 14.7350, lng: 120.9550 },
    // Valenzuela
    { name: 'Valenzuela - Fatima University / MacArthur', lat: 14.6710, lng: 120.9850 },
    { name: 'Valenzuela - Marulas Market', lat: 14.6670, lng: 120.9800 },
    { name: 'Valenzuela - Ugong Commercial', lat: 14.6880, lng: 121.0100 },
    // Manila
    { name: 'Manila - Tayuman / Blumentritt', lat: 14.6240, lng: 120.9830 },
    { name: 'Manila - Tutuban Center (Divisoria)', lat: 14.6060, lng: 120.9710 },
    { name: 'Manila - Luneta / Rizal Park', lat: 14.5826, lng: 120.9787 },
    // Navotas & Malabon
    { name: 'Navotas - Fish Port Complex', lat: 14.6400, lng: 120.9400 },
    { name: 'Malabon - Malabon City Hall', lat: 14.6625, lng: 120.9570 },
  ];

  for (const loc of adjacentMunicipalities) {
    const inGeoJson = isInCaloocan(loc.lat, loc.lng, allPolygons);
    assert.strictEqual(inGeoJson, false, `${loc.name} must be FALSE in GeoJSON`);
  }
});

test('GEO 2.5: Empirical Boundary Discrepancy (Step2 Search Preset Deparo 168 vs GeoJSON)', () => {
  // Step2LocationMap:164 preset coordinate for Deparo
  const step2DeparoPreset = { lat: 14.7180, lng: 121.0180 };
  
  // Frontend Bounding box classifies it as inCaloocan (true)
  const inBbox = isInCaloocanBounds(step2DeparoPreset.lat, step2DeparoPreset.lng);
  assert.strictEqual(inBbox, true, 'Frontend bounding box incorrectly permits 14.7180, 121.0180');

  // Authoritative GeoJSON polygon classifies it as outside (false)
  const inGeoJson = isInCaloocan(step2DeparoPreset.lat, step2DeparoPreset.lng, allPolygons);
  assert.strictEqual(inGeoJson, false, 'Authoritative GeoJSON correctly excludes 14.7180, 121.0180');
});

// ============================================================================
// SUITE 3: HAVERSINE DISTANCE & 100M DUPLICATE RADAR
// ============================================================================
console.log('\n--- SUITE 3: Haversine Calculations & Duplicate Radar ---');

test('HAV 3.1: Haversine distance accuracy against geodesic references', () => {
  const d0 = getHaversineDistanceMeters(14.7565, 121.0450, 14.7565, 121.0450);
  assert.strictEqual(d0, 0);

  const dNorthSouth = getHaversineDistanceMeters(14.7565, 121.0450, 14.6570, 120.9830);
  assert.ok(dNorthSouth >= 12500 && dNorthSouth <= 14500, `Inter-district distance ~13.5km, got ${dNorthSouth}m`);

  const d11m = getHaversineDistanceMeters(14.7565, 121.0450, 14.7566, 121.0450);
  assert.ok(d11m >= 10 && d11m <= 12, `0.0001 deg lat difference ~11m, got ${d11m}m`);
});

test('HAV 3.2: Haversine invalid & edge input handling', () => {
  assert.strictEqual(getHaversineDistanceMeters(null, 121, 14, 121), Infinity);
  assert.strictEqual(getHaversineDistanceMeters(14, undefined, 14, 121), Infinity);
  assert.strictEqual(getHaversineDistanceMeters(14, 121, NaN, 121), Infinity);
  assert.strictEqual(getHaversineDistanceMeters(14, 121, 14, NaN), Infinity);
});

test('HAV 3.3: 100m Duplicate Radar threshold logic (Step4 Details Duplicate)', () => {
  const simulatedActiveReports = [
    {
      ticketId: 'RPT-20260830-4F81',
      category: 'Roads & Bridges',
      lat: 14.7568,
      lng: 121.0454,
    },
    {
      ticketId: 'RPT-20260831-7C22',
      category: 'Water & Drainage',
      lat: 14.6505,
      lng: 120.9805,
    },
  ];

  function findDuplicate(userLat, userLng, userCategory) {
    if (!userLat || !userLng) return null;
    const match = simulatedActiveReports.find((rep) => {
      const dist = getHaversineDistanceMeters(userLat, userLng, rep.lat, rep.lng);
      return dist <= 100 && (!userCategory || rep.category.toLowerCase() === userCategory.toLowerCase());
    });
    if (match) {
      const distance = getHaversineDistanceMeters(userLat, userLng, match.lat, match.lng);
      return { ...match, distance };
    }
    return null;
  }

  // Exact location match (<100m) with same category
  const match1 = findDuplicate(14.7567, 121.0453, 'Roads & Bridges');
  assert.ok(match1 !== null);
  assert.strictEqual(match1.ticketId, 'RPT-20260830-4F81');
  assert.ok(match1.distance <= 100);

  // Same location (<100m) but DIFFERENT category -> NO duplicate match
  const mismatchCat = findDuplicate(14.7567, 121.0453, 'Water & Drainage');
  assert.strictEqual(mismatchCat, null);

  // Same category but >100m away (e.g. 500m away)
  const farLocation = findDuplicate(14.7610, 121.0454, 'Roads & Bridges');
  assert.strictEqual(farLocation, null);

  // Case-insensitivity test ('roads & bridges' vs 'Roads & Bridges')
  const caseMatch = findDuplicate(14.7567, 121.0453, 'roads & bridges');
  assert.ok(caseMatch !== null);
});

// ============================================================================
// SUITE 4: DRAFT SERIALIZATION & LOCALSTORAGE CORRUPTION
// ============================================================================
console.log('\n--- SUITE 4: Draft Serialization & LocalStorage Corruption Resilience ---');

test('DRAFT 4.1: Draft payload serialization structure & schema fidelity', () => {
  const currentStep = 3;
  const maxStepReached = 4;
  const formData = {
    category: 'Roads & Bridges',
    location: {
      lat: 14.7565,
      lng: 121.0450,
      address: 'Camarin Rd, North Caloocan',
      barangay: 'Barangay 174 (Camarin)',
      landmark: 'Near Shell Station',
      isInCaloocan: true,
    },
    evidence: {
      file: null,
      fileName: 'pothole_evidence.jpg',
      fileSize: 2048500,
      mimeType: 'image/jpeg',
      aiCategorySuggestion: 'Roads & Bridges',
      aiConfidence: 96,
    },
    details: {
      description: 'Dangerous pothole on main road causing lane swerving.',
      urgency: 'high',
    },
    contact: {
      type: 'notify',
      email: 'citizen@caloocan.gov.ph',
      phone: '09171234567',
    },
    consentAccepted: false,
  };

  const draftPayload = {
    version: 1,
    savedAt: Date.now(),
    currentStep,
    maxStepReached,
    formData: {
      category: formData.category,
      location: formData.location,
      evidence: {
        fileName: formData.evidence.fileName,
        fileSize: formData.evidence.fileSize,
        mimeType: formData.evidence.mimeType,
        aiCategorySuggestion: formData.evidence.aiCategorySuggestion,
        aiConfidence: formData.evidence.aiConfidence,
      },
      details: formData.details,
      contact: formData.contact,
      consentAccepted: formData.consentAccepted,
    }
  };

  const serialized = JSON.stringify(draftPayload);
  assert.ok(serialized.length > 0);

  const deserialized = JSON.parse(serialized);
  assert.strictEqual(deserialized.version, 1);
  assert.strictEqual(deserialized.currentStep, 3);
  assert.strictEqual(deserialized.maxStepReached, 4);
  assert.strictEqual(deserialized.formData.category, 'Roads & Bridges');
  assert.strictEqual(deserialized.formData.location.lat, 14.7565);
});

test('DRAFT 4.2: Recovery logic under corrupted localStorage inputs', () => {
  const corruptionVectors = [
    { name: 'Invalid JSON string', raw: '{invalid_json...' },
    { name: 'Number primitive', raw: '123456' },
    { name: 'Boolean primitive', raw: 'true' },
    { name: 'Null primitive', raw: 'null' },
    { name: 'Array root', raw: '[1, 2, 3]' },
    { name: 'Empty string', raw: '' },
    { name: 'Missing formData', raw: JSON.stringify({ savedAt: Date.now(), currentStep: 2 }) },
    { name: 'Expired draft (>24h)', raw: JSON.stringify({ savedAt: Date.now() - 90000000, currentStep: 3, formData: {} }) },
    { name: 'Future timestamp', raw: JSON.stringify({ savedAt: Date.now() + 90000000, currentStep: 3, formData: {} }) },
    { name: 'Out-of-range negative step', raw: JSON.stringify({ savedAt: Date.now(), currentStep: -10, maxStepReached: -5, formData: {} }) },
    { name: 'Out-of-range excessive step', raw: JSON.stringify({ savedAt: Date.now(), currentStep: 999, maxStepReached: 1000, formData: {} }) },
    { name: 'NaN step numbers', raw: JSON.stringify({ savedAt: Date.now(), currentStep: null, maxStepReached: undefined, formData: {} }) },
    { name: 'Corrupted nested location object', raw: JSON.stringify({ savedAt: Date.now(), currentStep: 2, formData: { location: null } }) },
    { name: 'Corrupted nested evidence object', raw: JSON.stringify({ savedAt: Date.now(), currentStep: 3, formData: { evidence: 'not an object' } }) },
  ];

  for (const vec of corruptionVectors) {
    let stepToResume = 1;
    let maxStepReached = 1;

    try {
      if (vec.raw) {
        const parsed = JSON.parse(vec.raw);
        if (parsed && typeof parsed === 'object') {
          stepToResume = Math.min(Math.max(Number(parsed.currentStep) || 1, 1), 6);
          maxStepReached = Math.max(Number(parsed.maxStepReached) || stepToResume, stepToResume);
        }
      }
    } catch {
      // Ignored safely
    }

    assert.ok(stepToResume >= 1 && stepToResume <= 6, `${vec.name}: stepToResume in [1, 6]`);
    assert.ok(maxStepReached >= 1 && maxStepReached <= 6 || maxStepReached >= stepToResume, `${vec.name}: maxStepReached valid`);
  }
});

// ============================================================================
// SUITE 5: STEP NAVIGATION INTEGRITY & FORM LIFECYCLE
// ============================================================================
console.log('\n--- SUITE 5: Step Navigation State Integrity & Validation Gates ---');

test('NAV 5.1: Linear Forward Navigation 1 -> 6 and maxStepReached tracking', () => {
  let currentStep = 1;
  let maxStepReached = 1;

  const goToNextStep = () => {
    if (currentStep < 6) {
      const next = currentStep + 1;
      currentStep = next;
      maxStepReached = Math.max(maxStepReached, next);
    }
  };

  for (let s = 1; s <= 5; s++) {
    goToNextStep();
    assert.strictEqual(currentStep, s + 1);
    assert.strictEqual(maxStepReached, s + 1);
  }

  // Clamping at 6
  goToNextStep();
  assert.strictEqual(currentStep, 6);
  assert.strictEqual(maxStepReached, 6);
});

test('NAV 5.2: Backward Navigation 6 -> 1 does NOT reduce maxStepReached', () => {
  let currentStep = 6;
  let maxStepReached = 6;

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      currentStep = currentStep - 1;
    }
  };

  for (let s = 6; s >= 2; s--) {
    goToPreviousStep();
    assert.strictEqual(currentStep, s - 1);
    assert.strictEqual(maxStepReached, 6);
  }

  // Clamping at 1
  goToPreviousStep();
  assert.strictEqual(currentStep, 1);
  assert.strictEqual(maxStepReached, 6);
});

test('NAV 5.3: Arbitrary Jump Validation (jumpToStep)', () => {
  let currentStep = 1;
  let maxStepReached = 3;

  const jumpToStep = (target) => {
    if (target >= 1 && target <= 6 && target <= maxStepReached) {
      currentStep = target;
      return true;
    }
    return false;
  };

  assert.strictEqual(jumpToStep(3), true);
  assert.strictEqual(currentStep, 3);
  assert.strictEqual(jumpToStep(2), true);
  assert.strictEqual(currentStep, 2);
  assert.strictEqual(jumpToStep(4), false, 'Jump past maxStepReached is blocked');
  assert.strictEqual(currentStep, 2);
  assert.strictEqual(jumpToStep(0), false);
  assert.strictEqual(jumpToStep(7), false);
});

test('NAV 5.4: Step Validation Rules Enforcement', () => {
  // Step 1: Category must be non-empty
  const canContinueStep1 = (category) => Boolean(category && category.trim().length > 0);
  assert.strictEqual(canContinueStep1(''), false);
  assert.strictEqual(canContinueStep1(null), false);
  assert.strictEqual(canContinueStep1('Roads & Bridges'), true);

  // Step 2: Must be within Caloocan
  const canContinueStep2 = (lat, lng) => isInCaloocan(lat, lng);
  assert.strictEqual(canContinueStep2(14.7565, 121.0450), true);
  assert.strictEqual(canContinueStep2(14.6500, 120.9800), true);
  assert.strictEqual(canContinueStep2(14.5826, 120.9787), false);

  // Step 4: Description length: min 10 chars, max 5000 chars
  const canContinueStep4 = (desc) => {
    const len = (desc || '').trim().length;
    return len >= 10 && len <= 5000;
  };
  assert.strictEqual(canContinueStep4(''), false);
  assert.strictEqual(canContinueStep4('Short'), false);
  assert.strictEqual(canContinueStep4('123456789'), false);
  assert.strictEqual(canContinueStep4('1234567890'), true);
  assert.strictEqual(canContinueStep4('A'.repeat(5000)), true);
  assert.strictEqual(canContinueStep4('A'.repeat(5001)), false);

  // Step 5: Contact validation (matching Step5ContactPreferences logic)
  const canContinueStep5 = (contact) => {
    const contactType = contact.type || 'anonymous';
    const email = contact.email || '';
    const phone = contact.phone || '';
    const isEmailValid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const isPhoneValid = !phone || /^(09|\+639)\d{9}$/.test(phone.replace(/[\s-]/g, ''));

    return Boolean(
      contactType === 'anonymous' ||
      contactType === 'authenticated' ||
      (contactType === 'notify' && isEmailValid && isPhoneValid && (email.length > 0 || phone.length > 0))
    );
  };

  assert.strictEqual(canContinueStep5({ type: 'anonymous' }), true);
  assert.strictEqual(canContinueStep5({ type: 'authenticated' }), true);
  assert.strictEqual(canContinueStep5({ type: 'notify', email: '', phone: '' }), false);
  assert.strictEqual(canContinueStep5({ type: 'notify', email: 'invalid-email', phone: '' }), false);
  assert.strictEqual(canContinueStep5({ type: 'notify', email: 'valid@example.com', phone: '' }), true);
  assert.strictEqual(canContinueStep5({ type: 'notify', email: '', phone: '09171234567' }), true);
  assert.strictEqual(canContinueStep5({ type: 'notify', email: '', phone: '12345' }), false);

  // Step 6: Consent required
  const canSubmitStep6 = (consentAccepted, isSubmitting) => Boolean(consentAccepted && !isSubmitting);
  assert.strictEqual(canSubmitStep6(false, false), false);
  assert.strictEqual(canSubmitStep6(true, true), false);
  assert.strictEqual(canSubmitStep6(true, false), true);
});

// ============================================================================
// FINAL SUMMARY
// ============================================================================
console.log('\n================================================================');
console.log(`TOTAL TESTS: ${totalTests}`);
console.log(`PASSED:      ${passCount}`);
console.log(`FAILED:      ${failCount}`);
console.log('================================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('ALL EMPIRICAL CHALLENGE TESTS PASSED PERFECTLY.');
  process.exit(0);
}
