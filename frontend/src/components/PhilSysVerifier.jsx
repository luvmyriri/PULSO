import React, { useState, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// PhilSysVerifier.jsx
// PSA PhilSys Check — National ID Verification Component
//
// Features:
//   • Drag-and-drop or click-to-upload for PhilID front & back images
//   • Camera capture support (mobile + desktop)
//   • Manual override fields if OCR cannot read specific fields
//   • Real-time confidence score with animated gauge
//   • Full audit trail display (Audit ID, timestamp, PSN masked)
//   • Sandbox mode banner
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ── Helpers ──────────────────────────────────────────────────────────────────

const readFileAsDataURL = (file) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(file);
  });

const ScoreGauge = ({ score }) => {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color =
    score >= 80 ? '#10b981' :
    score >= 50 ? '#f59e0b' :
    '#ef4444';

  return (
    <div className="philsys-gauge-wrapper">
      <svg viewBox="0 0 120 120" className="philsys-gauge-svg">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div className="philsys-gauge-label" style={{ color }}>
        <span className="philsys-gauge-score">{score}</span>
        <span className="philsys-gauge-unit">/ 100</span>
      </div>
    </div>
  );
};

const UploadZone = ({ label, side, preview, onChange, onCamera }) => {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) onChange(file, side);
  }, [onChange, side]);

  return (
    <div
      className={`philsys-upload-zone ${dragging ? 'dragging' : ''} ${preview ? 'has-preview' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !preview && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => e.target.files[0] && onChange(e.target.files[0], side)}
      />
      {preview ? (
        <div className="philsys-preview-container">
          <img src={preview} alt={`${label} preview`} className="philsys-preview-img" />
          <div className="philsys-preview-overlay">
            <button
              className="philsys-replace-btn"
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            >🔄 Replace</button>
          </div>
          <div className="philsys-preview-badge">{label}</div>
        </div>
      ) : (
        <div className="philsys-upload-placeholder">
          <div className="philsys-upload-icon">
            {side === 'front' ? '🪪' : '↩️'}
          </div>
          <div className="philsys-upload-label">{label}</div>
          <div className="philsys-upload-hint">Drag & drop or click to upload</div>
          <div className="philsys-upload-formats">JPG, PNG, WebP</div>
          {onCamera && (
            <button
              className="philsys-camera-btn"
              onClick={(e) => { e.stopPropagation(); onCamera(side); }}
            >
              📷 Use Camera
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function PhilSysVerifier({ onVerified, onClose, embedded = false }) {
  const [frontFile, setFrontFile]     = useState(null);
  const [backFile, setBackFile]       = useState(null);
  const [frontPreview, setFrontPreview] = useState('');
  const [backPreview, setBackPreview]   = useState('');

  // Manual override fields
  const [showOverrides, setShowOverrides] = useState(false);
  const [overrides, setOverrides]         = useState({
    psn: '', last_name: '', first_name: '', dob: '', sex: '',
  });

  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState('');
  const [step, setStep]         = useState('upload'); // upload | verifying | result

  // Camera support
  const videoRef    = useRef();
  const [cameraOn, setCameraOn]    = useState(false);
  const [cameraSide, setCameraSide] = useState('front');
  const streamRef   = useRef(null);

  // ── File Handling ──────────────────────────────────────────────────────────

  const handleFileChange = async (file, side) => {
    const preview = await readFileAsDataURL(file);
    if (side === 'front') { setFrontFile(file); setFrontPreview(preview); }
    else                  { setBackFile(file);  setBackPreview(preview); }
    setResult(null);
    setError('');
  };

  // ── Camera Capture ─────────────────────────────────────────────────────────

  const openCamera = async (side) => {
    setCameraSide(side);
    setCameraOn(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (e) {
      setError('Camera access denied. Please upload an image instead.');
      setCameraOn(false);
    }
  };

  const capturePhoto = () => {
    const video  = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(async (blob) => {
      const file = new File([blob], `philid_${cameraSide}.jpg`, { type: 'image/jpeg' });
      await handleFileChange(file, cameraSide);
      closeCamera();
    }, 'image/jpeg', 0.92);
  };

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  // ── Verify ─────────────────────────────────────────────────────────────────

  const handleVerify = async () => {
    if (!frontFile) {
      setError('Please upload the front side of the PhilID.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setStep('verifying');

    const formData = new FormData();
    formData.append('idFront', frontFile);
    if (backFile) formData.append('idBack', backFile);

    // Append manual overrides if provided
    if (overrides.psn)        formData.append('override_psn',        overrides.psn);
    if (overrides.last_name)  formData.append('override_last_name',  overrides.last_name);
    if (overrides.first_name) formData.append('override_first_name', overrides.first_name);
    if (overrides.dob)        formData.append('override_dob',        overrides.dob);
    if (overrides.sex)        formData.append('override_sex',        overrides.sex);

    try {
      const token = localStorage.getItem('token');
      const resp  = await fetch(`${API_BASE}/api/philsys/verify`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body:   formData,
      });

      const data = await resp.json();
      setResult(data);
      setStep('result');

      if (data.verified && onVerified) {
        onVerified(data);
      }
    } catch (e) {
      setError(`Connection error: ${e.message}`);
      setStep('upload');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFrontFile(null); setBackFile(null);
    setFrontPreview(''); setBackPreview('');
    setResult(null); setError('');
    setOverrides({ psn: '', last_name: '', first_name: '', dob: '', sex: '' });
    setShowOverrides(false);
    setStep('upload');
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={`philsys-wrapper ${embedded ? 'philsys-embedded' : 'philsys-modal'}`}>
      <style>{PHILSYS_STYLES}</style>

      {/* Header */}
      <div className="philsys-header">
        <div className="philsys-header-left">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Bagong_Pilipinas_logo_2024.png/240px-Bagong_Pilipinas_logo_2024.png"
            alt="PSA"
            className="philsys-psa-logo"
            onError={(e) => e.target.style.display='none'}
          />
          <div>
            <div className="philsys-title">PhilSys Check</div>
            <div className="philsys-subtitle">Philippine National ID Authentication</div>
          </div>
        </div>
        {onClose && (
          <button className="philsys-close-btn" onClick={onClose} aria-label="Close">✕</button>
        )}
      </div>

      {/* Sandbox Banner */}
      {result?.sandbox_mode !== false && (
        <div className="philsys-sandbox-banner">
          <span>🔬</span>
          <span><strong>Sandbox Mode</strong> — Mock verification active. Submit API credential request to PSA to enable live verification.</span>
        </div>
      )}

      {/* Camera Modal */}
      {cameraOn && (
        <div className="philsys-camera-modal">
          <div className="philsys-camera-inner">
            <div className="philsys-camera-title">📷 Capture PhilID {cameraSide === 'front' ? 'Front' : 'Back'}</div>
            <video ref={videoRef} autoPlay playsInline className="philsys-camera-video" />
            <div className="philsys-camera-guide">
              <div className="philsys-camera-frame" />
            </div>
            <div className="philsys-camera-actions">
              <div className="philsys-camera-advice">
                💡 <strong>Early Advice:</strong> Please ensure the ID is centered and reflect-free. 
                Verify all results manually after capture.
              </div>
              <div className="philsys-camera-btns">
                <button className="philsys-btn philsys-btn-secondary" onClick={closeCamera}>Cancel</button>
                <button className="philsys-btn philsys-btn-capture" onClick={capturePhoto}>📸 Capture</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="philsys-body">
        
        {/* Early Advice Banner (Always visible at start/result) */}
        {(step === 'upload' || step === 'result') && (
          <div className="philsys-early-advice">
            <div className="philsys-advice-header">
              <span className="philsys-advice-badge">DEVELOPMENTAL ADVICE</span>
              <span className="philsys-advice-status">EXPERIMENTAL OCR v1.2</span>
            </div>
            <p className="philsys-advice-text">
              The AI verification engine is currently in <strong>Active Development</strong>. 
              Users are advised to <strong>manually audit</strong> all extracted information. 
              Do not rely on this automated scan for final record-keeping without verification.
            </p>
          </div>
        )}

        {/* ── UPLOAD STEP ──────────────────────────────────────────── */}
        {step === 'upload' && (
          <>
            <div className="philsys-step-label">
              <span className="philsys-step-num">1</span>
              Upload PhilID Images
            </div>


            <div className="philsys-upload-grid">
              <UploadZone
                label="Front Side (Required)"
                side="front"
                preview={frontPreview}
                onChange={handleFileChange}
                onCamera={openCamera}
              />
              <UploadZone
                label="Back Side (Recommended)"
                side="back"
                preview={backPreview}
                onChange={handleFileChange}
                onCamera={openCamera}
              />
            </div>

            <div className="philsys-tips">
              <div className="philsys-tip">✅ Ensure the ID is flat and well-lit</div>
              <div className="philsys-tip">✅ All 4 corners of the card must be visible</div>
              <div className="philsys-tip">⚠️ Avoid glare, blur, or excessive shadows</div>
            </div>

            {/* Manual Override (Collapsible) */}
            <div className="philsys-override-toggle" onClick={() => setShowOverrides(!showOverrides)}>
              <span>{showOverrides ? '▼' : '▶'}</span>
              OCR will automatically read your ID. If fields are not detected, you may enter them manually here.
            </div>

            {showOverrides && (
              <div className="philsys-override-grid">
                <div className="philsys-step-label" style={{ marginBottom: '12px' }}>
                  <span className="philsys-step-num">2</span>
                  Manual Override (Optional)
                </div>
                {[
                  { key: 'psn', label: 'PhilSys Number (PSN)',     placeholder: 'XXXX-XXXX-XXXX-XXXX' },
                  { key: 'last_name',  label: 'Last Name',          placeholder: 'e.g., DELA CRUZ' },
                  { key: 'first_name', label: 'First Name',         placeholder: 'e.g., JUAN' },
                  { key: 'dob',        label: 'Date of Birth',      placeholder: 'YYYY-MM-DD' },
                  { key: 'sex',        label: 'Sex',                placeholder: 'M or F' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key} className="philsys-field-group">
                    <label className="philsys-field-label">{label}</label>
                    <input
                      className="philsys-field-input"
                      value={overrides[key]}
                      placeholder={placeholder}
                      onChange={(e) => setOverrides((prev) => ({ ...prev, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            )}

            {error && <div className="philsys-error">{error}</div>}

            <button
              className={`philsys-btn philsys-btn-primary ${loading ? 'loading' : ''}`}
              onClick={handleVerify}
              disabled={loading || !frontFile}
            >
              {loading ? (
                <><span className="philsys-spinner" />Verifying Identity...</>
              ) : (
                <>🔐 Verify PhilID with PhilSys Check</>
              )}
            </button>
          </>
        )}

        {/* ── VERIFYING STEP ───────────────────────────────────────── */}
        {step === 'verifying' && (
          <div className="philsys-verifying">
            <div className="philsys-verifying-animation">
              <div className="philsys-pulse-ring" />
              <div className="philsys-pulse-ring philsys-pulse-ring-2" />
              <div className="philsys-id-icon">🪪</div>
            </div>
            <div className="philsys-verifying-title">Verifying Identity</div>
            <div className="philsys-verifying-steps">
              <div className="philsys-vstep philsys-vstep-active">📷 Reading ID with AI OCR...</div>
              <div className="philsys-vstep">🔗 Matching with PhilSys Registry...</div>
              <div className="philsys-vstep">✅ Generating Audit Trail...</div>
            </div>
          </div>
        )}

        {/* ── RESULT STEP ──────────────────────────────────────────── */}
        {step === 'result' && result && (
          <div className="philsys-result">

            {/* Main Result Card */}
            <div className={`philsys-result-card ${result.verified ? 'verified' : 'failed'}`}>
              <div className="philsys-result-icon">
                {result.verified ? '✅' : '❌'}
              </div>
              <div className="philsys-result-status">
                {result.verified ? 'Identity Verified' : 'Verification Failed'}
              </div>
              <div className="philsys-result-message">{result.message}</div>

              {/* Score Gauge */}
              <ScoreGauge score={result.score || 0} />
              <div className="philsys-score-label">Confidence Score</div>
            </div>

            {/* OCR Data Display */}
            {result.ocr_data && (
              <div className="philsys-ocr-data">
                <div className="philsys-section-title">📋 Extracted ID Data</div>
                <div className="philsys-data-grid">
                  {[
                    { label: 'PSN (Masked)',  value: result.ocr_data.psn_masked },
                    { label: 'Last Name',     value: result.ocr_data.last_name },
                    { label: 'First Name',    value: result.ocr_data.first_name },
                    { label: 'Middle Name',   value: result.ocr_data.middle_name || '—' },
                    { label: 'Date of Birth', value: result.ocr_data.dob },
                    { label: 'Sex',           value: result.ocr_data.sex === 'M' ? 'Male' : result.ocr_data.sex === 'F' ? 'Female' : '—' },
                    { label: 'Blood Type',    value: result.ocr_data.blood_type || '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="philsys-data-item">
                      <span className="philsys-data-label">{label}</span>
                      <span className="philsys-data-value">{value || '—'}</span>
                    </div>
                  ))}
                </div>
                {result.ocr_data.address && (
                  <div className="philsys-data-address">
                    <span className="philsys-data-label">Address</span>
                    <span className="philsys-data-value">{result.ocr_data.address}</span>
                  </div>
                )}
              </div>
            )}

            {/* Issues (if any) */}
            {result.issues?.length > 0 && (
              <div className="philsys-issues">
                <div className="philsys-section-title">⚠️ Verification Issues</div>
                {result.issues.map((issue, i) => (
                  <div key={i} className="philsys-issue-item">• {issue}</div>
                ))}
              </div>
            )}

            {/* Audit Trail */}
            <div className="philsys-audit">
              <div className="philsys-section-title">🔍 Audit Trail</div>
              <div className="philsys-audit-row">
                <span>Audit ID</span>
                <span className="philsys-audit-value">{result.audit_id}</span>
              </div>
              <div className="philsys-audit-row">
                <span>Timestamp</span>
                <span className="philsys-audit-value">{new Date(result.timestamp).toLocaleString('en-PH')}</span>
              </div>
              <div className="philsys-audit-row">
                <span>Duration</span>
                <span className="philsys-audit-value">{result.duration_ms}ms</span>
              </div>
              <div className="philsys-audit-row">
                <span>Mode</span>
                <span className={`philsys-mode-badge ${result.sandbox_mode ? 'sandbox' : 'live'}`}>
                  {result.sandbox_mode ? '🔬 Sandbox' : '🟢 Live'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="philsys-result-actions">
              <button className="philsys-btn philsys-btn-secondary" onClick={handleReset}>
                🔄 Verify Another ID
              </button>
              {result.verified && onVerified && (
                <button className="philsys-btn philsys-btn-primary" onClick={() => onVerified(result)}>
                  ✅ Proceed
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles (scoped via class prefix)
// ─────────────────────────────────────────────────────────────────────────────

const PHILSYS_STYLES = `
/* ── Layout ───────────────────────────────────────────────── */
.philsys-wrapper {
  font-family: 'Inter', -apple-system, sans-serif;
  color: #e2e8f0;
  background: #0f172a;
  border-radius: 20px;
  overflow: hidden;
}
.philsys-modal {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; flex-direction: column;
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(12px);
  align-items: center; justify-content: center;
}
.philsys-embedded {
  width: 100%; max-width: 750px; margin: 0 auto;
  box-shadow: 0 25px 60px rgba(0,0,0,0.5);
}

/* ── Header ───────────────────────────────────────────────── */
.philsys-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px;
  background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #0c4a6e 100%);
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.philsys-header-left { display: flex; align-items: center; gap: 14px; }
.philsys-psa-logo { width: 40px; height: 40px; object-fit: contain; filter: brightness(1.2); }
.philsys-title { font-size: 18px; font-weight: 800; color: #fff; letter-spacing: -0.02em; }
.philsys-subtitle { font-size: 11px; color: rgba(255,255,255,0.7); margin-top: 2px; }
.philsys-close-btn {
  background: rgba(255,255,255,0.15); border: none; color: #fff;
  width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 14px;
  transition: background 0.2s;
}
.philsys-close-btn:hover { background: rgba(255,255,255,0.3); }

/* ── Sandbox Banner ────────────────────────────────────────── */
.philsys-sandbox-banner {
  display: flex; gap: 10px; align-items: center;
  background: rgba(245, 158, 11, 0.15); border-bottom: 1px solid rgba(245,158,11,0.3);
  padding: 10px 20px; font-size: 12px; color: #fbbf24;
}

/* ── Body ─────────────────────────────────────────────────── */
.philsys-body {
  padding: 24px;
  overflow-y: auto;
  max-height: calc(90vh - 100px);
}

/* ── Step Labels ──────────────────────────────────────────── */
.philsys-step-label {
  display: flex; align-items: center; gap: 10px;
  font-size: 14px; font-weight: 700; color: #94a3b8;
  text-transform: uppercase; letter-spacing: 0.08em;
  margin-bottom: 16px;
}
.philsys-step-num {
  width: 24px; height: 24px; border-radius: 50%;
  background: #3b82f6; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 800; flex-shrink: 0;
}

/* ── Upload Zones ─────────────────────────────────────────── */
.philsys-upload-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
  margin-bottom: 20px;
}
@media (max-width: 500px) { .philsys-upload-grid { grid-template-columns: 1fr; } }
.philsys-upload-zone {
  border: 2px dashed rgba(59,130,246,0.4);
  border-radius: 16px; min-height: 180px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.2s;
  background: rgba(59,130,246,0.05);
  position: relative; overflow: hidden;
}
.philsys-upload-zone:hover, .philsys-upload-zone.dragging {
  border-color: #3b82f6; background: rgba(59,130,246,0.12);
  transform: scale(1.01);
}
.philsys-upload-zone.has-preview { cursor: default; border-style: solid; border-color: rgba(59,130,246,0.6); }
.philsys-upload-placeholder { text-align: center; padding: 20px; }
.philsys-upload-icon { font-size: 40px; margin-bottom: 8px; }
.philsys-upload-label { font-size: 14px; font-weight: 600; color: #cbd5e1; }
.philsys-upload-hint { font-size: 11px; color: #64748b; margin-top: 4px; }
.philsys-upload-formats { font-size: 10px; color: #475569; margin-top: 4px; }
.philsys-camera-btn {
  display: inline-block; margin-top: 10px;
  background: rgba(59,130,246,0.2); border: 1px solid rgba(59,130,246,0.4);
  color: #93c5fd; border-radius: 8px; padding: 6px 14px;
  font-size: 12px; cursor: pointer; transition: background 0.2s;
}
.philsys-camera-btn:hover { background: rgba(59,130,246,0.35); }
.philsys-preview-container { width: 100%; height: 100%; position: relative; }
.philsys-preview-img { width: 100%; height: 180px; object-fit: cover; }
.philsys-preview-overlay {
  position: absolute; inset: 0; background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.2s;
}
.philsys-preview-container:hover .philsys-preview-overlay { opacity: 1; }
.philsys-replace-btn {
  background: rgba(59,130,246,0.9); border: none; color: #fff;
  padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px;
}
.philsys-preview-badge {
  position: absolute; bottom: 8px; left: 8px;
  background: rgba(0,0,0,0.7); color: #93c5fd;
  font-size: 10px; padding: 3px 8px; border-radius: 6px; font-weight: 600;
}

/* ── Tips ─────────────────────────────────────────────────── */
.philsys-tips { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
.philsys-tip { font-size: 11px; color: #94a3b8; }

/* ── Override Fields ──────────────────────────────────────── */
.philsys-override-toggle {
  display: flex; gap: 8px; align-items: flex-start;
  font-size: 11px; color: #64748b; cursor: pointer;
  padding: 10px; border-radius: 8px; margin-bottom: 12px;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
  transition: background 0.2s;
}
.philsys-override-toggle:hover { background: rgba(255,255,255,0.06); color: #94a3b8; }
.philsys-override-grid {
  background: rgba(15,23,42,0.8); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; padding: 18px; margin-bottom: 16px;
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
}
@media (max-width: 500px) { .philsys-override-grid { grid-template-columns: 1fr; } }
.philsys-field-group { display: flex; flex-direction: column; gap: 5px; }
.philsys-field-label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
.philsys-field-input {
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px; padding: 8px 12px; color: #e2e8f0; font-size: 13px;
  outline: none; transition: border-color 0.2s;
}
.philsys-field-input:focus { border-color: #3b82f6; }
.philsys-field-input::placeholder { color: #475569; }

/* ── Error ────────────────────────────────────────────────── */
.philsys-error {
  background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3);
  color: #fca5a5; border-radius: 10px; padding: 12px 16px;
  font-size: 13px; margin-bottom: 16px;
}

/* ── Buttons ──────────────────────────────────────────────── */
.philsys-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 13px 28px; border-radius: 12px; border: none;
  font-size: 14px; font-weight: 700; cursor: pointer;
  transition: all 0.2s; width: 100%; justify-content: center;
}
.philsys-btn-primary {
  background: linear-gradient(135deg, #1d4ed8, #2563eb);
  color: #fff; box-shadow: 0 4px 20px rgba(37,99,235,0.4);
}
.philsys-btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 25px rgba(37,99,235,0.6); }
.philsys-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.philsys-btn-primary.loading { background: linear-gradient(135deg, #1e3a8a, #1d4ed8); }
.philsys-btn-secondary {
  background: rgba(255,255,255,0.08); color: #94a3b8; border: 1px solid rgba(255,255,255,0.12);
}
.philsys-btn-secondary:hover { background: rgba(255,255,255,0.14); }

/* ── Spinner ──────────────────────────────────────────────── */
.philsys-spinner {
  width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff; border-radius: 50%;
  animation: philsys-spin 0.7s linear infinite;
}
@keyframes philsys-spin { to { transform: rotate(360deg); } }

/* ── Verifying Animation ──────────────────────────────────── */
.philsys-verifying {
  display: flex; flex-direction: column; align-items: center;
  gap: 24px; padding: 40px 20px;
}
.philsys-verifying-animation { position: relative; width: 100px; height: 100px; }
.philsys-pulse-ring {
  position: absolute; inset: 0; border-radius: 50%;
  border: 3px solid #3b82f6;
  animation: philsys-pulse 2s ease-out infinite;
}
.philsys-pulse-ring-2 { animation-delay: 0.7s; }
@keyframes philsys-pulse {
  0%   { transform: scale(0.5); opacity: 1; }
  100% { transform: scale(1.5); opacity: 0; }
}
.philsys-id-icon {
  position: absolute; inset: 0; display: flex;
  align-items: center; justify-content: center; font-size: 40px;
}
.philsys-verifying-title { font-size: 20px; font-weight: 800; color: #e2e8f0; }
.philsys-verifying-steps { display: flex; flex-direction: column; gap: 10px; }
.philsys-vstep { font-size: 13px; color: #475569; }
.philsys-vstep-active { color: #60a5fa; animation: philsys-blink 1s infinite; }
@keyframes philsys-blink { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

/* ── Result Card ──────────────────────────────────────────── */
.philsys-result-card {
  border-radius: 16px; padding: 28px;
  text-align: center; margin-bottom: 20px;
  border: 1px solid;
}
.philsys-result-card.verified {
  background: linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.1));
  border-color: rgba(16,185,129,0.4);
}
.philsys-result-card.failed {
  background: linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.1));
  border-color: rgba(239,68,68,0.4);
}
.philsys-result-icon { font-size: 48px; margin-bottom: 8px; }
.philsys-result-status { font-size: 22px; font-weight: 900; color: #f1f5f9; margin-bottom: 8px; }
.philsys-result-message { font-size: 13px; color: #94a3b8; margin-bottom: 20px; line-height: 1.5; }
.philsys-score-label { font-size: 11px; color: #64748b; margin-top: 4px; }

/* ── Gauge ────────────────────────────────────────────────── */
.philsys-gauge-wrapper { position: relative; width: 120px; height: 120px; margin: 0 auto; }
.philsys-gauge-svg { width: 120px; height: 120px; }
.philsys-gauge-label {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
}
.philsys-gauge-score { font-size: 28px; font-weight: 900; line-height: 1; }
.philsys-gauge-unit { font-size: 11px; color: #64748b; }

/* ── OCR Data ─────────────────────────────────────────────── */
.philsys-ocr-data, .philsys-issues, .philsys-audit {
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; padding: 18px; margin-bottom: 16px;
}
.philsys-section-title { font-size: 12px; font-weight: 700; color: #64748b;
  text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 14px; }
.philsys-data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.philsys-data-item { display: flex; flex-direction: column; gap: 2px; }
.philsys-data-address { margin-top: 10px; display: flex; flex-direction: column; gap: 2px; }
.philsys-data-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
.philsys-data-value { font-size: 13px; color: #cbd5e1; font-weight: 500; }

/* ── Issues ───────────────────────────────────────────────── */
.philsys-issue-item { font-size: 13px; color: #fca5a5; padding: 4px 0; }

/* ── Audit ────────────────────────────────────────────────── */
.philsys-audit-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 12px; color: #64748b;
}
.philsys-audit-row:last-child { border-bottom: none; }
.philsys-audit-value { font-family: monospace; color: #93c5fd; font-size: 11px; }
.philsys-mode-badge {
  padding: 3px 10px; border-radius: 999px; font-size: 10px; font-weight: 700;
}
.philsys-mode-badge.sandbox { background: rgba(245,158,11,0.2); color: #fbbf24; }
.philsys-mode-badge.live { background: rgba(16,185,129,0.2); color: #34d399; }

/* ── Result Actions ───────────────────────────────────────── */
.philsys-result-actions { display: flex; gap: 12px; flex-wrap: wrap; }
.philsys-result-actions .philsys-btn { flex: 1; }

/* ── Camera Modal ─────────────────────────────────────────── */
.philsys-camera-modal {
  position: fixed; inset: 0; z-index: 10000;
  background: rgba(0,0,0,0.95);
  display: flex; align-items: center; justify-content: center;
}
.philsys-camera-inner {
  display: flex; flex-direction: column; align-items: center; gap: 20px;
  width: 100%; max-width: 480px; padding: 24px;
}
.philsys-camera-title { font-size: 18px; font-weight: 700; color: #e2e8f0; }
.philsys-camera-video { width: 100%; border-radius: 16px; max-height: 60vh; }
.philsys-camera-actions { display: flex; gap: 16px; width: 100%; }
.philsys-btn-capture {
  flex: 2; background: linear-gradient(135deg, #16a085, #1abc9c);
  color: #fff; font-weight: 800; font-size: 16px;
  padding: 14px; border-radius: 12px; border: none; cursor: pointer;
}

/* ── Early Advice Banner ─────────────────────────────────── */
.philsys-early-advice {
  background: linear-gradient(to right, rgba(245, 158, 11, 0.12), rgba(245, 158, 11, 0.05));
  border-left: 4px solid #f59e0b;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
}
.philsys-advice-header {
  display: flex; gap: 8px; align-items: center; margin-bottom: 8px;
}
.philsys-advice-badge {
  font-size: 10px; font-weight: 900; background: #f59e0b; color: #000;
  padding: 2px 8px; border-radius: 4px; letter-spacing: 0.05em;
}
.philsys-advice-status {
  font-size: 10px; font-weight: 700; color: #64748b;
}
.philsys-advice-text {
  font-size: 12px; color: #cbd5e1; line-height: 1.6; margin: 0;
}
.philsys-advice-text strong { color: #fbbf24; }

/* ── Camera Advice ────────────────────────────────────────── */
.philsys-camera-advice {
  width: 100%; transition: all 0.3s;
  background: rgba(0,0,0,0.6); backdrop-filter: blur(8px);
  border: 1px solid rgba(245, 158, 11, 0.3);
  padding: 12px 16px; border-radius: 10px;
  font-size: 12px; color: #fbbf24; text-align: left;
  margin-bottom: 12px; line-height: 1.4;
}
.philsys-camera-btns { display: flex; gap: 16px; width: 100%; }
.philsys-camera-actions { flex-direction: column; width: 100%; }

/* ── Legacy Disclaimer (Deprecated) ───────────────────────── */
.philsys-disclaimer { display: none; }
`;

