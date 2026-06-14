import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:dio/dio.dart';
import 'package:pulso_mobile/core/api/api_client.dart';
import 'package:pulso_mobile/core/api/api_endpoints.dart';
import 'package:pulso_mobile/core/services/location_service.dart';

class AgentProvider extends ChangeNotifier {
  final ApiClient _api = ApiClient();
  final LocationService _locationService = LocationService(ApiClient());

  List<Map<String, dynamic>> _myWorkOrders = [];
  Map<String, dynamic>? _currentLocation;
  Map<String, dynamic>? _userProfile;
  String _agentStatus = 'available';
  Timer? _locationUpdateTimer;
  bool _isTracking = false;
  bool _isLoadingOrders = false;
  bool _isSubmittingReport = false;

  List<Map<String, dynamic>> get myWorkOrders => _myWorkOrders;
  Map<String, dynamic>? get currentLocation => _currentLocation;
  Map<String, dynamic>? get userProfile => _userProfile;
  String get agentStatus => _agentStatus;
  bool get isTracking => _isTracking;
  bool get isLoadingOrders => _isLoadingOrders;
  bool get isSubmittingReport => _isSubmittingReport;

  /// Load the agent's own assigned work orders (uses the new self-service endpoint)
  Future<void> loadMyWorkOrders() async {
    _isLoadingOrders = true;
    notifyListeners();
    try {
      final token = await ApiClient.getToken();
      final response = await _api.get(
        ApiEndpoints.agentMyWorkOrders,
        token: token,
      );

      final List<dynamic> orders = response.data as List<dynamic>? ?? [];
      _myWorkOrders = orders.map((o) => Map<String, dynamic>.from(o as Map)).toList();
    } catch (e) {
      debugPrint('Error loading work orders: $e');
    } finally {
      _isLoadingOrders = false;
      notifyListeners();
    }
  }

  /// Load user profile from /api/me
  Future<void> loadProfile() async {
    try {
      final token = await ApiClient.getToken();
      final response = await _api.get(ApiEndpoints.me, token: token);
      _userProfile = Map<String, dynamic>.from(response.data as Map);
      notifyListeners();
    } catch (e) {
      debugPrint('Error loading profile: $e');
    }
  }

  /// Submit a field report from the agent app (Now supports Multi-part for photos)
  Future<Map<String, dynamic>> submitFieldReport({
    required String category,
    required String description,
    double? latitude,
    double? longitude,
    String? locationString,
    int? workOrderId,
    File? imageFile,
  }) async {
    _isSubmittingReport = true;
    notifyListeners();
    try {
      double lat = latitude ?? _currentLocation?['latitude'] ?? 14.6507;
      double lng = longitude ?? _currentLocation?['longitude'] ?? 120.9841;

      final token = await ApiClient.getToken();
      
      dynamic requestData;
      if (imageFile != null) {
        requestData = FormData.fromMap({
          'category': category,
          'description': description,
          'latitude': lat.toString(),
          'longitude': lng.toString(),
          'location_string': locationString ?? '$lat, $lng',
          if (workOrderId != null) 'work_order_id': workOrderId.toString(),
          'image': await MultipartFile.fromFile(
            imageFile.path,
            filename: 'agent_report_${DateTime.now().millisecondsSinceEpoch}.jpg',
          ),
        });
      } else {
        requestData = {
          'category': category,
          'description': description,
          'latitude': lat,
          'longitude': lng,
          'location_string': locationString ?? '$lat, $lng',
          if (workOrderId != null) 'work_order_id': workOrderId,
        };
      }

      final response = await _api.post(
        ApiEndpoints.agentFieldReport,
        data: requestData,
        token: token,
      );

      return Map<String, dynamic>.from(response.data as Map);
    } catch (e) {
      debugPrint('Error submitting field report: $e');
      return {'success': false, 'message': 'Failed to submit report: $e'};
    } finally {
      _isSubmittingReport = false;
      notifyListeners();
    }
  }

  /// Update a work order's status (assigned → in_progress → completed)
  Future<Map<String, dynamic>> updateWorkOrderStatus(int woId, String status, {String? notes}) async {
    try {
      final token = await ApiClient.getToken();
      final response = await _api.patch(
        ApiEndpoints.agentWOStatus(woId),
        data: {
          'status': status,
          if (notes != null) 'notes': notes,
        },
        token: token,
      );
      // Refresh the list after status change
      await loadMyWorkOrders();
      return Map<String, dynamic>.from(response.data as Map);
    } catch (e) {
      debugPrint('Error updating work order status: $e');
      return {'success': false, 'message': 'Failed to update: $e'};
    }
  }

  Future<void> startTracking() async {
    if (_isTracking) return;

    try {
      final position = await _locationService.getCurrentPosition();
      await _updateLocation(position);

      _locationUpdateTimer = Timer.periodic(
        const Duration(seconds: 30),
        (_) => _periodicLocationUpdate(),
      );
      _isTracking = true;
      notifyListeners();
    } catch (e) {
      debugPrint('Error starting tracking: $e');
    }
  }

  Future<void> stopTracking() async {
    _locationUpdateTimer?.cancel();
    _locationUpdateTimer = null;
    _isTracking = false;
    await _updateStatus('offline');
    notifyListeners();
  }

  Future<void> _periodicLocationUpdate() async {
    try {
      final position = await _locationService.getCurrentPosition();
      await _updateLocation(position);
    } catch (e) {
      debugPrint('Periodic location update error: $e');
    }
  }

  Future<void> _updateLocation(Position position) async {
    try {
      final token = await ApiClient.getToken();
      await _api.post(
        ApiEndpoints.agentLocation,
        data: {
          'latitude': position.latitude,
          'longitude': position.longitude,
          'status': _agentStatus,
          'accuracy': position.accuracy,
          'battery_level': 80,
          'location_name':
              '${position.latitude.toStringAsFixed(5)}, ${position.longitude.toStringAsFixed(5)}',
        },
        token: token,
      );

      _currentLocation = {
        'latitude': position.latitude,
        'longitude': position.longitude,
        'accuracy': position.accuracy,
      };
      notifyListeners();
    } catch (e) {
      debugPrint('Error updating location: $e');
    }
  }

  Future<void> _updateStatus(String status) async {
    try {
      final token = await ApiClient.getToken();
      final pos = await _locationService.getCurrentPosition();
      await _api.post(
        ApiEndpoints.agentLocation,
        data: {
          'latitude': pos.latitude,
          'longitude': pos.longitude,
          'status': status,
          'accuracy': pos.accuracy,
        },
        token: token,
      );
      _agentStatus = status;
      notifyListeners();
    } catch (e) {
      debugPrint('Error updating status: $e');
    }
  }

  Future<void> setStatus(String status) async {
    _agentStatus = status;
    notifyListeners();
    await _updateStatus(status);
  }

  Future<void> updateLocationManually(double lat, double lng) async {
    try {
      final token = await ApiClient.getToken();
      await _api.post(
        ApiEndpoints.agentLocation,
        data: {'latitude': lat, 'longitude': lng, 'status': _agentStatus},
        token: token,
      );
      _currentLocation = {'latitude': lat, 'longitude': lng};
      notifyListeners();
    } catch (e) {
      debugPrint('Error updating location manually: $e');
    }
  }
}
