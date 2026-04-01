import 'dart:io';
import 'package:dio/dio.dart';
import 'package:mobile_app/core/api/api_endpoints.dart';
import 'package:flutter/foundation.dart';

class ApiClient {
  final Dio _dio = Dio();

  // 10.0.2.2 is the special IP for the host machine's localhost on Android Emulator
  static String get baseUrl {
    if (kIsWeb) return 'http://localhost:8000';
    return Platform.isAndroid ? 'http://192.168.0.199:8000' : 'http://localhost:8000';
  }

  ApiClient() {
    _dio.options.baseUrl = baseUrl;
    _dio.options.connectTimeout = const Duration(seconds: 15);
    _dio.options.receiveTimeout = const Duration(seconds: 15);

    _dio.interceptors.add(LogInterceptor(
      request: true,
      requestHeader: true,
      requestBody: true,
      responseHeader: false,
      responseBody: true,
      error: true,
    ));
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
      return await _dio.get(
        path,
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
      if (front != null) 'idFront': await MultipartFile.fromFile(front.path, filename: 'id_front.jpg'),
      if (back != null) 'idBack': await MultipartFile.fromFile(back.path, filename: 'id_back.jpg'),
    });

    return await post(ApiEndpoints.scanID, data: formData);
  }
}
