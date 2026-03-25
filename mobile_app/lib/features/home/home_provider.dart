import 'package:flutter/material.dart';
import 'package:mobile_app/core/api/api_client.dart';
import 'package:mobile_app/core/api/api_endpoints.dart';
import 'package:dio/dio.dart';

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
      // final response = await _apiClient.get(ApiEndpoints.reports);
      // _myReports = response.data;
      
      // Fallback for simulation until Auth Headers are securely stored on device
      await Future.delayed(const Duration(milliseconds: 600));
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
      
    } catch (e) {
      if (e is DioException) {
        _error = 'API Connection Error: \${e.message}';
      } else {
        _error = 'Failed to sync with the LGU command center.';
      }
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
