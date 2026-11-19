// Compatibility exports for existing resident, public, and mobile map consumers.
export { default } from '../pages/resident/ResidentMapPage';
export { ALL_CALOOCAN_BARANGAYS_FOR_PICKER, ISSUE_CATEGORIES, CATEGORY_TILES, MAP_CATEGORIES, classifyTextToCategoryId, getReportCategoryMeta, matchesCategory, getCategoryColor, getCategoryIconComponent } from './maps/resident/residentMapCategories';
export { getDistance, formatDistance, getReportPhoto } from './maps/resident/residentMapUtils';
export { getMarkerSVG } from './maps/resident/residentMapMarkers';
