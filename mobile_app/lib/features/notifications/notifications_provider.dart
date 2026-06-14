import 'package:flutter/material.dart';
import 'package:pulso_mobile/core/api/api_client.dart';
import 'package:pulso_mobile/core/api/api_endpoints.dart';

class NotificationsProvider extends ChangeNotifier {
  final ApiClient _apiClient;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _error;
  String? get error => _error;

  List<dynamic> _notifications = [];
  List<dynamic> get notifications => _notifications;

  int _unreadCount = 0;
  int get unreadCount => _unreadCount;

  NotificationsProvider(this._apiClient);

  Future<void> fetchNotifications() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _apiClient.get(ApiEndpoints.notifications);
      if (response.statusCode == 200) {
        _notifications = response.data as List? ?? [];
        _unreadCount = _notifications
            .where((n) => n['is_read'] == false)
            .length;
      }
    } catch (e) {
      _error = 'Failed to load notifications';
      _notifications = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> markAsRead(String notificationId) async {
    try {
      await _apiClient.patch('/api/notifications/$notificationId/read');
      await fetchNotifications();
    } catch (e) {
      // Silently fail
    }
  }

  Future<void> markAllAsRead() async {
    try {
      await _apiClient.patch('/api/notifications/user/read');
      await fetchNotifications();
    } catch (e) {
      _error = 'Failed to mark all as read';
      notifyListeners();
    }
  }

  Future<void> deleteNotification(String notificationId) async {
    try {
      await _apiClient.delete('/api/notifications/$notificationId');
      await fetchNotifications();
    } catch (e) {
      _error = 'Failed to delete notification';
      notifyListeners();
    }
  }
}
