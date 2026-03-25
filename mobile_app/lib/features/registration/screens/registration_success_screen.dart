import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:mobile_app/core/theme/app_theme.dart';
import 'package:mobile_app/features/home/screens/home_screen.dart';
import 'dart:ui';

class RegistrationSuccessScreen extends StatelessWidget {
  const RegistrationSuccessScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.primaryDark,
      body: Stack(
        children: [
          // Background Lush Blobs
          Positioned(
            top: 100,
            left: -50,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppTheme.primaryOrange.withOpacity(0.08),
              ),
            ),
          ).animate().fadeIn(duration: 2.seconds),
          
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    color: AppTheme.primaryOrange.withOpacity(0.1),
                    shape: BoxShape.circle,
                    border: Border.all(color: AppTheme.primaryOrange.withOpacity(0.3), width: 2),
                  ),
                  child: const Center(
                    child: Icon(Icons.check_rounded, size: 70, color: AppTheme.primaryOrange),
                  ),
                ).animate()
                  .scale(duration: 600.ms, curve: Curves.easeOutBack)
                  .shimmer(delay: 800.ms, duration: 1.5.seconds),
                const SizedBox(height: 48),
                ShaderMask(
                  shaderCallback: (bounds) => const LinearGradient(
                    colors: [AppTheme.primaryOrange, AppTheme.primaryOrangeLight],
                  ).createShader(bounds),
                  child: Text(
                    'REGISTRATION COMPLETE',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.displayLarge?.copyWith(fontSize: 32),
                  ),
                ).animate().fadeIn(delay: 300.ms).moveY(begin: 20, end: 0),
                const SizedBox(height: 20),
                Text(
                  'Welcome to PULSO. Your account has been established and your residency is being prioritized for verification by the barangay office.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white60, fontSize: 16, height: 1.6),
                ).animate().fadeIn(delay: 500.ms),
                const SizedBox(height: 80),
                ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).pushAndRemoveUntil(
                      MaterialPageRoute(builder: (_) => const HomeScreen()),
                      (route) => false,
                    );
                  },
                  child: const Text('GET STARTED'),
                ).animate().fadeIn(delay: 800.ms).scale(),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
