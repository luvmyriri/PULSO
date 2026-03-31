import 'package:flutter/material.dart';
import 'package:animate_do/animate_do.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:pulso_mobile/core/theme/app_theme.dart';
import 'package:pulso_mobile/widgets/glass_card.dart';

import 'package:pulso_mobile/l10n/app_localizations.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  String _errorMessage = "";

  Future<void> _handleLogin() async {
    setState(() {
      _isLoading = true;
      _errorMessage = "";
    });

    try {
      // Use 10.0.2.2 for Android Emulator, or your local IP for physical devices
      const baseUrl = "http://10.0.2.2:8000"; 
      
      final response = await http.post(
        Uri.parse("$baseUrl/api/auth/login"),
        headers: {"Content-Type": "application/x-www-form-urlencoded"},
        body: {
          "username": _emailController.text,
          "password": _passwordController.text,
        },
      );

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Login Successful!")),
        );
      } else {
        setState(() {
          _errorMessage = data['detail'] ?? "Authentication failed";
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = "Connection error. Is the backend running?";
      });
    } finally {
      setState(() => _isLoading = false);
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
                      child: Icon(Icons.person_rounded, size: 40, color: brandOrange),
                    ),
                  ),
                  const SizedBox(height: 24),
                  FadeIn(
                    child: Text(
                      l10n.welcomeBack,
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
                      l10n.signInSubtitle,
                      style: TextStyle(color: isDark ? Colors.white54 : Colors.black54, fontWeight: FontWeight.w500),
                    ),
                  ),
                  const SizedBox(height: 48),
                  
                  // Form Area
                  ZoomIn(
                    child: GlassCard(
                      blur: 20,
                      opacity: isDark ? 0.05 : 0.6,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (_errorMessage.isNotEmpty)
                            Container(
                              padding: const EdgeInsets.all(12),
                              margin: const EdgeInsets.only(bottom: 24),
                              decoration: BoxDecoration(
                                color: Colors.red.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Colors.red.withOpacity(0.2)),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.error_outline, color: Colors.redAccent, size: 16),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      _errorMessage,
                                      style: const TextStyle(color: Colors.redAccent, fontSize: 12, fontWeight: FontWeight.w700),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            
                          Text(
                            l10n.emailOrMobile,
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1, color: brandOrange),
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _emailController,
                            style: TextStyle(color: isDark ? Colors.white : const Color(0xFF0F172A)),
                            decoration: InputDecoration(
                              hintText: l10n.enterIdentifier,
                              hintStyle: TextStyle(color: isDark ? Colors.white24 : Colors.black26),
                              prefixIcon: Icon(Icons.alternate_email_rounded, size: 20, color: isDark ? Colors.white38 : Colors.black38),
                              filled: true,
                              fillColor: isDark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.03),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(16),
                                borderSide: BorderSide.none,
                              ),
                            ),
                          ),
                          const SizedBox(height: 24),
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
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(16),
                                borderSide: BorderSide.none,
                              ),
                            ),
                          ),
                          const SizedBox(height: 32),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: _isLoading ? null : _handleLogin,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: brandOrange,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 20),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(18),
                                ),
                                elevation: 8,
                                shadowColor: brandOrange.withOpacity(0.3),
                              ),
                              child: _isLoading 
                                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) 
                                : Text(l10n.signInButton, style: const TextStyle(fontWeight: FontWeight.w900, letterSpacing: 2)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  
                  const SizedBox(height: 32),
                  FadeIn(
                    delay: const Duration(milliseconds: 200),
                    child: TextButton(
                      onPressed: () => Navigator.pushReplacementNamed(context, '/register'),
                      child: RichText(
                        text: TextSpan(
                          style: TextStyle(color: isDark ? Colors.white60 : Colors.black54, fontSize: 13),
                          children: [
                            TextSpan(text: l10n.noAccount),
                            TextSpan(text: l10n.signUpLink, style: TextStyle(color: brandOrange, fontWeight: FontWeight.w900)),
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
