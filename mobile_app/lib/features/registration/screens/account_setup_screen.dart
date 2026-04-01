import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:pulso_mobile/core/theme/app_theme.dart';
import 'package:pulso_mobile/features/registration/registration_provider.dart';
import 'package:pulso_mobile/features/registration/screens/registration_success_screen.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'dart:ui';

class AccountSetupScreen extends StatefulWidget {
  const AccountSetupScreen({super.key});

  @override
  State<AccountSetupScreen> createState() => _AccountSetupScreenState();
}

class _AccountSetupScreenState extends State<AccountSetupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _phoneController = TextEditingController();

  bool _obscurePassword = true;

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<RegistrationProvider>();

    return Scaffold(
      backgroundColor: AppTheme.primaryDark,
      appBar: AppBar(
        title: Text(
          'ACCOUNT SETUP',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 14, letterSpacing: 2),
        ),
      ),
      body: Stack(
        children: [
          // Background Depth Blob
          Positioned(
            top: -50,
            right: -100,
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppTheme.primaryOrange.withOpacity(0.05),
              ),
            ),
          ).animate().fadeIn(duration: 2.seconds),

          Form(
            key: _formKey,
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
              children: [
                Text(
                  'STEP 03 OF 03',
                  style: TextStyle(
                    color: AppTheme.primaryOrange,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                    letterSpacing: 1.5,
                  ),
                ).animate().fadeIn(),
                const SizedBox(height: 8),
                Text(
                  'SECURE ACCOUNT',
                  style: Theme.of(context).textTheme.displayLarge?.copyWith(fontSize: 32),
                ).animate().fadeIn(delay: 200.ms).moveX(begin: -10),
                const SizedBox(height: 12),
                const Text(
                  'Establish your secure credentials to complete your resident registration.',
                  style: TextStyle(color: Colors.white60, fontSize: 16, height: 1.5),
                ).animate().fadeIn(delay: 400.ms),
                const SizedBox(height: 32),

                _buildGlassField(
                  'EMAIL ADDRESS',
                  _emailController,
                  keyboardType: TextInputType.emailAddress,
                  icon: Icons.email_outlined,
                ),
                _buildGlassField(
                  'PHONE NUMBER',
                  _phoneController,
                  keyboardType: TextInputType.phone,
                  icon: Icons.phone_outlined,
                ),
                _buildGlassField(
                  'PASSWORD',
                  _passwordController,
                  obscureText: _obscurePassword,
                  icon: Icons.lock_outline_rounded,
                  suffix: IconButton(
                    icon: Icon(_obscurePassword ? Icons.visibility_off_rounded : Icons.visibility_rounded, color: Colors.white24, size: 20),
                    onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                  ),
                ),
                _buildGlassField(
                  'CONFIRM PASSWORD',
                  _confirmPasswordController,
                  obscureText: _obscurePassword,
                  icon: Icons.lock_reset_rounded,
                  validator: (val) {
                    if (val != _passwordController.text) return 'PASSWORDS DO NOT MATCH';
                    return val == null || val.isEmpty ? 'REQUIRED' : null;
                  },
                ),

                const SizedBox(height: 40),
                if (provider.error != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 20.0),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: AppTheme.errorRed.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.errorRed.withOpacity(0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline_rounded, color: AppTheme.errorRed, size: 20),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              provider.error!,
                              style: const TextStyle(color: AppTheme.errorRed, fontSize: 13, fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ).animate().shake(),
                ElevatedButton(
                  onPressed: provider.isLoading
                      ? null
                      : () async {
                          if (_formKey.currentState!.validate()) {
                            provider.email = _emailController.text;
                            provider.password = _passwordController.text;
                            provider.phoneNumber = _phoneController.text;

                            final success = await provider.registerUser();
                            if (success && context.mounted) {
                              Navigator.of(context).pushAndRemoveUntil(
                                MaterialPageRoute(builder: (_) => const RegistrationSuccessScreen()),
                                (route) => false,
                              );
                            }
                          }
                        },
                  child: provider.isLoading
                      ? Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
                            if (provider.loadingMessage != null) ...[
                              const SizedBox(height: 12),
                              Text(
                                provider.loadingMessage!,
                                style: const TextStyle(
                                  color: Colors.white70,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 1.2,
                                ),
                              ),
                            ],
                          ],
                        )
                      : const Text('FINALIZE REGISTRATION'),
                ).animate().fadeIn(delay: 600.ms).scale(),
                const SizedBox(height: 48),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGlassField(
    String label,
    TextEditingController controller, {
    TextInputType? keyboardType,
    bool obscureText = false,
    IconData? icon,
    Widget? suffix,
    String? Function(String?)? validator,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label, 
            style: const TextStyle(
              color: AppTheme.primaryOrangeLight, 
              fontSize: 11, 
              fontWeight: FontWeight.bold,
              letterSpacing: 1.2
            )
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
              child: TextFormField(
                controller: controller,
                keyboardType: keyboardType,
                obscureText: obscureText,
                style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w500),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: Colors.white.withOpacity(0.05),
                  prefixIcon: icon != null ? Icon(icon, color: AppTheme.primaryOrange.withOpacity(0.5), size: 20) : null,
                  suffixIcon: suffix,
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: AppTheme.primaryOrange, width: 1.5),
                  ),
                  contentPadding: const EdgeInsets.all(20),
                ),
                validator: validator ?? (val) => val == null || val.isEmpty ? 'REQUIRED' : null,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
