class ApiEndpoints {
  // Authentication
  static const String scanID = '/api/verify-residency';
  static const String register = '/api/auth/register';
  static const String login = '/api/auth/login';
  static const String verifyRegistration = '/api/auth/verify-registration';
  static const String resendCode = '/api/auth/resend-code';
  static const String forgotPassword = '/api/auth/forgot-password';
  static const String verifyResetCode = '/api/auth/verify-reset-code';
  static const String resetPassword = '/api/auth/reset-password';
  static const String changePassword = '/api/auth/change-password';
  static const String refreshToken = '/api/auth/refresh';

  // User
  static const String me = '/api/me';
  static const String users = '/api/users';

  // Reports
  static const String reports = '/api/reports';
  static const String reportsAnalyze = '/api/reports/analyze';
  static const String reportStats = '/api/reports/stats';

  // Notifications
  static const String notifications = '/api/notifications';

  // Advisories
  static const String advisories = '/api/advisories';

  // Work Orders
  static const String workOrders = '/api/work-orders';

  // Geocoding
  static const String geocodeReverse = '/api/geocode/reverse';
  static const String geocodeSearch = '/api/geocode/search';

  // Maps
  static const String mapsDirections = '/api/maps/directions';

  // AI
  static const String aiAssistant = '/api/ai/assistant';
  static const String aiRateLimits = '/api/ai/rate-limits';

  // PCN
  static const String verifyPCN = '/api/verify-pcn';

  // Agent Tracking
  static const String agentLocation = '/api/gov/agents/location';
  static const String agentWorkOrders = '/api/gov/agents/work-orders';
  static const String agentMyWorkOrders = '/api/gov/agents/my-work-orders';
  static const String agentFieldReport = '/api/gov/agents/field-report';
  static String agentWOStatus(int woId) => '/api/gov/agents/work-orders/$woId/status';
}
