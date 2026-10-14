import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Camera, CheckCircle, AlertCircle, 
  MapPin, Shield, HelpCircle, Save, Trash2
} from '../icons';

const PunchListMobile = ({ project, onBack }) => {
  const [items, setItems] = useState([
    { id: 1, label: 'Materials Match Design Spec', checked: false, issue: '' },
    { id: 2, label: 'Dimensions Match As-Built Plan', checked: false, issue: '' },
    { id: 3, label: 'Site Cleaned & Debris Removed', checked: false, issue: '' },
    { id: 4, label: 'Signage & Safety Markings Present', checked: false, issue: '' },
    { id: 5, label: 'Structural Soundness (Visual Check)', checked: false, issue: '' },
  ]);

  const [photos, setPhotos] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationVerified, setLocationVerified] = useState(false);

  // Simulate Geolocation for "Geotagging"
  useEffect(() => {
    const timer = setTimeout(() => setLocationVerified(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const toggleItem = (id) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const updateIssue = (id, text) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, issue: text } : item
    ));
  };

  const addPhoto = () => {
    const newPhoto = { id: Date.now(), url: 'https://images.unsplash.com/photo-1541888946425-d81bb19480c5?auto=format&fit=crop&q=80&w=400' };
    setPhotos([...photos, newPhoto]);
  };

  const calculateProgress = () => {
    const checked = items.filter(i => i.checked).length;
    return Math.round((checked / items.length) * 100);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Simulate API call to update project FQA status or record defects
    await new Promise(r => setTimeout(r, 1500));
    setIsSubmitting(false);
    alert('FQA Record Saved Successfully. Final handover triggered.');
    onBack();
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-indigo-900 text-white p-4 flex items-center shadow-lg">
        <button onClick={onBack} className="p-2 hover:bg-indigo-800 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <div className="ml-2">
          <h1 className="text-sm font-bold truncate max-w-[200px]">{project?.title || 'FQA Field Audit'}</h1>
          <p className="text-[10px] text-indigo-300 uppercase tracking-widest font-bold">Punch List Management</p>
        </div>
        <div className="ml-auto flex items-center space-x-2">
          {locationVerified ? (
            <div className="px-2 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] flex items-center">
              <MapPin size={10} className="mr-1" /> GEOTAGGED
            </div>
          ) : (
            <div className="px-2 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[10px] animate-pulse">
              SYNCING GPS...
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white p-4 border-b">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-tighter">Audit Progress</span>
          <span className="text-xs font-black text-indigo-600">{calculateProgress()}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div 
            className="bg-indigo-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${calculateProgress()}%` }}
          />
        </div>
      </div>

      {/* Audit Checklist */}
      <div className="p-4 space-y-4">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center">
          <Shield size={14} className="mr-2 text-indigo-500" /> Site Compliance List
        </h2>
        
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 flex items-start">
              <button 
                onClick={() => toggleItem(item.id)}
                className={`mt-1 flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                  item.checked ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'
                }`}
              >
                {item.checked && <CheckCircle size={14} className="text-white" />}
              </button>
              <div className="ml-3 flex-grow">
                <span className={`text-sm font-bold ${item.checked ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                  {item.label}
                </span>
                
                {!item.checked && (
                  <div className="mt-3">
                    <div className="flex items-center text-[10px] font-bold text-amber-600 uppercase mb-1">
                      <AlertCircle size={12} className="mr-1" /> Log Defect / Observation
                    </div>
                    <textarea 
                      placeholder="Specify issue found or notes..."
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none h-16"
                      value={item.issue}
                      onChange={(e) => updateIssue(item.id, e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Photo Evidence */}
      <div className="p-4 bg-slate-100/50">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center">
          <Camera size={14} className="mr-2 text-indigo-500" /> Evidence Uploads
        </h2>
        
        <div className="grid grid-cols-3 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-sm">
              <img src={photo.url} alt="Site" className="w-full h-full object-cover" />
              <button 
                onClick={() => setPhotos(photos.filter(p => p.id !== photo.id))}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full shadow-lg"
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}
          <button 
            onClick={addPhoto}
            className="aspect-square bg-white border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-400 transition-all"
          >
            <Camera size={24} className="mb-1" />
            <span className="text-[10px] font-bold">ADD PHOTO</span>
          </button>
        </div>
      </div>

      {/* Safety/Legal Disclaimer */}
      <div className="p-4 mx-4 mb-8 bg-amber-50 border border-amber-200 rounded-xl flex">
        <HelpCircle size={20} className="text-amber-500 flex-shrink-0" />
        <p className="ml-3 text-[10px] leading-relaxed text-amber-800 italic">
          By submitting this FQA punch list, you certify that the site visit was performed in person at the geotagged coordinates above. Falsification of audit records is subject to disciplinary action under the PULSO Legal Framework.
        </p>
      </div>

      {/* Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t flex space-x-4 shadow-2xl">
        <button 
          className="flex-1 bg-indigo-600 text-white font-black text-xs py-4 rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-transform flex items-center justify-center disabled:opacity-50"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'SYNCING DATA...' : (
            <>
              <Save size={16} className="mr-2" /> SUBMIT FINAL AUDIT
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PunchListMobile;
