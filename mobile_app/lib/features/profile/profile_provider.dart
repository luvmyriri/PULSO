import 'package:flutter/material.dart';
import 'package:pulso_mobile/core/api/api_client.dart';
import 'package:pulso_mobile/core/api/api_endpoints.dart';

class ProfileProvider extends ChangeNotifier {
  final ApiClient _apiClient;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _error;
  String? get error => _error;

  Map<String, dynamic>? _userProfile;
  Map<String, dynamic>? get userProfile => _userProfile;

  ProfileProvider(this._apiClient);

  Future<void> fetchProfile() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _apiClient.get(ApiEndpoints.me);
      if (response.statusCode == 200) {
        _userProfile = response.data;
      }
    } catch (e) {
      _error = 'Failed to load profile';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> updateProfile({
    String? fullName,
    String? phoneNumber,
    String? address,
    String? barangay,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final data = <String, dynamic>{};
      if (fullName != null) data['full_name'] = fullName;
      if (phoneNumber != null) data['phone_number'] = phoneNumber;
      if (address != null) data['address'] = address;
      if (barangay != null) data['barangay'] = barangay;

      final response = await _apiClient.put(ApiEndpoints.me, data: data);

      if (response.statusCode == 200) {
        _userProfile = response.data;
        return true;
      }
      _error = 'Failed to update profile';
    } catch (e) {
      _error = 'Failed to update profile';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return false;
  }

  Future<bool> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _apiClient.post(
        ApiEndpoints.changePassword,
        data: {
          'current_password': currentPassword,
          'new_password': newPassword,
        },
      );

      if (response.statusCode == 200) {
        return true;
      }
      _error = response.data['detail'] ?? 'Failed to change password';
    } catch (e) {
      _error = 'Failed to change password';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return false;
  }

  Future<void> logout() async {
    await ApiClient.clearTokens();
    _userProfile = null;
    notifyListeners();
  }
}
