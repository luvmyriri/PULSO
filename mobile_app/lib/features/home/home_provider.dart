import 'package:flutter/material.dart';
import 'package:pulso_mobile/core/api/api_client.dart';
import 'package:pulso_mobile/core/api/api_endpoints.dart';
import 'package:dio/dio.dart';
import 'dart:io';

class HomeProvider extends ChangeNotifier {
  final ApiClient _apiClient;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _error;
  String? get error => _error;

  List<dynamic> _myReports = [];
  List<dynamic> get myReports => _myReports;

  // Finalized Advisory structure (Fetched seamlessly once backend opens the router)
  List<dynamic> _advisories = [
    {
      'title': 'Scheduled Road Clearing',
      'dept': 'DPWH & CEO',
      'time': '2 hours ago',
      'desc': 'Road clearing operations along Rizal Avenue starting tomorrow at 6:00 AM.',
      'type': 'infrastructure'
    },
    {
      'title': 'Yellow Rainfall Warning',
      'dept': 'CDRRMO',
      'time': '5 hours ago',
      'desc': 'Heavy rainfall expected. Low-lying barangays are advised to monitor water levels.',
      'type': 'alert'
    },
  ];
  List<dynamic> get advisories => _advisories;

  HomeProvider(this._apiClient) {
    refreshFeed();
  }

  Future<void> refreshFeed() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // 1. Production API call to fetch LGU resident reports via Core Engine
      final response = await _apiClient.get(ApiEndpoints.reports);
      if (response.statusCode == 200) {
        _myReports = (response.data as List).map((r) {
          // Map backend status/category to UI presentation
          final status = r['status']?.toString() ?? 'pending';
          final category = r['ai_category'] ?? r['category'] ?? 'General';
          
          return {
            'id': r['id'],
            'title': r['description']?.toString().split('\n').first ?? 'No Title',
            'category': category,
            'status': status[0].toUpperCase() + status.substring(1),
            'date': r['created_at'] != null 
                ? '\${DateTime.parse(r['created_at']).day}/\${DateTime.parse(r['created_at']).month}/\${DateTime.parse(r['created_at']).year}'
                : 'Recent',
            'icon': _getIconForCategory(category),
            'color': _getColorForStatus(status),
          };
        }).toList();
      }
    } catch (e) {
      print('PULSO: Falling back to mock data: \$e');
      // Fallback for simulation until Auth Headers are securely stored on device
      _myReports = [
        {
          'title': 'Deep Pothole at 10th Ave',
          'category': 'Roads / Bridges',
          'status': 'In Progress',
          'date': 'Today, 08:30 AM',
          'icon': Icons.build_circle_outlined,
          'color': Colors.orangeAccent,
        },
        {
          'title': 'Fallen Tree on Powerline',
          'category': 'Electrical / Power',
          'status': 'Resolved',
          'date': 'Mar 20, 2026',
          'icon': Icons.bolt_rounded,
          'color': Colors.greenAccent,
        },
      ];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  IconData _getIconForCategory(String cat) {
    cat = cat.toLowerCase();
    if (cat.contains('road')) return Icons.road_rounded;
    if (cat.contains('water') || cat.contains('drainage')) return Icons.water_drop_rounded;
    if (cat.contains('electric') || cat.contains('light')) return Icons.bolt_rounded;
    if (cat.contains('waste')) return Icons.delete_outline_rounded;
    return Icons.warning_amber_rounded;
  }

  Color _getColorForStatus(String status) {
    status = status.toLowerCase();
    if (status == 'resolved') return Colors.greenAccent;
    if (status == 'rejected') return Colors.redAccent;
    if (status == 'unverified') return Colors.blueAccent;
    return Colors.orangeAccent;
  }

  Future<Map<String, dynamic>> submitReport({
    required String category,
    required String description,
    required double lat,
    required double lng,
    String? locationString,
    File? image,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final formData = FormData.fromMap({
        'category': category,
        'description': description,
        'lat': lat,
        'lng': lng,
        'location_string': locationString ?? 'Lat: \$lat, Lng: \$lng',
      });

      if (image != null) {
        formData.files.add(MapEntry(
          'image',
          await MultipartFile.fromFile(image.path, filename: 'report_\${DateTime.now().millisecondsSinceEpoch}.jpg'),
        ));
      }

      final response = await _apiClient.post(
        ApiEndpoints.reports,
        data: formData,
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        await refreshFeed();
        return {'success': true};
      }
      return {'success': false, 'message': 'Unknown error occurred'};
    } catch (e) {
      String errorMessage = 'Failed to submit report';
      if (e is DioException) {
        final data = e.response?.data;
        if (data is Map && data.containsKey('detail')) {
          errorMessage = data['detail']; // AI Safety Rejection Reason
        } else {
          errorMessage = 'Network error: \${e.message}';
        }
      }
      return {'success': false, 'message': errorMessage};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> interactWithPost(String id, String action) async {
    // Scaffold out the endpoint interaction (e.g. Likes, Comments)
    // await _apiClient.post('\${ApiEndpoints.scanID}/interact', data: {'id': id, 'action': action});
    notifyListeners();
  }
}
