/// location_service.dart
/// PULSO Mobile — GPS + reverse geocoding via the backend proxy.
///
/// Uses geolocator for live device location and calls our FastAPI
/// /api/geocode/reverse endpoint so the Google Maps key stays server-side.

import 'package:geolocator/geolocator.dart';
import 'package:mobile_app/core/api/api_client.dart';

class LocationService {
  final ApiClient _api;

  LocationService(this._api);

  // ─── GPS ─────────────────────────────────────────────────────────────────

  /// Request permissions and return the current device position.
  /// Throws a [String] error message if permission is denied or unavailable.
  Future<Position> getCurrentPosition() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw 'Location services are disabled. Please enable GPS.';
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        throw 'Location permission denied.';
      }
    }

    if (permission == LocationPermission.deniedForever) {
      throw 'Location permission permanently denied. Please enable it in Settings.';
    }

    return Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
      timeLimit: const Duration(seconds: 10),
    );
  }

  /// Returns a live stream of position updates (for tracking).
  Stream<Position> getPositionStream() {
    const settings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 10, // emit update every 10 m
    );
    return Geolocator.getPositionStream(locationSettings: settings);
  }

  // ─── Reverse Geocoding ───────────────────────────────────────────────────

  /// Convert GPS coordinates to a human-readable address via the PULSO backend.
  /// Returns a fallback coordinate string on any error.
  Future<String> reverseGeocode(double lat, double lng, String token) async {
    try {
      final response = await _api.get(
        '/api/geocode/reverse',
        queryParameters: {'lat': lat, 'lng': lng},
        token: token,
      );
      return response.data['address'] as String? ?? '$lat, $lng';
    } catch (_) {
      return '${lat.toStringAsFixed(5)}, ${lng.toStringAsFixed(5)}';
    }
  }

  // ─── Forward / Place Search ──────────────────────────────────────────────

  /// Search for places by text query. Returns list of result maps.
  Future<List<Map<String, dynamic>>> searchPlaces(String query, String token) async {
    if (query.trim().length < 2) return [];
    try {
      final response = await _api.get(
        '/api/geocode/search',
        queryParameters: {'q': query},
        token: token,
      );
      final results = response.data['results'] as List? ?? [];
      return results.map((r) => Map<String, dynamic>.from(r as Map)).toList();
    } catch (_) {
      return [];
    }
  }
}
