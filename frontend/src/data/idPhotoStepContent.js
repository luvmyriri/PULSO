/**
 * idPhotoStepContent.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized plain-language copy for the PULSO "Front & Back Photos" step
 * (Account Registration, Step 2 of 5).
 * All texts kept in one file for easy Filipino (Tagalog) localization.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const ID_PHOTO_CONTENT = {
  stepTitle: 'Front & Back Photos',
  supportingIdTitle: 'Supporting Second ID',
  stepSubtitle: 'Take or upload a photo of the front and back of your',
  secondIdSubtitle: 'Pairing with your',
  secondIdTag: 'Fast-Track 2nd ID',
  frontDefaultTitle: "Front of your Voter's ID / Cert",
  frontDefaultHint: 'The side with your photo and full name.',
  backDefaultTitle: "Back of your Voter's ID / Cert",
  backDefaultHint: 'The side with the barcode and signature.',
  photoAdded: 'Photo added',
  viewPhotoTip: 'Tap View Photo to check it.',
  buttons: {
    takePhoto: 'Take Photo',
    upload: 'Upload',
    retake: 'Retake',
    replace: 'Replace',
    viewPhoto: 'View Photo',
    removePhoto: 'Remove photo',
    close: 'Close',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    reset: 'Reset'
  },
  viewer: {
    frontTitle: 'Front of ID',
    backTitle: 'Back of ID',
    secondFrontTitle: '2nd ID - Front',
    secondBackTitle: '2nd ID - Back',
    tapZoomInTip: 'Tap the photo to zoom in.',
    tapZoomOutTip: 'Tap again to zoom out.',
    frontAlt: "Front of your Voter's ID",
    backAlt: "Back of your Voter's ID"
  },
  errors: {
    invalidFileType: 'That file is not a photo. Please pick a photo.',
    fileTooLarge: 'That photo is too large. Please pick a photo under 10 MB.',
    cameraNotAllowed: 'Camera access was denied. Please allow camera or use Upload.'
  },
  announcements: {
    frontAdded: 'Front of ID photo added.',
    backAdded: 'Back of ID photo added.'
  },
  snackbar: {
    frontUploaded: 'Front photo uploaded successfully.',
    backUploaded: 'Back photo uploaded successfully.',
    secondFrontUploaded: '2nd ID front photo uploaded successfully.',
    secondBackUploaded: '2nd ID back photo uploaded successfully.',
    frontRemoved: 'Front photo removed.',
    backRemoved: 'Back photo removed.',
    secondFrontRemoved: '2nd ID front photo removed.',
    secondBackRemoved: '2nd ID back photo removed.'
  }
};

export default ID_PHOTO_CONTENT;
