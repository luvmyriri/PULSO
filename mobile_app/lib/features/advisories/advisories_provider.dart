import 'package:flutter/material.dart';
import 'package:pulso_mobile/core/api/api_client.dart';
import 'package:pulso_mobile/core/api/api_endpoints.dart';

class AdvisoriesProvider extends ChangeNotifier {
  final ApiClient _apiClient;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _error;
  String? get error => _error;

  List<dynamic> _advisories = [];
  List<dynamic> get advisories => _advisories;

  AdvisoriesProvider(this._apiClient);

  Future<void> fetchAdvisories() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _apiClient.get(ApiEndpoints.advisories);
      if (response.statusCode == 200) {
        _advisories = response.data as List? ?? [];
      }
    } catch (e) {
      _error = 'Failed to load advisories';
      _advisories = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
