import 'dart:io';
import 'package:dio/dio.dart';
import 'package:pulso_mobile/core/api/api_endpoints.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiClient {
  final Dio _dio = Dio();
  static SharedPreferences? _prefs;

  static const String _tokenKey = 'auth_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _baseUrlKey = 'api_base_url';

  // Default local development URLs
  static const String _defaultLocalUrl = 'http://localhost:33159';
  // Use 10.0.2.2 to access the host machine's localhost from Android Emulator.
  // Assuming the FastAPI backend is running on port 33159.
  static const String _defaultRemoteUrl = 'http://192.168.0.100:33159';
  static String get baseUrl {
    if (kIsWeb) return _defaultLocalUrl;

    // Check for custom configured URL first
    final customUrl = _prefs?.getString(_baseUrlKey);
    if (customUrl != null && customUrl.isNotEmpty) {
      return customUrl;
    }

    // Connected to local network backend
    return (Platform.isAndroid || Platform.isIOS)
        ? _defaultRemoteUrl
        : _defaultLocalUrl;
  }

  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  static Future<void> setBaseUrl(String url) async {
    await _prefs?.setString(_baseUrlKey, url);
  }

  // Token Management
  static Future<void> saveToken(String token) async {
    await _prefs?.setString(_tokenKey, token);
  }

  static Future<String?> getToken() async {
    return _prefs?.getString(_tokenKey);
  }

  static Future<void> saveRefreshToken(String token) async {
    await _prefs?.setString(_refreshTokenKey, token);
  }

  static Future<String?> getRefreshToken() async {
    return _prefs?.getString(_refreshTokenKey);
  }

  static Future<void> clearTokens() async {
    await _prefs?.remove(_tokenKey);
    await _prefs?.remove(_refreshTokenKey);
  }

  static Future<bool> hasToken() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }

  ApiClient() {
    _dio.options.baseUrl = baseUrl;
    _dio.options.connectTimeout = const Duration(seconds: 30);
    _dio.options.receiveTimeout = const Duration(seconds: 60);

    _dio.interceptors.add(
      LogInterceptor(
        request: true,
        requestHeader: true,
        requestBody: true,
        responseHeader: false,
        responseBody: true,
        error: true,
      ),
    );
  }

  /// Build options with optional Bearer token.
  Options _opts(String? token) => Options(
    headers: token != null ? {'Authorization': 'Bearer $token'} : null,
  );

  Future<Response> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    String? token,
  }) async {
    try {
      // Auto-add token if not provided
      token ??= await getToken();
      return await _dio.post(
        path,
        data: data,
        queryParameters: queryParameters,
        options: _opts(token),
      );
    } on DioException catch (e) {
      rethrow;
    }
  }

  Future<Response> get(
    String path, {
    Map<String, dynamic>? queryParameters,
    String? token,
  }) async {
    try {
      token ??= await getToken();
      return await _dio.get(
        path,
        queryParameters: queryParameters,
        options: _opts(token),
      );
    } on DioException catch (e) {
      rethrow;
    }
  }

  Future<Response> put(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    String? token,
  }) async {
    try {
      token ??= await getToken();
      return await _dio.put(
        path,
        data: data,
        queryParameters: queryParameters,
        options: _opts(token),
      );
    } on DioException catch (e) {
      rethrow;
    }
  }

  Future<Response> patch(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    String? token,
  }) async {
    try {
      token ??= await getToken();
      return await _dio.patch(
        path,
        data: data,
        queryParameters: queryParameters,
        options: _opts(token),
      );
    } on DioException catch (e) {
      rethrow;
    }
  }

  Future<Response> delete(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    String? token,
  }) async {
    try {
      token ??= await getToken();
      return await _dio.delete(
        path,
        data: data,
        queryParameters: queryParameters,
        options: _opts(token),
      );
    } on DioException catch (e) {
      rethrow;
    }
  }

  // Specialized OCR Upload
  Future<Response> uploadID({File? front, File? back}) async {
    FormData formData = FormData.fromMap({
      if (front != null)
        'idFront': await MultipartFile.fromFile(
          front.path,
          filename: 'id_front.jpg',
        ),
      if (back != null)
        'idBack': await MultipartFile.fromFile(
          back.path,
          filename: 'id_back.jpg',
        ),
    });

    return await post(ApiEndpoints.scanID, data: formData);
  }

  // Report image upload with GPS-based filename
  Future<Response> uploadReportImage({
    required File image,
    required double lat,
    required double lng,
    String? description,
  }) async {
    final latStr = lat.toStringAsFixed(6).replaceAll('.', 'p');
    final lngStr = lng.toStringAsFixed(6).replaceAll('.', 'p');
    final filename =
        'report_${latStr}_${lngStr}_${DateTime.now().millisecondsSinceEpoch}.jpg';

    FormData formData = FormData.fromMap({
      'image': await MultipartFile.fromFile(image.path, filename: filename),
      if (description != null) 'description': description,
      'lat': lat,
      'lng': lng,
    });

    return await post(ApiEndpoints.reports, data: formData);
  }
}
