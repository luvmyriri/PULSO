import 'package:flutter/material.dart';
import 'package:animate_do/animate_do.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:pulso_mobile/core/theme/app_theme.dart';
import 'package:pulso_mobile/widgets/glass_card.dart';
import 'package:pulso_mobile/l10n/app_localizations.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController();
  bool _isLoading = false;

  // Base URL for API - Use the same as login_screen.dart
  static const String baseUrl = "http://192.168.0.199:8000";

  Future<void> _handleRegister() async {
    if (_emailController.text.isEmpty || _passwordController.text.isEmpty || _nameController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please fill in all fields"), backgroundColor: Colors.redAccent),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final response = await http.post(
        Uri.parse("$baseUrl/api/auth/register"),
        headers: {"Content-Type": "application/json"},
        body: json.encode({
          "email": _emailController.text.trim(),
          "password": _passwordController.text,
          "full_name": _nameController.text.trim(),
          "role": "resident",
        }),
      ).timeout(const Duration(seconds: 15));

      if (!mounted) return;

      if (response.statusCode == 200 || response.statusCode == 201) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Registration successful! Check your email for verification."),
            backgroundColor: Colors.green,
          ),
        );
        // Navigate to login and show verification screen
        Navigator.pushReplacementNamed(
          context, 
          '/login',
          arguments: {'email': _emailController.text.trim(), 'auto_verify': true},
        );
      } else {
        final data = json.decode(response.body);
        final detail = data['detail']?.toString() ?? "Registration failed";
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(detail), backgroundColor: Colors.redAccent),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Connection error. Is the server running?"), backgroundColor: Colors.redAccent),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final brandOrange = AppTheme.primaryOrange;

    return Scaffold(
      extendBodyBehindAppBar: true,
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new, color: isDark ? Colors.white : const Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Stack(
        children: [
          // Background Pattern
          Positioned.fill(
            child: Opacity(
              opacity: isDark ? 0.05 : 0.02,
              child: Image.network(
                'https://www.transparenttextures.com/patterns/carbon-fibre.png',
                repeat: ImageRepeat.repeat,
              ),
            ),
          ),

          Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  FadeInDown(
                    child: Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        color: brandOrange.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: brandOrange.withOpacity(0.2)),
                      ),
                      child: Icon(Icons.app_registration_rounded, size: 40, color: brandOrange),
                    ),
                  ),
                  const SizedBox(height: 24),
                  FadeIn(
                    child: Text(
                      l10n.createAccount,
                      style: GoogleFonts.outfit(
                        fontSize: 32,
                        fontWeight: FontWeight.w900,
                        color: isDark ? Colors.white : const Color(0xFF0F172A),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  FadeIn(
                    child: Text(
                      l10n.registerSubtitle,
                      style: TextStyle(color: isDark ? Colors.white54 : Colors.black54, fontWeight: FontWeight.w500),
                    ),
                  ),
                  const SizedBox(height: 48),
                  ZoomIn(
                    child: GlassCard(
                      blur: 20,
                      opacity: isDark ? 0.05 : 0.6,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            l10n.fullName,
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1, color: brandOrange),
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _nameController,
                            style: TextStyle(color: isDark ? Colors.white : const Color(0xFF0F172A)),
                            decoration: InputDecoration(
                              hintText: l10n.enterFullName,
                              hintStyle: TextStyle(color: isDark ? Colors.white24 : Colors.black26),
                              prefixIcon: Icon(Icons.person_outline_rounded, size: 20, color: isDark ? Colors.white38 : Colors.black38),
                              filled: true,
                              fillColor: isDark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.03),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                            ),
                          ),
                          const SizedBox(height: 20),
                          Text(
                            l10n.emailAddress,
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1, color: brandOrange),
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _emailController,
                            style: TextStyle(color: isDark ? Colors.white : const Color(0xFF0F172A)),
                            decoration: InputDecoration(
                              hintText: l10n.enterEmail,
                              hintStyle: TextStyle(color: isDark ? Colors.white24 : Colors.black26),
                              prefixIcon: Icon(Icons.alternate_email_rounded, size: 20, color: isDark ? Colors.white38 : Colors.black38),
                              filled: true,
                              fillColor: isDark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.03),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                            ),
                          ),
                          const SizedBox(height: 20),
                          Text(
                            l10n.passwordLabel,
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1, color: brandOrange),
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _passwordController,
                            obscureText: true,
                            style: TextStyle(color: isDark ? Colors.white : const Color(0xFF0F172A)),
                            decoration: InputDecoration(
                              hintText: "••••••••",
                              hintStyle: TextStyle(color: isDark ? Colors.white24 : Colors.black26),
                              prefixIcon: Icon(Icons.lock_outline_rounded, size: 20, color: isDark ? Colors.white38 : Colors.black38),
                              filled: true,
                              fillColor: isDark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.03),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                            ),
                          ),
                          const SizedBox(height: 32),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: _isLoading ? null : _handleRegister,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: brandOrange,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 20),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                                elevation: 8,
                                shadowColor: brandOrange.withOpacity(0.3),
                              ),
                              child: _isLoading
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                    )
                                  : Text(l10n.signUpButton, style: const TextStyle(fontWeight: FontWeight.w900, letterSpacing: 2)),
                            ),
                          ),
                          const SizedBox(height: 24),
                          Text(
                            "Note: Identity verification and ID scanning will be required upon first login.",
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 10, color: isDark ? Colors.white24 : Colors.black26, fontWeight: FontWeight.w700),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),
                  FadeIn(
                    delay: const Duration(milliseconds: 200),
                    child: TextButton(
                      onPressed: () => Navigator.pushReplacementNamed(context, '/login'),
                      child: RichText(
                        text: TextSpan(
                          style: TextStyle(color: isDark ? Colors.white60 : Colors.black54, fontSize: 13),
                          children: [
                            TextSpan(text: l10n.alreadyHaveAccount),
                            TextSpan(text: l10n.loginLink, style: TextStyle(color: brandOrange, fontWeight: FontWeight.w900)),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
