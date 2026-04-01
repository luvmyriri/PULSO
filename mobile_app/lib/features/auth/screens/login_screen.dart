import 'package:flutter/material.dart';
import 'package:animate_do/animate_do.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:pulso_mobile/core/theme/app_theme.dart';
import 'package:pulso_mobile/widgets/glass_card.dart';
// import 'package:pulso_mobile/l10n/app_localizations.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:provider/provider.dart';
import 'package:pulso_mobile/core/providers/settings_provider.dart';
import 'package:pulso_mobile/widgets/pulso_branding.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  bool _obscurePassword = true;
  String _errorMessage = "";

  String _viewMode =
      'login'; // login | forgot_password | verify_code | reset_password | reset_complete | verify_registration
  final _registrationEmailController = TextEditingController();
  bool _isVerifyingRegistration = false;
  final _recoveryEmailController = TextEditingController();
  bool _isSendingRecovery = false;
  String? _recoveryError;

  // Step 2: OTP inputs
  final List<TextEditingController> _otpControllers = List.generate(
    6,
    (_) => TextEditingController(),
  );
  final List<FocusNode> _otpFocusNodes = List.generate(6, (_) => FocusNode());
  int _resendTimer = 0;
  bool _canResend = false;

  // Step 3: New password fields
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _obscureNewPassword = true;
  bool _obscureConfirmPassword = true;

  // Registration Resend state
  bool _isResendingRegistration = false;
  int _resendRegistrationTimer = 0;
  bool _showResendRegistration = false;
  
  final List<TextEditingController> _registrationOtpControllers = List.generate(
    6,
    (_) => TextEditingController(),
  );
  final List<FocusNode> _registrationOtpFocusNodes = List.generate(6, (_) => FocusNode());

  Color get brandOrange => AppTheme.primaryOrange;

  // Base URL for API - Use 192.168.0.199 for PC IP resolver
  static const String baseUrl = "http://192.168.0.199:8000";

  bool _initialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
      if (args != null && args['auto_verify'] == true) {
        _registrationEmailController.text = args['email'] ?? "";
        _viewMode = 'verify_registration';
        _startResendRegistrationTimer();
      }
      _initialized = true;
    }
  }

  void _startResendTimer() {
    _resendTimer = 60;
    _canResend = false;
    Future.doWhile(() async {
      await Future.delayed(const Duration(seconds: 1));
      if (!mounted) return false;
      setState(() {
        if (_resendTimer > 0)
          _resendTimer--;
        else
          _canResend = true;
      });
      return _resendTimer > 0;
    });
  }

  void _startResendRegistrationTimer() {
    setState(() {
      _resendRegistrationTimer = 60;
    });
    Future.doWhile(() async {
      await Future.delayed(const Duration(seconds: 1));
      if (!mounted) return false;
      setState(() {
        if (_resendRegistrationTimer > 0) _resendRegistrationTimer--;
      });
      return _resendRegistrationTimer > 0;
    });
  }

  Future<void> _handleRecovery() async {
    if (_recoveryEmailController.text.isEmpty) return;
    setState(() {
      _isSendingRecovery = true;
      _recoveryError = null;
    });
    try {
      final response = await http
          .post(
            Uri.parse("$baseUrl/api/auth/forgot-password"),
            headers: {"Content-Type": "application/json"},
            body: json.encode({"email": _recoveryEmailController.text}),
          )
          .timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        if (!mounted) return;
        for (var c in _otpControllers) c.clear();
        
        // Success Feedback
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text(
              "Official Security Code Sent! Please check your Inbox and Spam folder.",
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            backgroundColor: AppTheme.primaryOrange,
            duration: const Duration(seconds: 5),
          ),
        );

        setState(() {
          _viewMode = 'verify_code';
          _isSendingRecovery = false;
        });
        for (var controller in _otpControllers) controller.clear();
        _startResendTimer();
      } else {
        final data = json.decode(response.body);
        final String detail = data['detail']?.toString() ?? "Recovery request failed.";
        
        if (response.statusCode == 403 && detail.toLowerCase().contains("not verified")) {
          setState(() {
            _registrationEmailController.text = _recoveryEmailController.text;
            _viewMode = 'verify_registration';
            _isSendingRecovery = false;
          });
          _startResendRegistrationTimer();
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text("Account not verified. Please activate your account first."),
              backgroundColor: Colors.blueAccent,
            ),
          );
        } else {
          setState(() {
            _recoveryError = detail;
            _isSendingRecovery = false;
          });
        }
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _recoveryError = "Network error: ${e.toString()}";
        _isSendingRecovery = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Communication Error: Ensure your internet is active and the server is online."),
          backgroundColor: Colors.redAccent,
        ),
      );
    }
  }

  Future<void> _handleVerifyCode() async {
    final code = _otpControllers.map((c) => c.text).join();
    if (code.length < 6) return;
    setState(() {
      _isSendingRecovery = true;
      _recoveryError = null;
    });
    try {
      final response = await http
          .post(
            Uri.parse("$baseUrl/api/auth/verify-reset-code"),
            headers: {"Content-Type": "application/json"},
            body: json.encode({
              "email": _recoveryEmailController.text,
              "code": code,
            }),
          )
          .timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        if (!mounted) return;
        setState(() {
          _viewMode = 'reset_password';
          _isSendingRecovery = false;
        });
      } else {
        final data = json.decode(response.body);
        setState(() {
          _recoveryError = data['detail']?.toString() ?? "Invalid code.";
          _isSendingRecovery = false;
        });
      }
    } catch (_) {
      setState(() {
        _recoveryError = "Network error.";
        _isSendingRecovery = false;
      });
    }
  }

  Future<void> _handleResendRegistrationCode() async {
    if (_registrationEmailController.text.isEmpty) return;
    setState(() {
      _isResendingRegistration = true;
    });
    try {
      final response = await http
          .post(
            Uri.parse("$baseUrl/api/auth/resend-code"),
            headers: {"Content-Type": "application/json"},
            body: json.encode({"email": _registrationEmailController.text}),
          )
          .timeout(const Duration(seconds: 15));

      if (!mounted) return;

      if (response.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              "New Verification Code Sent! Check your Inbox or Spam folder.",
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 5),
          ),
        );
        setState(() {
          _isResendingRegistration = false;
          _errorMessage = ""; // Clear existing errors
        });
        _startResendRegistrationTimer();
        for (var controller in _registrationOtpControllers) controller.clear();
        _registrationOtpFocusNodes[0].requestFocus();
      } else {
        final data = json.decode(response.body);
        setState(() {
          _errorMessage = data['detail']?.toString() ?? "Failed to resend code.";
          _isResendingRegistration = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_errorMessage),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = "Connection error. Please try again.";
        _isResendingRegistration = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Server unreachable. Please check your network."),
          backgroundColor: Colors.redAccent,
        ),
      );
    }
  }

  Future<void> _handleVerifyRegistration() async {
    final code = _registrationOtpControllers.map((c) => c.text).join();
    if (code.length < 6) return;
    
    setState(() {
      _isVerifyingRegistration = true;
      _errorMessage = "";
    });

    try {
      final response = await http.post(
        Uri.parse("$baseUrl/api/auth/verify-registration"),
        headers: {"Content-Type": "application/json"},
        body: json.encode({
          "email": _registrationEmailController.text,
          "code": code,
        }),
      ).timeout(const Duration(seconds: 15));

      if (!mounted) return;

      if (response.statusCode == 200) {
        setState(() {
          _isVerifyingRegistration = false;
          _viewMode = 'login';
          _errorMessage = "";
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Account verified successfully! You can now log in."),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        final data = json.decode(response.body);
        setState(() {
          _isVerifyingRegistration = false;
          _errorMessage = data['detail']?.toString() ?? "Verification failed.";
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isVerifyingRegistration = false;
        _errorMessage = "Network error. Please try again.";
      });
    }
  }

  Future<void> _handleResetPassword() async {
    if (_newPasswordController.text != _confirmPasswordController.text) {
      setState(() => _recoveryError = "Passwords do not match.");
      return;
    }
    if (_newPasswordController.text.length < 6) {
      setState(
        () => _recoveryError = "Password must be at least 6 characters.",
      );
      return;
    }
    final code = _otpControllers.map((c) => c.text).join();
    setState(() {
      _isSendingRecovery = true;
      _recoveryError = null;
    });
    try {
      final response = await http
          .post(
            Uri.parse("$baseUrl/api/auth/reset-password"),

            headers: {"Content-Type": "application/json"},
            body: json.encode({
              "email": _recoveryEmailController.text,
              "code": code,
              "new_password": _newPasswordController.text,
            }),
          )
          .timeout(const Duration(seconds: 15));
      if (response.statusCode == 200) {
        if (!mounted) return;
        setState(() {
          _viewMode = 'reset_complete';
          _isSendingRecovery = false;
        });
      } else {
        final data = json.decode(response.body);
        setState(() {
          _recoveryError = data['detail']?.toString() ?? "Reset failed.";
          _isSendingRecovery = false;
        });
      }
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _recoveryError = "Network error.";
        _isSendingRecovery = false;
      });
    }
  }

  Future<void> _handleLogin({String? captchaToken}) async {
    setState(() {
      _isLoading = true;
      _errorMessage = "";
    });

    try {
      final Map<String, String> body = {
        "username": _emailController.text,
        "password": _passwordController.text,
      };

      if (captchaToken != null) {
        body["captcha_token"] = captchaToken;
      }

      final response = await http
          .post(
            Uri.parse("$baseUrl/api/auth/login"),
            headers: {"Content-Type": "application/x-www-form-urlencoded"},
            body: body,
          )
          .timeout(const Duration(seconds: 15));

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        if (data['require_captcha'] == true) {
          // Show ReCAPTCHA Dialog
          if (!mounted) return;
          final token = await showDialog<String>(
            context: context,
            barrierDismissible: false,
            builder: (context) => const CaptchaDialog(),
          );

          if (token != null) {
            _handleLogin(captchaToken: token); // Re-try with token
          } else {
            setState(() => _isLoading = false);
          }
          return;
        }

        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text("Login Successful!")));
        // Navigate to dashboard...
      } else {
        final errMsg = data['detail']?.toString() ?? "Authentication failed";
        setState(() {
          _errorMessage = errMsg;
          if (errMsg.toLowerCase().contains("not verified")) {
            _registrationEmailController.text = _emailController.text;
            _viewMode = 'verify_registration';
          }
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = "Connection error. Is the backend running?";
      });
    } finally {
      if (captchaToken != null || _errorMessage.isNotEmpty) {
        setState(() => _isLoading = false);
      }
    }
  }

  Widget _buildLoginForm(bool isDark, Color onSurface, Color brandOrange) {
    return Column(
      key: const ValueKey('login_form'),
      children: [
        // User Icon
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            color: onSurface.withOpacity(0.05),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: onSurface.withOpacity(0.1)),
          ),
          child: Icon(Icons.person_outline, size: 32, color: brandOrange),
        ),
        const SizedBox(height: 20),
        Text(
          "Login",
          style: GoogleFonts.outfit(
            color: onSurface,
            fontSize: 28,
            fontWeight: FontWeight.w900,
          ),
        ),
        Text(
          "Sign in to access your community dashboard",
          textAlign: TextAlign.center,
          style: TextStyle(
            color: onSurface.withOpacity(0.4),
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 40),

        // Form
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_errorMessage.isNotEmpty) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.red.withOpacity(0.2)),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.error_outline,
                      color: Colors.redAccent,
                      size: 16,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _errorMessage,
                            style: const TextStyle(
                              color: Colors.redAccent,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
            ],

            Text(
              "MOBILE NUMBER OR EMAIL",
              style: TextStyle(
                color: onSurface.withOpacity(0.4),
                fontSize: 10,
                fontWeight: FontWeight.w900,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _emailController,
              style: TextStyle(color: onSurface, fontSize: 14),
              decoration: InputDecoration(
                hintText: "Enter your credential",
                hintStyle: TextStyle(color: onSurface.withOpacity(0.2)),
                prefixIcon: Icon(
                  Icons.person_outline,
                  color: onSurface.withOpacity(0.3),
                  size: 20,
                ),
                filled: true,
                fillColor: onSurface.withOpacity(0.02),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(20),
                  borderSide: BorderSide(color: onSurface.withOpacity(0.05)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(20),
                  borderSide: BorderSide(color: onSurface.withOpacity(0.05)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(20),
                  borderSide: BorderSide(color: brandOrange.withOpacity(0.5)),
                ),
              ),
            ),
            const SizedBox(height: 24),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "PASSWORD",
                  style: TextStyle(
                    color: onSurface.withOpacity(0.4),
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 2,
                  ),
                ),
                TextButton(
                  onPressed: () =>
                      setState(() => _viewMode = 'forgot_password'),
                  child: Text(
                    "FORGOT PASSWORD?",
                    style: TextStyle(
                      color: brandOrange,
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1,
                    ),
                  ),
                ),
              ],
            ),
            TextField(
              controller: _passwordController,
              obscureText: _obscurePassword,
              style: TextStyle(color: onSurface, fontSize: 14),
              decoration: InputDecoration(
                hintText: "Enter Password",
                hintStyle: TextStyle(color: onSurface.withOpacity(0.2)),
                prefixIcon: Icon(
                  Icons.shield_outlined,
                  color: onSurface.withOpacity(0.3),
                  size: 20,
                ),
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscurePassword
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined,
                    color: onSurface.withOpacity(0.3),
                    size: 18,
                  ),
                  onPressed: () =>
                      setState(() => _obscurePassword = !_obscurePassword),
                ),
                filled: true,
                fillColor: onSurface.withOpacity(0.02),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(20),
                  borderSide: BorderSide(color: onSurface.withOpacity(0.05)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(20),
                  borderSide: BorderSide(color: onSurface.withOpacity(0.05)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(20),
                  borderSide: BorderSide(color: brandOrange.withOpacity(0.5)),
                ),
              ),
            ),
            const SizedBox(height: 32),

            SizedBox(
              width: double.infinity,
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: brandOrange.withOpacity(0.2),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: ElevatedButton(
                  onPressed: _isLoading ? null : () => _handleLogin(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: brandOrange,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 20),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                    elevation: 0,
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Text(
                              "SIGN IN",
                              style: TextStyle(
                                fontWeight: FontWeight.w900,
                                letterSpacing: 2,
                              ),
                            ),
                            const SizedBox(width: 8),
                            const Icon(
                              Icons.chevron_right,
                              size: 18,
                              color: Colors.white,
                            ),
                          ],
                        ),
                ),
              ),
            ),
          ],
        ),

        const SizedBox(height: 32),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              "Don't have an account? ",
              style: TextStyle(color: onSurface.withOpacity(0.5), fontSize: 13),
            ),
            GestureDetector(
              onTap: () => Navigator.pushReplacementNamed(context, '/register'),
              child: Text(
                "Sign Up",
                style: TextStyle(
                  color: brandOrange,
                  fontWeight: FontWeight.w900,
                  fontSize: 13,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  String _passwordStrengthLabel(String pw) {
    if (pw.length < 8) return "Weak";
    final hasUpper = pw.contains(RegExp(r'[A-Z]'));
    final hasNum = pw.contains(RegExp(r'[0-9]'));
    final hasSpecial = pw.contains(RegExp(r'[^A-Za-z0-9]'));
    if (hasUpper && hasNum && hasSpecial) return "Strong";
    return "Medium";
  }

  Color _strengthColor(String label, Color brand) {
    if (label == "Weak") return Colors.red;
    if (label == "Medium") return brand;
    return Colors.green;
  }

  Widget _strengthBar(bool active, Color color) => Expanded(
    child: Container(
      height: 4,
      decoration: BoxDecoration(
        color: active ? color : Colors.grey.withOpacity(0.2),
        borderRadius: BorderRadius.circular(4),
      ),
    ),
  );

  Widget _strengthChip(String label, bool active, Color onSurface) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
    decoration: BoxDecoration(
      color: active
          ? Colors.green.withOpacity(0.1)
          : onSurface.withOpacity(0.05),
      borderRadius: BorderRadius.circular(6),
      border: Border.all(
        color: active
            ? Colors.green.withOpacity(0.3)
            : onSurface.withOpacity(0.1),
      ),
    ),
    child: Text(
      label,
      style: TextStyle(
        color: active ? Colors.green : onSurface.withOpacity(0.4),
        fontSize: 8,
        fontWeight: FontWeight.w900,
      ),
    ),
  );

  Widget _buildErrorBanner(String msg) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: Colors.red.withOpacity(0.1),
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: Colors.red.withOpacity(0.2)),
    ),
    child: Row(
      children: [
        const Icon(Icons.error_outline, color: Colors.redAccent, size: 16),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            msg,
            style: const TextStyle(
              color: Colors.redAccent,
              fontSize: 11,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ],
    ),
  );

  Widget _buildForgotPasswordForm(
    bool isDark,
    Color onSurface,
    Color brandOrange,
  ) {
    return Column(
      key: const ValueKey('forgot_password_form'),
      children: [
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            color: brandOrange.withOpacity(0.1),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: brandOrange.withOpacity(0.2)),
          ),
          child: Icon(Icons.shield_outlined, color: brandOrange, size: 32),
        ),
        const SizedBox(height: 16),
        Text(
          "Identity Retrieval",
          style: GoogleFonts.outfit(
            color: onSurface,
            fontSize: 24,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          "Enter your email for account verification",
          style: TextStyle(color: onSurface.withOpacity(0.5), fontSize: 12),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 28),
        if (_recoveryError != null) ...[
          _buildErrorBanner(_recoveryError!),
          const SizedBox(height: 16),
        ],
        Align(
          alignment: Alignment.centerLeft,
          child: Text(
            "OFFICIAL EMAIL ADDRESS",
            style: TextStyle(
              color: onSurface.withOpacity(0.4),
              fontSize: 10,
              fontWeight: FontWeight.w900,
              letterSpacing: 2,
            ),
          ),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _recoveryEmailController,
          keyboardType: TextInputType.emailAddress,
          style: TextStyle(color: onSurface, fontSize: 14),
          decoration: InputDecoration(
            hintText: "your@email.com",
            hintStyle: TextStyle(color: onSurface.withOpacity(0.2)),
            prefixIcon: Icon(
              Icons.mail_outline,
              color: onSurface.withOpacity(0.3),
              size: 18,
            ),
            filled: true,
            fillColor: onSurface.withOpacity(0.02),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(20),
              borderSide: BorderSide(color: onSurface.withOpacity(0.05)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(20),
              borderSide: BorderSide(color: onSurface.withOpacity(0.05)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(20),
              borderSide: BorderSide(color: brandOrange.withOpacity(0.5)),
            ),
          ),
        ),
        const SizedBox(height: 28),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _isSendingRecovery ? null : _handleRecovery,
            style: ElevatedButton.styleFrom(
              backgroundColor: brandOrange,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 18),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
              elevation: 0,
            ),
            child: _isSendingRecovery
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      color: Colors.white,
                      strokeWidth: 2,
                    ),
                  )
                : const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        "VERIFY EMAIL",
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          letterSpacing: 2,
                        ),
                      ),
                      SizedBox(width: 8),
                      Icon(Icons.chevron_right, size: 18),
                    ],
                  ),
          ),
        ),
        const SizedBox(height: 16),
        TextButton.icon(
          onPressed: () => setState(() {
            _viewMode = 'login';
            _recoveryError = null;
          }),
          icon: Icon(
            Icons.arrow_back,
            size: 14,
            color: onSurface.withOpacity(0.5),
          ),
          label: Text(
            "BACK TO SIGN IN",
            style: TextStyle(
              color: onSurface.withOpacity(0.5),
              fontSize: 10,
              fontWeight: FontWeight.bold,
              letterSpacing: 1,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildResendButton({
    required int timer,
    required bool isLoading,
    required VoidCallback onPressed,
    required Color onSurface,
    required Color brandOrange,
  }) {
    if (timer > 0) {
      return Text(
        "Resend code in ${timer}s",
        style: TextStyle(
          color: onSurface.withOpacity(0.5),
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
      );
    }
    if (isLoading) {
      return const SizedBox(
        width: 20,
        height: 20,
        child: CircularProgressIndicator(
          strokeWidth: 2,
          color: Color(0xFFFF6600),
        ),
      );
    }
    return TextButton(
      onPressed: onPressed,
      child: Text(
        "RESEND VERIFICATION CODE",
        style: TextStyle(
          color: brandOrange,
          fontSize: 10,
          fontWeight: FontWeight.w900,
          letterSpacing: 1,
        ),
      ),
    );
  }

  Widget _buildVerifyRegistrationForm(
    bool isDark,
    Color onSurface,
    Color brandOrange,
  ) {
    final allFilled =
        _registrationOtpControllers.map((c) => c.text).join().length == 6;
    return Column(
      key: const ValueKey('verify_registration_form'),
      children: [
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            color: Colors.blue.withOpacity(0.1),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.blue.withOpacity(0.2)),
          ),
          child: const Icon(Icons.mark_email_read_outlined,
              color: Colors.blue, size: 30),
        ),
        const SizedBox(height: 16),
        Text(
          "Verify Account",
          style: GoogleFonts.outfit(
            color: onSurface,
            fontSize: 24,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 6),
        RichText(
          textAlign: TextAlign.center,
          text: TextSpan(
            style: TextStyle(
              color: onSurface.withOpacity(0.5),
              fontSize: 12,
              height: 1.5,
            ),
            children: [
              const TextSpan(text: "Please enter the 6-digit code sent to\n"),
              TextSpan(
                text: _registrationEmailController.text,
                style: TextStyle(
                  color: brandOrange,
                  fontWeight: FontWeight.bold,
                  decoration: TextDecoration.underline,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 28),
        if (_errorMessage.isNotEmpty) ...[
          _buildErrorBanner(_errorMessage),
          const SizedBox(height: 16),
        ],
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(
            6,
            (index) => Container(
              width: 38,
              height: 52,
              margin: const EdgeInsets.symmetric(horizontal: 2),
              decoration: BoxDecoration(
                color: onSurface.withOpacity(0.05),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: _registrationOtpControllers[index].text.isNotEmpty
                      ? brandOrange
                      : onSurface.withOpacity(0.1),
                  width: 1.5,
                ),
              ),
              child: Center(
                child: TextField(
                  controller: _registrationOtpControllers[index],
                  focusNode: _registrationOtpFocusNodes[index],
                  textAlign: TextAlign.center,
                  keyboardType: TextInputType.number,
                  maxLength: 1,
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: onSurface,
                    height: 1.0,
                  ),
                  decoration: const InputDecoration(
                    counterText: "",
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.zero,
                    isDense: true,
                  ),
                  onChanged: (val) {
                    if (val.isNotEmpty && index < 5)
                      FocusScope.of(context).requestFocus(
                        _registrationOtpFocusNodes[index + 1],
                      );
                    if (val.isEmpty && index > 0)
                      FocusScope.of(context).requestFocus(
                        _registrationOtpFocusNodes[index - 1],
                      );
                    setState(() {});
                  },
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 28),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: (_isVerifyingRegistration || !allFilled)
                ? null
                : _handleVerifyRegistration,
            style: ElevatedButton.styleFrom(
              backgroundColor: brandOrange,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 18),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
              elevation: 0,
            ),
            child: _isVerifyingRegistration
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      color: Colors.white,
                      strokeWidth: 2,
                    ),
                  )
                : const Text(
                    "ACTIVATE ACCOUNT",
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      letterSpacing: 2,
                    ),
                  ),
          ),
        ),
        const SizedBox(height: 16),
        _buildResendButton(
          timer: _resendRegistrationTimer,
          isLoading: _isResendingRegistration,
          onPressed: _handleResendRegistrationCode,
          onSurface: onSurface,
          brandOrange: brandOrange,
        ),
        const SizedBox(height: 4),
        TextButton.icon(
          onPressed: () => setState(() {
            _viewMode = 'login';
            _errorMessage = "";
          }),
          icon: Icon(
            Icons.arrow_back,
            size: 14,
            color: onSurface.withOpacity(0.5),
          ),
          label: Text(
            "BACK TO LOGIN",
            style: TextStyle(
              color: onSurface.withOpacity(0.5),
              fontSize: 10,
              fontWeight: FontWeight.bold,
              letterSpacing: 1,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildVerifyCodeForm(bool isDark, Color onSurface, Color brandOrange) {
    final allFilled = _otpControllers.map((c) => c.text).join().length == 6;
    return Column(
      key: const ValueKey('verify_code_form'),
      children: [
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            color: brandOrange.withOpacity(0.1),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: brandOrange.withOpacity(0.2)),
          ),
          child: Icon(Icons.lock_outline, color: brandOrange, size: 30),
        ),
        const SizedBox(height: 16),
        Text(
          "Verify Identity",
          style: GoogleFonts.outfit(
            color: onSurface,
            fontSize: 24,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 6),
        RichText(
          textAlign: TextAlign.center,
          text: TextSpan(
            style: TextStyle(
              color: onSurface.withOpacity(0.5),
              fontSize: 12,
              height: 1.5,
            ),
            children: [
              const TextSpan(text: "Enter the 6-digit sync code sent to\n"),
              TextSpan(
                text: _recoveryEmailController.text,
                style: TextStyle(
                  color: brandOrange,
                  fontWeight: FontWeight.bold,
                  decoration: TextDecoration.underline,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 28),
        if (_recoveryError != null) ...[
          _buildErrorBanner(_recoveryError!),
          const SizedBox(height: 16),
        ],
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(
            6,
            (index) => Container(
              width: 38,
              height: 52,
              margin: const EdgeInsets.symmetric(horizontal: 2),
              decoration: BoxDecoration(
                color: onSurface.withOpacity(0.05),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: _otpControllers[index].text.isNotEmpty
                      ? brandOrange
                      : onSurface.withOpacity(0.1),
                  width: 1.5,
                ),
              ),
              child: Center(
                child: TextField(
                  controller: _otpControllers[index],
                  focusNode: _otpFocusNodes[index],
                  textAlign: TextAlign.center,
                  keyboardType: TextInputType.number,
                  maxLength: 1,
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: onSurface,
                    height: 1.0, // Ensure no vertical extra spacing
                  ),
                  decoration: const InputDecoration(
                    counterText: "",
                    border: InputBorder.none,
                    contentPadding:
                        EdgeInsets.zero, // Remove all default padding
                    isDense: true, // Compress the field
                  ),
                  onChanged: (val) {
                    if (val.isNotEmpty && index < 5)
                      FocusScope.of(
                        context,
                      ).requestFocus(_otpFocusNodes[index + 1]);
                    if (val.isEmpty && index > 0)
                      FocusScope.of(
                        context,
                      ).requestFocus(_otpFocusNodes[index - 1]);
                    setState(() {});
                  },
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 28),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: (_isSendingRecovery || !allFilled)
                ? null
                : _handleVerifyCode,
            style: ElevatedButton.styleFrom(
              backgroundColor: brandOrange,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 18),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
              elevation: 0,
            ),
            child: _isSendingRecovery
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      color: Colors.white,
                      strokeWidth: 2,
                    ),
                  )
                : const Text(
                    "VERIFY CODE",
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      letterSpacing: 2,
                    ),
                  ),
          ),
        ),
        const SizedBox(height: 16),
        const SizedBox(height: 16),
        _buildResendButton(
          timer: _resendTimer,
          isLoading: _isSendingRecovery,
          onPressed: _handleRecovery,
          onSurface: onSurface,
          brandOrange: brandOrange,
        ),
        const SizedBox(height: 4),
        TextButton.icon(
          onPressed: () => setState(() {
            _viewMode = 'forgot_password';
            _recoveryError = null;
          }),
          icon: Icon(
            Icons.arrow_back,
            size: 14,
            color: onSurface.withOpacity(0.5),
          ),
          label: Text(
            "BACK",
            style: TextStyle(
              color: onSurface.withOpacity(0.5),
              fontSize: 10,
              fontWeight: FontWeight.bold,
              letterSpacing: 1,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildResetPasswordForm(
    bool isDark,
    Color onSurface,
    Color brandOrange,
  ) {
    final pw = _newPasswordController.text;
    final strengthLabel = _passwordStrengthLabel(pw);
    final strengthColor = _strengthColor(strengthLabel, brandOrange);
    return SingleChildScrollView(
      key: const ValueKey('reset_password_form'),
      child: Column(
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: brandOrange.withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: brandOrange.withOpacity(0.2)),
            ),
            child: Icon(Icons.lock_reset, color: brandOrange, size: 30),
          ),
          const SizedBox(height: 16),
          Text(
            "Security Update",
            style: GoogleFonts.outfit(
              color: onSurface,
              fontSize: 24,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 6),
          RichText(
            textAlign: TextAlign.center,
            text: TextSpan(
              style: TextStyle(
                color: onSurface.withOpacity(0.5),
                fontSize: 12,
                height: 1.5,
              ),
              children: [
                const TextSpan(text: "Identity verified. Please set your "),
                TextSpan(
                  text: "secure password",
                  style: TextStyle(
                    color: brandOrange,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          if (_recoveryError != null) ...[
            _buildErrorBanner(_recoveryError!),
            const SizedBox(height: 16),
          ],
          // New password
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              "NEW PASSWORD",
              style: TextStyle(
                color: onSurface.withOpacity(0.4),
                fontSize: 10,
                fontWeight: FontWeight.w900,
                letterSpacing: 2,
              ),
            ),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _newPasswordController,
            obscureText: _obscureNewPassword,
            style: TextStyle(color: onSurface, fontSize: 14),
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(
              hintText: "New Password",
              hintStyle: TextStyle(color: onSurface.withOpacity(0.2)),
              prefixIcon: Icon(
                Icons.lock_outline,
                color: onSurface.withOpacity(0.3),
                size: 18,
              ),
              suffixIcon: IconButton(
                icon: Icon(
                  _obscureNewPassword
                      ? Icons.visibility_outlined
                      : Icons.visibility_off_outlined,
                  color: onSurface.withOpacity(0.4),
                  size: 18,
                ),
                onPressed: () =>
                    setState(() => _obscureNewPassword = !_obscureNewPassword),
              ),
              filled: true,
              fillColor: onSurface.withOpacity(0.02),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(20),
                borderSide: BorderSide(color: onSurface.withOpacity(0.05)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(20),
                borderSide: BorderSide(color: onSurface.withOpacity(0.05)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(20),
                borderSide: BorderSide(color: brandOrange.withOpacity(0.5)),
              ),
            ),
          ),
          if (pw.isNotEmpty) ...[
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "SECURITY STRENGTH",
                  style: TextStyle(
                    color: onSurface.withOpacity(0.4),
                    fontSize: 9,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.5,
                  ),
                ),
                Text(
                  strengthLabel.toUpperCase(),
                  style: TextStyle(
                    color: strengthColor,
                    fontSize: 9,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                _strengthBar(pw.length >= 8, brandOrange),
                const SizedBox(width: 3),
                _strengthBar(pw.contains(RegExp(r'[A-Z]')), brandOrange),
                const SizedBox(width: 3),
                _strengthBar(pw.contains(RegExp(r'[0-9]')), brandOrange),
                const SizedBox(width: 3),
                _strengthBar(
                  pw.contains(RegExp(r'[^A-Za-z0-9]')),
                  Colors.green,
                ),
              ],
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 4,
              children: [
                _strengthChip("8+ CHARS", pw.length >= 8, onSurface),
                _strengthChip(
                  "CAPITAL A-Z",
                  pw.contains(RegExp(r'[A-Z]')),
                  onSurface,
                ),
                _strengthChip(
                  "NUMBER 0-9",
                  pw.contains(RegExp(r'[0-9]')),
                  onSurface,
                ),
                _strengthChip(
                  "SPECIAL #\$!",
                  pw.contains(RegExp(r'[^A-Za-z0-9]')),
                  onSurface,
                ),
              ],
            ),
          ],
          const SizedBox(height: 20),
          // Confirm password
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              "CONFIRM NEW PASSWORD",
              style: TextStyle(
                color: onSurface.withOpacity(0.4),
                fontSize: 10,
                fontWeight: FontWeight.w900,
                letterSpacing: 2,
              ),
            ),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _confirmPasswordController,
            obscureText: _obscureConfirmPassword,
            style: TextStyle(color: onSurface, fontSize: 14),
            decoration: InputDecoration(
              hintText: "Confirm Password",
              hintStyle: TextStyle(color: onSurface.withOpacity(0.2)),
              prefixIcon: Icon(
                Icons.lock_outline,
                color: onSurface.withOpacity(0.3),
                size: 18,
              ),
              suffixIcon: IconButton(
                icon: Icon(
                  _obscureConfirmPassword
                      ? Icons.visibility_outlined
                      : Icons.visibility_off_outlined,
                  color: onSurface.withOpacity(0.4),
                  size: 18,
                ),
                onPressed: () => setState(
                  () => _obscureConfirmPassword = !_obscureConfirmPassword,
                ),
              ),
              filled: true,
              fillColor: onSurface.withOpacity(0.02),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(20),
                borderSide: BorderSide(color: onSurface.withOpacity(0.05)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(20),
                borderSide: BorderSide(color: onSurface.withOpacity(0.05)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(20),
                borderSide: BorderSide(color: brandOrange.withOpacity(0.5)),
              ),
            ),
          ),
          const SizedBox(height: 28),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: (_isSendingRecovery || pw.length < 6)
                  ? null
                  : _handleResetPassword,
              style: ElevatedButton.styleFrom(
                backgroundColor: brandOrange,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 18),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
                elevation: 0,
              ),
              child: _isSendingRecovery
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2,
                      ),
                    )
                  : const Text(
                      "FINALIZE UPDATE",
                      style: TextStyle(
                        fontWeight: FontWeight.w900,
                        letterSpacing: 2,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildResetCompleteView(
    bool isDark,
    Color onSurface,
    Color brandOrange,
  ) {
    return Column(
      key: const ValueKey('reset_complete_view'),
      children: [
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            color: Colors.green.withOpacity(0.1),
            borderRadius: BorderRadius.circular(32),
            border: Border.all(color: Colors.green.withOpacity(0.2)),
          ),
          child: const Icon(
            Icons.check_circle_outline,
            color: Colors.green,
            size: 32,
          ),
        ),
        const SizedBox(height: 24),
        Text(
          "Reset Complete",
          style: GoogleFonts.outfit(
            color: onSurface,
            fontSize: 24,
            fontWeight: FontWeight.w900,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 12),
        Text(
          "Your password has been successfully updated.\nYou may now sign in with your new credentials.",
          textAlign: TextAlign.center,
          style: TextStyle(
            color: onSurface.withOpacity(0.6),
            fontSize: 13,
            height: 1.5,
          ),
        ),
        const SizedBox(height: 40),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () => setState(() {
              _viewMode = 'login';
              _recoveryEmailController.clear();
              for (var c in _otpControllers) c.clear();
              _newPasswordController.clear();
              _confirmPasswordController.clear();
              _recoveryError = null;
            }),
            style: ElevatedButton.styleFrom(
              backgroundColor: brandOrange,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 18),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
              elevation: 0,
            ),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.arrow_back, size: 16),
                SizedBox(width: 8),
                Text(
                  "BACK TO SIGN IN",
                  style: TextStyle(
                    fontWeight: FontWeight.w900,
                    letterSpacing: 2,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final brandOrange = AppTheme.primaryOrange;
    final onSurface = isDark ? Colors.white : const Color(0xFF0F172A);

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: Stack(
        children: [
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(
                horizontal: 32.0,
                vertical: 24.0,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header Branding
                  FadeInDown(
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Flexible(
                          child: FittedBox(
                            fit: BoxFit.scaleDown,
                            alignment: Alignment.centerLeft,
                            child: const PulsoBranding(
                              scale: 0.55,
                              subtitle: 'RESIDENT PORTAL',
                            ),
                          ),
                        ),
                        const SizedBox(width: 4),
                        // Navigation & Theme
                        Flexible(
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              // Theme Toggle
                              Container(
                                padding: const EdgeInsets.all(2),
                                decoration: BoxDecoration(
                                  color: onSurface.withOpacity(0.05),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Row(
                                  children: [
                                    _buildThemeButton(
                                      context,
                                      ThemeMode.light,
                                      Icons.wb_sunny_outlined,
                                      onSurface,
                                    ),
                                    _buildThemeButton(
                                      context,
                                      ThemeMode.system,
                                      Icons.settings_brightness_outlined,
                                      onSurface,
                                    ),
                                    _buildThemeButton(
                                      context,
                                      ThemeMode.dark,
                                      Icons.nightlight_outlined,
                                      onSurface,
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              // Home Navigation
                              GestureDetector(
                                onTap: () => Navigator.pushNamedAndRemoveUntil(
                                  context,
                                  '/',
                                  (route) => false,
                                ),
                                child: Row(
                                  children: [
                                    Icon(
                                      Icons.home_outlined,
                                      color: brandOrange,
                                      size: 18,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      "Home",
                                      style: TextStyle(
                                        color: brandOrange,
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 60),

                  // Login Card
                  FadeInUp(
                    child: Container(
                      padding: const EdgeInsets.all(32),
                      decoration: BoxDecoration(
                        color: isDark
                            ? Colors.white.withOpacity(0.03)
                            : Colors.white,
                        borderRadius: BorderRadius.circular(40),
                        border: Border.all(color: onSurface.withOpacity(0.05)),
                        boxShadow: isDark
                            ? []
                            : [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.05),
                                  blurRadius: 30,
                                  offset: const Offset(0, 15),
                                ),
                              ],
                      ),
                      child: Column(
                        children: [
                          AnimatedSwitcher(
                            duration: const Duration(milliseconds: 300),
                            transitionBuilder:
                                (Widget child, Animation<double> animation) {
                                  return FadeTransition(
                                    opacity: animation,
                                    child: SlideTransition(
                                      position: Tween<Offset>(
                                        begin: const Offset(0.0, 0.05),
                                        end: Offset.zero,
                                      ).animate(animation),
                                      child: child,
                                    ),
                                  );
                                },
                            child: _viewMode == 'login'
                                ? _buildLoginForm(
                                    isDark,
                                    onSurface,
                                    brandOrange,
                                  )
                                : _viewMode == 'verify_registration'
                                    ? _buildVerifyRegistrationForm(
                                        isDark,
                                        onSurface,
                                        brandOrange,
                                      )
                                    : _viewMode == 'forgot_password'
                                        ? _buildForgotPasswordForm(
                                            isDark,
                                            onSurface,
                                            brandOrange,
                                          )
                                        : _viewMode == 'verify_code'
                                            ? _buildVerifyCodeForm(
                                                isDark,
                                                onSurface,
                                                brandOrange,
                                              )
                                            : _viewMode == 'reset_password'
                                ? _buildResetPasswordForm(
                                    isDark,
                                    onSurface,
                                    brandOrange,
                                  )
                                : _buildResetCompleteView(
                                    isDark,
                                    onSurface,
                                    brandOrange,
                                  ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 60),

                  // Footer
                  Center(
                    child: Opacity(
                      opacity: 0.3,
                      child: Text(
                        "NOTICE: RESIDENTS ONLY • CITY OF CALOOCAN",
                        style: TextStyle(
                          color: onSurface,
                          fontSize: 9,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.5,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 40),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildThemeButton(
    BuildContext context,
    ThemeMode mode,
    IconData icon,
    Color onSurface,
  ) {
    final settings = context.watch<SettingsProvider>();
    final isSelected = settings.themeMode == mode;
    final brandOrange = AppTheme.primaryOrange;

    return GestureDetector(
      onTap: () => context.read<SettingsProvider>().setThemeMode(mode),
      child: Container(
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: isSelected ? onSurface.withOpacity(0.1) : Colors.transparent,
          borderRadius: BorderRadius.circular(15),
        ),
        child: Icon(
          icon,
          size: 14,
          color: isSelected ? brandOrange : onSurface.withOpacity(0.35),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM WIDGETS
// ─────────────────────────────────────────────────────────────────────────────

class CaptchaDialog extends StatefulWidget {
  const CaptchaDialog({super.key});

  @override
  State<CaptchaDialog> createState() => _CaptchaDialogState();
}

class _CaptchaDialogState extends State<CaptchaDialog> {
  late final WebViewController _controller;
  bool _isReady = false;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.transparent)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (url) => setState(() => _isReady = true),
        ),
      )
      ..addJavaScriptChannel(
        'CaptchaChannel',
        onMessageReceived: (message) {
          Navigator.pop(context, message.message);
        },
      )
      ..loadHtmlString(_getHtml());
  }

  String _getHtml() {
    return '''
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://www.google.com/recaptcha/api.js" async defer></script>
          <style>
            body { margin: 0; display: flex; justify-content: center; align-items: center; background: transparent; height: 100vh; }
            .g-recaptcha { transform: scale(1.1); transform-origin: center; }
          </style>
        </head>
        <body>
          <div class="g-recaptcha" 
               data-sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI" 
               data-callback="onVerify"
               data-theme="dark"></div>
          <script>
            function onVerify(token) {
              CaptchaChannel.postMessage(token);
            }
          </script>
        </body>
      </html>
    ''';
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: 340,
        height: 520,
        margin: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: const Color(0xFF0F172A),
          borderRadius: BorderRadius.circular(32),
          border: Border.all(color: Colors.white.withOpacity(0.1)),
        ),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                children: [
                  const Icon(
                    Icons.shield_outlined,
                    color: Color(0xFFFF6600),
                    size: 40,
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    "Security Verification",
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    "Please prove you are not a robot to proceed with the secure login.",
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.5),
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(
                  bottom: Radius.circular(32),
                ),
                child: WebViewWidget(controller: _controller),
              ),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text(
                "Cancel Verification",
                style: TextStyle(color: Colors.white38, fontSize: 12),
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}
