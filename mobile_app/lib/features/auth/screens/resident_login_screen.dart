import 'package:pulso_mobile/widgets/pulso_icon.dart';
// ignore_for_file: use_build_context_synchronously
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:pulso_mobile/core/api/api_client.dart';
import 'package:pulso_mobile/core/theme/app_theme.dart';
import 'package:pulso_mobile/core/providers/settings_provider.dart';

/// Mirrors the website's Login.jsx exactly:
///  - view='login'      → Login form with email/password, role guard
///  - view='verify'     → Account verification OTP (unverified accounts)
///  - view='forgot'     → Step 1: enter email
///  - view='forgot_otp' → Step 2: 6-digit OTP
///  - view='forgot_pw'  → Step 3: set new password (with strength meter)
///  - view='reset_done' → Success state
class ResidentLoginScreen extends StatefulWidget {
  const ResidentLoginScreen({super.key});

  @override
  State<ResidentLoginScreen> createState() => _ResidentLoginScreenState();
}

class _ResidentLoginScreenState extends State<ResidentLoginScreen>
    with SingleTickerProviderStateMixin {
  // ─── View state ────────────────────────────────────────────────────────────
  /// 'login' | 'verify' | 'forgot' | 'forgot_otp' | 'forgot_pw' | 'reset_done'
  String _view = 'login';

  // ─── Login fields ──────────────────────────────────────────────────────────
  final _emailCtrl    = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _showPassword  = false;
  bool _isLoading     = false;
  String _error       = '';

  // ─── Account Verification (unverified accounts) ────────────────────────────
  String _verifyEmail = '';
  final _verifyOtpCtrls = List.generate(6, (_) => TextEditingController());
  final _verifyOtpNodes = List.generate(6, (_) => FocusNode());
  bool _verifySuccess  = false;
  int  _resendTimer    = 0;
  bool _canResend      = true;

  // ─── Forgot Password ───────────────────────────────────────────────────────
  final _forgotEmailCtrl   = TextEditingController();
  final _recoveryOtpCtrls  = List.generate(6, (_) => TextEditingController());
  final _recoveryOtpNodes  = List.generate(6, (_) => FocusNode());
  final _newPassCtrl       = TextEditingController();
  final _confirmPassCtrl   = TextEditingController();
  bool _showNewPass        = false;
  bool _showConfirmPass    = false;
  int  _forgotResendTimer  = 0;
  bool _forgotCanResend    = true;

  // ─── Animation ─────────────────────────────────────────────────────────────
  late AnimationController _fadeCtrl;
  late Animation<double> _fadeAnim;

  String get _base => ApiClient.baseUrl;

  @override
  void initState() {
    super.initState();
    _fadeCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 500));
    _fadeAnim = CurvedAnimation(parent: _fadeCtrl, curve: Curves.easeOut);
    _fadeCtrl.forward();
  }

  @override
  void dispose() {
    _fadeCtrl.dispose();
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _forgotEmailCtrl.dispose();
    _newPassCtrl.dispose();
    _confirmPassCtrl.dispose();
    for (final c in [..._verifyOtpCtrls, ..._recoveryOtpCtrls]) {
      c.dispose();
    }
    for (final f in [..._verifyOtpNodes, ..._recoveryOtpNodes]) {
      f.dispose();
    }
    super.dispose();
  }

  // ─── Timer helpers ─────────────────────────────────────────────────────────
  void _startResendTimer() {
    Future.delayed(const Duration(seconds: 1), () {
      if (!mounted || _resendTimer == 0) return;
      setState(() => _resendTimer--);
      if (_resendTimer > 0) _startResendTimer();
    });
  }

  void _startForgotResendTimer() {
    Future.delayed(const Duration(seconds: 1), () {
      if (!mounted || _forgotResendTimer == 0) return;
      setState(() => _forgotResendTimer--);
      if (_forgotResendTimer > 0) _startForgotResendTimer();
    });
  }

  // ─── Login ─────────────────────────────────────────────────────────────────
  Future<void> _handleLogin() async {
    setState(() { _isLoading = true; _error = ''; });
    try {
      final res = await http.post(
        Uri.parse('$_base/api/auth/login'),
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: {
          'username': _emailCtrl.text.trim(),
          'password': _passwordCtrl.text,
          'captcha_token': 'mobile_bypass',
        },
      ).timeout(const Duration(seconds: 15));

      final data = json.decode(res.body);

      if (res.statusCode == 200) {
        // Role guard — website does: if (data.user.role !== 'resident')
        final role = (data['user']?['role'] ?? '').toString();
        if (role != 'resident') {
          setState(() {
            _error = 'This portal is for residents only. Authorized personnel please use the Government Gateway.';
          });
          return;
        }
        await ApiClient.saveToken(data['access_token']);
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('pulso_user', json.encode(data['user']));
        if (!mounted) return;
        Navigator.pushReplacementNamed(context, '/home');
      } else if (res.statusCode == 403) {
        final detail = data['detail']?.toString() ?? '';
        if (detail.contains('not verified')) {
          // Redirect to verify view — same as Login.jsx
          setState(() {
            _verifyEmail = _emailCtrl.text.trim();
            for (final c in _verifyOtpCtrls) { c.clear(); }
            _verifySuccess = false;
            _resendTimer   = 60;
            _canResend     = false;
            _view          = 'verify';
            _error         = '';
          });
          _startResendTimer();
          return;
        }
        setState(() => _error = detail.isNotEmpty ? detail : 'Authentication failed.');
      } else {
        final detail = data['detail'];
        final msg = detail is List
            ? detail.first['msg']?.toString()
            : detail?.toString();
        setState(() => _error = msg ?? 'Authentication failed.');
      }
    } catch (_) {
      setState(() => _error = 'Network error. Is the backend running?');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // ─── Account Verification ──────────────────────────────────────────────────
  Future<void> _handleVerifyRegistration() async {
    final code = _verifyOtpCtrls.map((c) => c.text).join();
    if (code.length < 6) return;
    setState(() { _isLoading = true; _error = ''; });
    try {
      final res = await http.post(
        Uri.parse('$_base/api/auth/verify-registration'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'email': _verifyEmail, 'code': code}),
      ).timeout(const Duration(seconds: 15));
      if (res.statusCode == 200) {
        setState(() => _verifySuccess = true);
      } else {
        final data = json.decode(res.body);
        final detail = data['detail'];
        final msg = detail is List ? detail.first['msg']?.toString() : detail?.toString();
        setState(() => _error = msg ?? 'Verification failed.');
      }
    } catch (_) {
      setState(() => _error = 'Network error. Please try again.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleResendRegistrationCode() async {
    if (!_canResend) return;
    setState(() { _isLoading = true; _error = ''; });
    try {
      await http.post(
        Uri.parse('$_base/api/auth/resend-code'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'email': _verifyEmail}),
      ).timeout(const Duration(seconds: 15));
      setState(() { _resendTimer = 60; _canResend = false; });
      _startResendTimer();
    } catch (_) {
      setState(() => _error = 'Failed to resend. Please try again.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // ─── Forgot Password Step 1: send email ────────────────────────────────────
  Future<void> _handleRecovery() async {
    setState(() { _isLoading = true; _error = ''; });
    for (final c in _recoveryOtpCtrls) { c.clear(); }
    try {
      final res = await http.post(
        Uri.parse('$_base/api/auth/forgot-password'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'email': _forgotEmailCtrl.text.trim()}),
      ).timeout(const Duration(seconds: 15));
      final data = json.decode(res.body);
      if (res.statusCode == 200) {
        setState(() {
          _view             = 'forgot_otp';
          _forgotResendTimer = 60;
          _forgotCanResend  = false;
        });
        _startForgotResendTimer();
      } else {
        final detail = data['detail'];
        final msg = detail is List ? detail.first['msg']?.toString() : detail?.toString();
        setState(() => _error = msg ?? 'Recovery request failed.');
      }
    } catch (_) {
      setState(() => _error = 'Network error. Please try again.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // ─── Forgot Password Step 2: verify OTP ────────────────────────────────────
  Future<void> _handleVerifyRecoveryCode() async {
    final code = _recoveryOtpCtrls.map((c) => c.text).join();
    if (code.length < 6) return;
    setState(() { _isLoading = true; _error = ''; });
    try {
      final res = await http.post(
        Uri.parse('$_base/api/auth/verify-reset-code'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'email': _forgotEmailCtrl.text.trim(), 'code': code}),
      ).timeout(const Duration(seconds: 15));
      if (res.statusCode == 200) {
        setState(() => _view = 'forgot_pw');
      } else {
        final data = json.decode(res.body);
        final detail = data['detail'];
        final msg = detail is List ? detail.first['msg']?.toString() : detail?.toString();
        setState(() => _error = msg ?? 'Identity verification failed: Invalid code.');
      }
    } catch (_) {
      setState(() => _error = 'Network error. Please try again.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // ─── Forgot Password Step 3: reset password ────────────────────────────────
  Future<void> _handleResetPassword() async {
    if (_newPassCtrl.text != _confirmPassCtrl.text) {
      setState(() => _error = 'Passwords do not match.');
      return;
    }
    if (_newPassCtrl.text.length < 6) {
      setState(() => _error = 'Password must be at least 6 characters.');
      return;
    }
    setState(() { _isLoading = true; _error = ''; });
    try {
      final code = _recoveryOtpCtrls.map((c) => c.text).join();
      final res = await http.post(
        Uri.parse('$_base/api/auth/reset-password'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'email':        _forgotEmailCtrl.text.trim(),
          'code':         code,
          'new_password': _newPassCtrl.text,
        }),
      ).timeout(const Duration(seconds: 15));
      if (res.statusCode == 200) {
        setState(() => _view = 'reset_done');
      } else {
        final data = json.decode(res.body);
        final detail = data['detail'];
        final msg = detail is List ? detail.first['msg']?.toString() : detail?.toString();
        setState(() => _error = msg ?? 'Password reset failed.');
      }
    } catch (_) {
      setState(() => _error = 'Network error. Please try again.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // ─── OTP input helpers ─────────────────────────────────────────────────────
  void _handleOtpChange(int i, String v, List<TextEditingController> ctrls, List<FocusNode> nodes) {
    if (!RegExp(r'^\d*$').hasMatch(v)) return;
    final newVal = v.isNotEmpty ? v[v.length - 1] : '';
    ctrls[i].text = newVal;
    ctrls[i].selection = TextSelection.fromPosition(TextPosition(offset: ctrls[i].text.length));
    if (newVal.isNotEmpty && i < 5) {
      nodes[i + 1].requestFocus();
    } else if (newVal.isEmpty && i > 0) {
      nodes[i - 1].requestFocus();
    }
    setState(() {});
  }

  // ─── Password strength ─────────────────────────────────────────────────────
  ({String label, Color color, int score}) _strength(String pw) {
    if (pw.isEmpty) return (label: '', color: Colors.transparent, score: 0);
    final lengthOk  = pw.length >= 8;
    final hasUpper  = pw.contains(RegExp(r'[A-Z]'));
    final hasNumber = pw.contains(RegExp(r'[0-9]'));
    final hasSpecial= pw.contains(RegExp(r'[^A-Za-z0-9]'));
    final score = [lengthOk, hasUpper, hasNumber, hasSpecial].where((b) => b).length;
    if (score <= 1) return (label: 'Weak', color: Colors.redAccent, score: score);
    if (score <= 3) return (label: 'Medium', color: Colors.orange, score: score);
    return (label: 'Strong', color: Colors.green, score: score);
  }

  // ─── Build ─────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    final isDark  = Theme.of(context).brightness == Brightness.dark;
    final bg      = isDark ? const Color(0xFF020617) : const Color(0xFFF8FAFC);
    final surface = isDark ? const Color(0xFF0F172A) : Colors.white;
    final text    = isDark ? Colors.white : const Color(0xFF0F172A);

    return Scaffold(
      backgroundColor: bg,
      body: SafeArea(
        child: FadeTransition(
          opacity: _fadeAnim,
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildNavRow(isDark, text),
                const SizedBox(height: 28),
                _buildHero(isDark, text),
                const SizedBox(height: 32),
                _buildCard(isDark, surface, text),
                const SizedBox(height: 24),
                if (_view == 'login') _buildRegisterLink(text),
                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ─── Nav row ───────────────────────────────────────────────────────────────
  Widget _buildNavRow(bool isDark, Color text) {
    final canGoBack = _view != 'login';
    return Row(
      children: [
        if (canGoBack)
          GestureDetector(
            onTap: () => setState(() {
              _error = '';
              switch (_view) {
                case 'verify':       _view = 'login'; break;
                case 'forgot':       _view = 'login'; break;
                case 'forgot_otp':   _view = 'forgot'; break;
                case 'forgot_pw':    _view = 'forgot_otp'; break;
                case 'reset_done':   _view = 'login'; break;
                default:             _view = 'login';
              }
            }),
            child: Row(
              children: [
                PulsoIcon(Icons.arrow_back_ios_new, size: 16, color: text.withOpacity(0.5)),
                const SizedBox(width: 4),
                Text('Back', style: TextStyle(color: text.withOpacity(0.5), fontSize: 12, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        const Spacer(),
        _ThemeToggle(onSurface: text),
      ],
    );
  }

  // ─── Hero branding (mirrors the left-side of Login.jsx) ───────────────────
  Widget _buildHero(bool isDark, Color text) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            PulsoIcon(Icons.graphic_eq, size: 16, color: AppTheme.primaryOrange),
            const SizedBox(width: 6),
            Text(
              'CITIZEN ACCESS PORTAL',
              style: GoogleFonts.outfit(
                fontSize: 10,
                fontWeight: FontWeight.w900,
                color: AppTheme.primaryOrange,
                letterSpacing: 3,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        RichText(
          text: TextSpan(
            style: GoogleFonts.outfit(
              fontSize: 32,
              fontWeight: FontWeight.w900,
              color: text,
              letterSpacing: -1,
              height: 0.95,
            ),
            children: [
              const TextSpan(text: 'THE PULSE OF\n'),
              TextSpan(
                text: 'COMMUNITY',
                style: TextStyle(
                  foreground: Paint()
                    ..shader = const LinearGradient(
                      colors: [Color(0xFFEA580C), Color(0xFFDC2626)],
                    ).createShader(const Rect.fromLTWH(0, 0, 200, 32)),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Access your resident dashboard to track local hazard reports and interact with community engineering teams.',
          style: GoogleFonts.outfit(
            fontSize: 12,
            color: text.withOpacity(0.45),
            fontWeight: FontWeight.w500,
            height: 1.5,
          ),
        ),
      ],
    );
  }

  // ─── Main card (glassmorphism — mirrors the right card in Login.jsx) ───────
  Widget _buildCard(bool isDark, Color surface, Color text) {
    return Container(
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withOpacity(0.04)
            : Colors.white.withOpacity(0.85),
        borderRadius: BorderRadius.circular(36),
        border: Border.all(
          color: isDark ? Colors.white.withOpacity(0.08) : Colors.black.withOpacity(0.06),
        ),
        boxShadow: [
          BoxShadow(
            color: isDark
                ? Colors.black.withOpacity(0.4)
                : Colors.black.withOpacity(0.07),
            blurRadius: 40,
            offset: const Offset(0, 16),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 280),
          switchInCurve: Curves.easeOut,
          switchOutCurve: Curves.easeIn,
          child: _buildCurrentView(isDark, text),
        ),
      ),
    );
  }

  Widget _buildCurrentView(bool isDark, Color text) {
    switch (_view) {
      case 'verify':      return _buildVerifyView(isDark, text, key: const ValueKey('verify'));
      case 'forgot':      return _buildForgotStep1(isDark, text, key: const ValueKey('forgot'));
      case 'forgot_otp':  return _buildForgotStep2(isDark, text, key: const ValueKey('forgot_otp'));
      case 'forgot_pw':   return _buildForgotStep3(isDark, text, key: const ValueKey('forgot_pw'));
      case 'reset_done':  return _buildResetDone(isDark, text, key: const ValueKey('reset_done'));
      default:            return _buildLoginView(isDark, text, key: const ValueKey('login'));
    }
  }

  // ─── LOGIN VIEW ────────────────────────────────────────────────────────────
  Widget _buildLoginView(bool isDark, Color text, {Key? key}) {
    return Column(
      key: key,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Icon + title header
        Center(
          child: Column(children: [
            Container(
              width: 72, height: 72,
              decoration: BoxDecoration(
                color: isDark
                    ? Colors.white.withOpacity(0.05)
                    : const Color(0xFFFFF7ED),
                borderRadius: BorderRadius.circular(22),
                border: Border.all(
                  color: isDark
                      ? Colors.white.withOpacity(0.1)
                      : const Color(0xFFFED7AA),
                ),
              ),
              child: const PulsoIcon(Icons.person_outline_rounded, size: 36, color: Color(0xFFEA580C)),
            ),
            const SizedBox(height: 16),
            Text('Login', style: GoogleFonts.outfit(fontSize: 28, fontWeight: FontWeight.w900, color: text, letterSpacing: -0.5)),
            const SizedBox(height: 4),
            Text('Sign in to access your community dashboard', style: TextStyle(color: text.withOpacity(0.45), fontSize: 12)),
          ]),
        ),
        const SizedBox(height: 28),

        if (_error.isNotEmpty) ...[
          _errorBanner(_error, text),
          const SizedBox(height: 20),
        ],

        // Email
        _fieldLabel('MOBILE NUMBER OR EMAIL', text),
        const SizedBox(height: 8),
        _textField(
          ctrl: _emailCtrl,
          hint: 'Enter your credential',
          prefix: Icons.person_outline_rounded,
          isDark: isDark, text: text,
          onSubmitted: (_) => FocusScope.of(context).nextFocus(),
        ),
        const SizedBox(height: 20),

        // Password
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _fieldLabel('PASSWORD', text),
            GestureDetector(
              onTap: () => setState(() { _view = 'forgot'; _error = ''; }),
              child: Text('Forgot Password?', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: AppTheme.primaryOrange, letterSpacing: 1.5)),
            ),
          ],
        ),
        const SizedBox(height: 8),
        _textField(
          ctrl: _passwordCtrl,
          hint: 'Enter Password',
          prefix: Icons.shield_outlined,
          isDark: isDark, text: text,
          obscure: !_showPassword,
          suffix: IconButton(
            icon: PulsoIcon(_showPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 18, color: text.withOpacity(0.35)),
            onPressed: () => setState(() => _showPassword = !_showPassword),
          ),
          onSubmitted: (_) => _handleLogin(),
        ),
        const SizedBox(height: 28),

        _primaryButton(label: 'Sign In', isLoading: _isLoading, onTap: _handleLogin, icon: Icons.chevron_right_rounded),
      ],
    );
  }

  // ─── ACCOUNT VERIFICATION VIEW ─────────────────────────────────────────────
  Widget _buildVerifyView(bool isDark, Color text, {Key? key}) {
    if (_verifySuccess) {
      return Column(
        key: key,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Column(children: [
              Container(
                width: 72, height: 72,
                decoration: BoxDecoration(
                  color: Colors.green.withOpacity(0.1),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.green.withOpacity(0.2)),
                ),
                child: const PulsoIcon(Icons.check_circle_outline_rounded, color: Colors.green, size: 40),
              ),
              const SizedBox(height: 16),
              Text('Account Verified', style: GoogleFonts.outfit(fontSize: 26, fontWeight: FontWeight.w900, color: text, letterSpacing: -0.5)),
              const SizedBox(height: 8),
              Text(
                'Congratulations! Your official registration has been activated.\nYou may now proceed to sign in to your dashboard.',
                textAlign: TextAlign.center,
                style: TextStyle(color: text.withOpacity(0.45), fontSize: 12, height: 1.6),
              ),
            ]),
          ),
          const SizedBox(height: 28),
          _primaryButton(
            label: 'Continue to Sign In',
            icon: Icons.chevron_right_rounded,
            onTap: () => setState(() {
              _view = 'login';
              _verifySuccess = false;
              for (final c in _verifyOtpCtrls) { c.clear(); }
            }),
          ),
        ],
      );
    }

    return Column(
      key: key,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Center(
          child: Column(children: [
            Container(
              width: 72, height: 72,
              decoration: BoxDecoration(
                color: isDark ? Colors.white.withOpacity(0.05) : const Color(0xFFFFF7ED),
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: isDark ? Colors.white.withOpacity(0.1) : const Color(0xFFFED7AA)),
              ),
              child: const PulsoIcon(Icons.shield_outlined, size: 36, color: Color(0xFFEA580C)),
            ),
            const SizedBox(height: 16),
            Text('Verify Account', style: GoogleFonts.outfit(fontSize: 26, fontWeight: FontWeight.w900, color: text, letterSpacing: -0.5)),
            const SizedBox(height: 4),
            RichText(
              textAlign: TextAlign.center,
              text: TextSpan(
                style: TextStyle(color: text.withOpacity(0.45), fontSize: 12),
                children: [
                  const TextSpan(text: 'Enter the 6-digit verification code sent to\n'),
                  TextSpan(
                    text: _verifyEmail,
                    style: const TextStyle(color: Color(0xFFEA580C), fontWeight: FontWeight.bold, decoration: TextDecoration.underline),
                  ),
                ],
              ),
            ),
          ]),
        ),
        const SizedBox(height: 28),

        if (_error.isNotEmpty) ...[
          _errorBanner(_error, text),
          const SizedBox(height: 20),
        ],

        _buildOtpRow(_verifyOtpCtrls, _verifyOtpNodes, isDark, text),
        const SizedBox(height: 28),

        _primaryButton(
          label: 'Verify & Activate',
          isLoading: _isLoading,
          onTap: _verifyOtpCtrls.map((c) => c.text).join().length < 6 ? () {} : _handleVerifyRegistration,
        ),
        const SizedBox(height: 20),

        Center(
          child: _resendTimer > 0
              ? Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: text.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(30),
                  ),
                  child: Text(
                    'Resend code in ${_resendTimer}s',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: text.withOpacity(0.45), letterSpacing: 1.5),
                  ),
                )
              : GestureDetector(
                  onTap: _handleResendRegistrationCode,
                  child: Text(
                    'Resend Official Code',
                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFFEA580C), letterSpacing: 2, decoration: TextDecoration.underline),
                  ),
                ),
        ),
        const SizedBox(height: 20),
        Center(
          child: GestureDetector(
            onTap: () => setState(() { _view = 'login'; _error = ''; }),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                PulsoIcon(Icons.arrow_back_rounded, size: 14, color: text.withOpacity(0.4)),
                const SizedBox(width: 4),
                Text('Cancel Verification', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: text.withOpacity(0.4), letterSpacing: 2)),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // ─── FORGOT PASSWORD STEP 1: Enter Email ───────────────────────────────────
  Widget _buildForgotStep1(bool isDark, Color text, {Key? key}) {
    return Column(
      key: key,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Center(
          child: Column(children: [
            Container(
              width: 72, height: 72,
              decoration: BoxDecoration(
                color: isDark ? Colors.white.withOpacity(0.05) : Colors.grey.withOpacity(0.08),
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: isDark ? Colors.white.withOpacity(0.1) : Colors.black.withOpacity(0.08)),
              ),
              child: const PulsoIcon(Icons.shield_outlined, size: 36, color: Color(0xFFEA580C)),
            ),
            const SizedBox(height: 16),
            Text('Identity Retrieval', style: GoogleFonts.outfit(fontSize: 26, fontWeight: FontWeight.w900, color: text, letterSpacing: -0.5)),
            const SizedBox(height: 4),
            Text('Enter your email for account verification', style: TextStyle(color: text.withOpacity(0.45), fontSize: 12)),
          ]),
        ),
        const SizedBox(height: 28),

        if (_error.isNotEmpty) ...[_errorBanner(_error, text), const SizedBox(height: 20)],

        _fieldLabel('OFFICIAL EMAIL ADDRESS', text),
        const SizedBox(height: 8),
        _textField(ctrl: _forgotEmailCtrl, hint: 'your@email.com', prefix: Icons.mail_outline_rounded, isDark: isDark, text: text),
        const SizedBox(height: 28),

        _primaryButton(label: 'Verify Email', isLoading: _isLoading, onTap: _handleRecovery, icon: Icons.chevron_right_rounded),
      ],
    );
  }

  // ─── FORGOT PASSWORD STEP 2: OTP ───────────────────────────────────────────
  Widget _buildForgotStep2(bool isDark, Color text, {Key? key}) {
    return Column(
      key: key,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Center(
          child: Column(children: [
            Text('Verify Identity', style: GoogleFonts.outfit(fontSize: 26, fontWeight: FontWeight.w900, color: text, letterSpacing: -0.5)),
            const SizedBox(height: 4),
            RichText(
              textAlign: TextAlign.center,
              text: TextSpan(
                style: TextStyle(color: text.withOpacity(0.45), fontSize: 12),
                children: [
                  const TextSpan(text: 'Enter the 6-digit sync code sent to\n'),
                  TextSpan(
                    text: _forgotEmailCtrl.text.trim(),
                    style: const TextStyle(color: Color(0xFFEA580C), fontWeight: FontWeight.bold, decoration: TextDecoration.underline),
                  ),
                ],
              ),
            ),
          ]),
        ),
        const SizedBox(height: 28),

        if (_error.isNotEmpty) ...[_errorBanner(_error, text), const SizedBox(height: 20)],

        _buildOtpRow(_recoveryOtpCtrls, _recoveryOtpNodes, isDark, text),
        const SizedBox(height: 28),

        _primaryButton(
          label: 'Verify Code',
          isLoading: _isLoading,
          onTap: _recoveryOtpCtrls.map((c) => c.text).join().length < 6 ? () {} : _handleVerifyRecoveryCode,
        ),
        const SizedBox(height: 20),

        Center(
          child: _forgotResendTimer > 0
              ? Text('Resend code in ${_forgotResendTimer}s', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: text.withOpacity(0.4)))
              : GestureDetector(
                  onTap: _handleRecovery,
                  child: const Text('Resend Verification Code', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFFEA580C), letterSpacing: 1.5, decoration: TextDecoration.underline)),
                ),
        ),
      ],
    );
  }

  // ─── FORGOT PASSWORD STEP 3: New Password ──────────────────────────────────
  Widget _buildForgotStep3(bool isDark, Color text, {Key? key}) {
    final pw = _newPassCtrl.text;
    final str = _strength(pw);
    final lengthOk  = pw.length >= 8;
    final hasUpper  = pw.contains(RegExp(r'[A-Z]'));
    final hasNumber = pw.contains(RegExp(r'[0-9]'));
    final hasSpecial= pw.contains(RegExp(r'[^A-Za-z0-9]'));

    return Column(
      key: key,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Center(
          child: Column(children: [
            Text('Security Update', style: GoogleFonts.outfit(fontSize: 26, fontWeight: FontWeight.w900, color: text, letterSpacing: -0.5)),
            const SizedBox(height: 4),
            RichText(
              textAlign: TextAlign.center,
              text: TextSpan(
                style: TextStyle(color: text.withOpacity(0.45), fontSize: 12),
                children: [
                  const TextSpan(text: 'Identity verified. Please set your\n'),
                  const TextSpan(text: 'secure password', style: TextStyle(color: Color(0xFFEA580C), fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          ]),
        ),
        const SizedBox(height: 28),

        if (_error.isNotEmpty) ...[_errorBanner(_error, text), const SizedBox(height: 20)],

        Text('NEW PASSWORD', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: text.withOpacity(0.4), letterSpacing: 2)),
        const SizedBox(height: 8),
        _textField(
          ctrl: _newPassCtrl,
          hint: '••••••••',
          prefix: Icons.lock_outline_rounded,
          isDark: isDark, text: text,
          obscure: !_showNewPass,
          suffix: IconButton(
            icon: PulsoIcon(_showNewPass ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 16, color: text.withOpacity(0.3)),
            onPressed: () => setState(() => _showNewPass = !_showNewPass),
          ),
          onChanged: (_) => setState(() {}),
        ),

        // Password strength meter (mirrors website exactly)
        if (pw.isNotEmpty) ...[
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('SECURITY STRENGTH', style: TextStyle(fontSize: 8, fontWeight: FontWeight.w900, color: text.withOpacity(0.35), letterSpacing: 2)),
              Text(str.label, style: TextStyle(fontSize: 8, fontWeight: FontWeight.w900, color: str.color, letterSpacing: 1)),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Expanded(child: _strengthBar(lengthOk, isDark)),
              const SizedBox(width: 3),
              Expanded(child: _strengthBar(hasUpper, isDark)),
              const SizedBox(width: 3),
              Expanded(child: _strengthBar(hasNumber, isDark)),
              const SizedBox(width: 3),
              Expanded(child: Container(height: 4, decoration: BoxDecoration(
                color: hasSpecial ? Colors.green : (isDark ? Colors.white.withOpacity(0.08) : Colors.black.withOpacity(0.06)),
                borderRadius: BorderRadius.circular(2),
              ))),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6, runSpacing: 4,
            children: [
              _pillBadge('8+ CHARS', lengthOk, text),
              _pillBadge('CAPITAL A-Z', hasUpper, text),
              _pillBadge('NUMBER 0-9', hasNumber, text),
              _pillBadge('SPECIAL #\$!', hasSpecial, text),
            ],
          ),
        ],

        const SizedBox(height: 20),
        Text('CONFIRM NEW PASSWORD', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: text.withOpacity(0.4), letterSpacing: 2)),
        const SizedBox(height: 8),
        _textField(
          ctrl: _confirmPassCtrl,
          hint: '••••••••',
          prefix: Icons.lock_outline_rounded,
          isDark: isDark, text: text,
          obscure: !_showConfirmPass,
          suffix: IconButton(
            icon: PulsoIcon(_showConfirmPass ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 16, color: text.withOpacity(0.3)),
            onPressed: () => setState(() => _showConfirmPass = !_showConfirmPass),
          ),
        ),
        const SizedBox(height: 28),

        _primaryButton(label: 'Finalize Update', isLoading: _isLoading, onTap: _handleResetPassword),
      ],
    );
  }

  // ─── RESET DONE ────────────────────────────────────────────────────────────
  Widget _buildResetDone(bool isDark, Color text, {Key? key}) {
    return Column(
      key: key,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Center(
          child: Column(children: [
            Container(
              width: 72, height: 72,
              decoration: BoxDecoration(color: Colors.green.withOpacity(0.1), shape: BoxShape.circle, border: Border.all(color: Colors.green.withOpacity(0.2))),
              child: const PulsoIcon(Icons.check_circle_outline_rounded, color: Colors.green, size: 40),
            ),
            const SizedBox(height: 16),
            Text('Reset Complete', style: GoogleFonts.outfit(fontSize: 26, fontWeight: FontWeight.w900, color: text, letterSpacing: -0.5)),
            const SizedBox(height: 8),
            Text(
              'Your password has been successfully updated.\nYou may now sign in with your new credentials.',
              textAlign: TextAlign.center,
              style: TextStyle(color: text.withOpacity(0.45), fontSize: 12, height: 1.6),
            ),
          ]),
        ),
        const SizedBox(height: 28),
        _secondaryButton(
          label: 'Back to Sign In',
          icon: Icons.arrow_back_rounded,
          onTap: () => setState(() {
            _view = 'login';
            _forgotEmailCtrl.clear();
            _newPassCtrl.clear();
            _confirmPassCtrl.clear();
            for (final c in _recoveryOtpCtrls) { c.clear(); }
            _error = '';
          }),
        ),
      ],
    );
  }

  // ─── Register link (bottom) ────────────────────────────────────────────────
  Widget _buildRegisterLink(Color text) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text("Don't have an account? ", style: TextStyle(color: text.withOpacity(0.45), fontSize: 12, fontWeight: FontWeight.w500)),
            GestureDetector(
              onTap: () => Navigator.pushNamed(context, '/register'),
              child: const Text('Sign Up', style: TextStyle(color: Color(0xFFEA580C), fontSize: 12, fontWeight: FontWeight.bold, decoration: TextDecoration.underline)),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Text(
          'RESIDENTS ONLY • CITY OF CALOOCAN',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: text.withOpacity(0.2), letterSpacing: 3),
        ),
      ],
    );
  }

  // ─── OTP row widget ─────────────────────────────────────────────────────────
  Widget _buildOtpRow(List<TextEditingController> ctrls, List<FocusNode> nodes, bool isDark, Color text) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: List.generate(6, (i) {
        return SizedBox(
          width: 44, height: 56,
          child: TextField(
            controller: ctrls[i],
            focusNode: nodes[i],
            textAlign: TextAlign.center,
            maxLength: 1,
            keyboardType: TextInputType.number,
            style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.w900, color: text),
            decoration: InputDecoration(
              counterText: '',
              filled: true,
              fillColor: isDark ? Colors.white.withOpacity(0.03) : Colors.black.withOpacity(0.03),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: text.withOpacity(0.1), width: 2)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: text.withOpacity(0.1), width: 2)),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: Color(0xFFEA580C), width: 2)),
              contentPadding: EdgeInsets.zero,
            ),
            onChanged: (v) => _handleOtpChange(i, v, ctrls, nodes),
          ),
        );
      }),
    );
  }

  // ─── Shared UI widgets ─────────────────────────────────────────────────────
  Widget _fieldLabel(String label, Color text) {
    return Text(label, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: text.withOpacity(0.4), letterSpacing: 2));
  }

  Widget _textField({
    required TextEditingController ctrl,
    required String hint,
    required IconData prefix,
    required bool isDark,
    required Color text,
    bool obscure = false,
    Widget? suffix,
    ValueChanged<String>? onChanged,
    ValueChanged<String>? onSubmitted,
  }) {
    return TextField(
      controller: ctrl,
      obscureText: obscure,
      style: GoogleFonts.outfit(color: text, fontSize: 14),
      onChanged: onChanged,
      onSubmitted: onSubmitted,
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: text.withOpacity(0.2), fontSize: 13),
        prefixIcon: PulsoIcon(prefix, color: text.withOpacity(0.3), size: 18),
        suffixIcon: suffix,
        filled: true,
        fillColor: isDark
            ? Colors.white.withOpacity(0.03)
            : Colors.black.withOpacity(0.03),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(22), borderSide: BorderSide(color: text.withOpacity(0.08))),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(22), borderSide: BorderSide(color: text.withOpacity(0.08))),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(22), borderSide: const BorderSide(color: Color(0xFFEA580C), width: 1.5)),
      ),
    );
  }

  Widget _errorBanner(String msg, Color text) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.red.withOpacity(0.08),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.red.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          Container(width: 6, height: 6, decoration: const BoxDecoration(color: Colors.redAccent, shape: BoxShape.circle)),
          const SizedBox(width: 12),
          Expanded(child: Text(msg, style: const TextStyle(color: Colors.redAccent, fontSize: 12, fontWeight: FontWeight.bold))),
        ],
      ),
    );
  }

  Widget _primaryButton({required String label, bool isLoading = false, required VoidCallback onTap, IconData? icon}) {
    return SizedBox(
      height: 56,
      child: ElevatedButton(
        onPressed: isLoading ? null : onTap,
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFFEA580C),
          disabledBackgroundColor: const Color(0xFFEA580C).withOpacity(0.5),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
          elevation: 0,
        ),
        child: isLoading
            ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(label, style: GoogleFonts.outfit(fontWeight: FontWeight.w900, fontSize: 14, color: Colors.white, letterSpacing: 1)),
                  if (icon != null) ...[
                    const SizedBox(width: 4),
                    PulsoIcon(icon, color: Colors.white, size: 20),
                  ],
                ],
              ),
      ),
    );
  }

  Widget _secondaryButton({required String label, required VoidCallback onTap, IconData? icon}) {
    return SizedBox(
      height: 56,
      child: ElevatedButton(
        onPressed: onTap,
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF0F172A),
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
          elevation: 0,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (icon != null) ...[PulsoIcon(icon, color: Colors.white, size: 16), const SizedBox(width: 6)],
            Text(label, style: GoogleFonts.outfit(fontWeight: FontWeight.w900, fontSize: 14, color: Colors.white, letterSpacing: 1)),
          ],
        ),
      ),
    );
  }

  Widget _strengthBar(bool active, bool isDark) {
    return Container(
      height: 4,
      decoration: BoxDecoration(
        color: active
            ? const Color(0xFFEA580C)
            : (isDark ? Colors.white.withOpacity(0.08) : Colors.black.withOpacity(0.06)),
        borderRadius: BorderRadius.circular(2),
      ),
    );
  }

  Widget _pillBadge(String label, bool active, Color text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        color: active ? Colors.green.withOpacity(0.1) : text.withOpacity(0.05),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: active ? Colors.green.withOpacity(0.3) : text.withOpacity(0.08)),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 7,
          fontWeight: FontWeight.w900,
          color: active ? Colors.green : text.withOpacity(0.3),
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}

// ─── Theme Toggle ─────────────────────────────────────────────────────────────
class _ThemeToggle extends StatelessWidget {
  final Color onSurface;
  const _ThemeToggle({required this.onSurface});

  @override
  Widget build(BuildContext context) {
    final settings = context.watch<SettingsProvider>();

    Widget btn(ThemeMode mode, IconData icon) {
      final active = settings.themeMode == mode;
      return GestureDetector(
        onTap: () => settings.setThemeMode(mode),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.all(7),
          decoration: BoxDecoration(
            color: active ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            boxShadow: active ? [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 6)] : [],
          ),
          child: PulsoIcon(icon, size: 14, color: active ? const Color(0xFFEA580C) : onSurface.withOpacity(0.3)),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: onSurface.withOpacity(0.05),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: onSurface.withOpacity(0.08)),
      ),
      child: Row(
        children: [
          btn(ThemeMode.light, Icons.wb_sunny_outlined),
          btn(ThemeMode.system, Icons.settings_brightness_outlined),
          btn(ThemeMode.dark, Icons.nightlight_outlined),
        ],
      ),
    );
  }
}
