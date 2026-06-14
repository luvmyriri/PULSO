import 'package:flutter/material.dart';
import 'package:pulso_mobile/core/api/api_client.dart';
import 'package:pulso_mobile/core/api/api_endpoints.dart';

class AuthProvider extends ChangeNotifier {
  final ApiClient _apiClient;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _error;
  String? get error => _error;

  AuthProvider(this._apiClient);

  Future<bool> forgotPassword(String email) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _apiClient.post(
        ApiEndpoints.forgotPassword,
        data: {'email': email},
      );

      if (response.statusCode == 200) {
        return true;
      }
      _error = response.data['detail'] ?? 'Failed to send reset code';
    } catch (e) {
      _error = 'Connection error. Please try again.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return false;
  }

  Future<bool> verifyResetCode(String email, String code) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _apiClient.post(
        ApiEndpoints.verifyResetCode,
        data: {'email': email, 'code': code},
      );

      if (response.statusCode == 200) {
        return true;
      }
      _error = response.data['detail'] ?? 'Invalid code';
    } catch (e) {
      _error = 'Invalid or expired code';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return false;
  }

  Future<bool> resetPassword(
    String email,
    String code,
    String newPassword,
  ) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _apiClient.post(
        ApiEndpoints.resetPassword,
        data: {'email': email, 'code': code, 'new_password': newPassword},
      );

      if (response.statusCode == 200) {
        return true;
      }
      _error = response.data['detail'] ?? 'Failed to reset password';
    } catch (e) {
      _error = 'Failed to reset password';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return false;
  }

  Future<bool> resendCode(String email) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _apiClient.post(
        ApiEndpoints.resendCode,
        data: {'email': email},
      );

      if (response.statusCode == 200) {
        return true;
      }
      _error = response.data['detail'] ?? 'Failed to resend code';
    } catch (e) {
      _error = 'Connection error. Please try again.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return false;
  }
}
