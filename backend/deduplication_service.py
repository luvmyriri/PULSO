import numpy as np
from sklearn.cluster import DBSCAN
from haversine import haversine, Unit
from typing import List, Dict, Any, Tuple
import math

def cluster_reports(reports: List[Dict[str, Any]], epsilon_meters: float = 10.0) -> List[Dict[str, Any]]:
    """
    Groups reports using DBSCAN based on GPS coordinates.
    epsilon_meters: The distance threshold for clustering in meters (default 10m).
    
    Each report in the input list must have 'latitude' and 'longitude'.
    Returns the list of reports with an added 'cluster_id' and 'is_core' flag.
    """
    if not reports:
        return []

    # Prepare coordinates for DBSCAN
    coords = np.array([[r['latitude'], r['longitude']] for r in reports])
    
    # DBSCAN uses radians for haversine metric
    # Epsilon needs to be converted from meters to radians
    # Earth radius ~ 6,371,000 meters
    kms_per_radian = 6371.0
    epsilon_radians = (epsilon_meters / 1000.0) / kms_per_radian

    # Perform clustering
    # metric='haversine' expects [lat, lon] in radians
    coords_rad = np.radians(coords)
    db = DBSCAN(eps=epsilon_radians, min_samples=1, metric='haversine').fit(coords_rad)
    
    labels = db.labels_
    
    # Attach labels to reports
    for i, report in enumerate(reports):
        report['cluster_id'] = int(labels[i])
        # A cluster_id of -1 means noise in standard DBSCAN, 
        # but with min_samples=1, everyone gets a cluster.
        
    return reports

def get_hotspots(reports: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Aggregates clustered reports into logical Hotspots.
    Returns a list of hotspots with representative labels and weights.
    """
    clusters = {}
    for r in reports:
        cid = r['cluster_id']
        if cid not in clusters:
            clusters[cid] = []
        clusters[cid].append(r)
        
    hotspots = []
    for cid, member_reports in clusters.items():
        # Calculate centroid
        lats = [r['latitude'] for r in member_reports]
        lons = [r['longitude'] for r in member_reports]
        
        # Simple average (fine for small clusters)
        center_lat = sum(lats) / len(lats)
        center_lon = sum(lons) / len(lons)
        
        # Max severity
        max_severity = max([r.get('severity_score', 0.0) for r in member_reports])
        
        hotspots.append({
            'cluster_id': cid,
            'latitude': center_lat,
            'longitude': center_lon,
            'report_count': len(member_reports),
            'max_severity': max_severity,
            'category': member_reports[0].get('category', 'Unknown'), # Take first as representative
            'reports': [r.get('id') for r in member_reports]
        })
        
    return hotspots
