import 'dart:io';
import 'package:flutter/material.dart';
import 'package:mobile_app/core/api/api_client.dart';
import 'package:mobile_app/core/api/api_endpoints.dart';

class RegistrationProvider extends ChangeNotifier {
  final ApiClient _apiClient;

  RegistrationProvider(this._apiClient);

  File? idFrontFile;
  File? idBackFile;
  Map<String, dynamic>? idData;
  
  // Form Data
  String fullName = '';
  String email = '';
  String password = '';
  String phoneNumber = '';
  String address = '';
  String barangay = '';

  bool isLoading = false;
  String? loadingMessage;
  String? error;

  // Dashboard Data (Mocked for now)
  List<Map<String, dynamic>> recentReports = [
    {
      'title': 'Broken Streetlight',
      'category': 'Lighting',
      'status': 'DISPATCHED',
      'time': '2h ago',
      'icon': Icons.light_rounded
    },
    {
      'title': 'Drainage Clog',
      'category': 'Water/Drainage',
      'status': 'PENDING',
      'time': '5h ago',
      'icon': Icons.water_drop_rounded
    }
  ];

  void setIDFront(File? file) {
    idFrontFile = file;
    notifyListeners();
  }

  void setIDBack(File? file) {
    idBackFile = file;
    notifyListeners();
  }

  void clearIDFront() {
    idFrontFile = null;
    notifyListeners();
  }

  void clearIDBack() {
    idBackFile = null;
    notifyListeners();
  }

  void clearData() {
    idFrontFile = null;
    idBackFile = null;
    idData = null;
    fullName = '';
    email = '';
    password = '';
    phoneNumber = '';
    address = '';
    barangay = '';
    error = null;
    notifyListeners();
  }

  Future<bool> scanID() async {
    if (idFrontFile == null) {
      error = "Please capture the front of your ID first.";
      notifyListeners();
      return false;
    }

    isLoading = true;
    loadingMessage = "PREPROCESSING ID IMAGES...";
    error = null;
    notifyListeners();

    try {
      // Small delay to let the UI show the first message
      await Future.delayed(const Duration(milliseconds: 500));
      loadingMessage = "CONSULTING VISION AI...";
      notifyListeners();

      final response = await _apiClient.uploadID(
        front: idFrontFile,
        back: idBackFile,
      );

      loadingMessage = "FINALIZING RESIDENT PROFILE...";
      notifyListeners();

      if (response.statusCode == 200) {
        idData = response.data;
        notifyListeners();
        return true;
      }
      error = "Failed to scan ID. Please ensure the image is clear.";
    } catch (e) {
      error = "Connection error. Please check your backend status.";
      print("Scan error: $e");
    } finally {
      isLoading = false;
      loadingMessage = null;
      notifyListeners();
    }
    return false;
  }

  Future<bool> registerUser() async {
    isLoading = true;
    loadingMessage = "ENCRYPTING CREDENTIALS...";
    error = null;
    notifyListeners();

    try {
      await Future.delayed(const Duration(milliseconds: 500));
      loadingMessage = "FINISHING ACCOUNT SETUP...";
      notifyListeners();
      final response = await _apiClient.post(
        ApiEndpoints.register,
        data: {
          'full_name': fullName,
          'email': email,
          'password': password,
          'phone_number': phoneNumber,
          'address': address,
          'barangay': barangay,
          'role': 'resident',
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return true;
      }
      error = "Registration failed. ${response.data['detail'] ?? ''}";
    } catch (e) {
      error = "Connection error. Please try again.";
      print("Register error: $e");
    } finally {
      isLoading = false;
      notifyListeners();
    }
    return false;
  }
}
