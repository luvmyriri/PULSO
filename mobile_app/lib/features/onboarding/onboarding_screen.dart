import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:pulso_mobile/core/theme/app_theme.dart';
import 'package:pulso_mobile/features/registration/screens/id_verification_screen.dart';
import 'dart:ui';

class OnboardingScreen extends StatelessWidget {
  const OnboardingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Background Lush Blobs
          Positioned(
            top: -50,
            left: -50,
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppTheme.primaryOrange.withOpacity(0.1),
              ),
            ),
          ).animate().fadeIn(duration: 2.seconds).scale(),
          
          Container(
            width: double.infinity,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  AppTheme.primaryDark,
                  Color(0xFF0F172A),
                  Color(0xFF1E293B),
                ],
              ),
            ),
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Spacer(),
                    const Icon(
                      Icons.flash_on_rounded,
                      size: 100,
                      color: AppTheme.primaryOrange,
                    ).animate()
                      .fadeIn(duration: 800.ms)
                      .scale(delay: 200.ms)
                      .shimmer(delay: 1000.ms, duration: 1500.ms),
                    const SizedBox(height: 24),
                    ShaderMask(
                      shaderCallback: (bounds) => const LinearGradient(
                        colors: [AppTheme.primaryOrange, AppTheme.primaryOrangeLight],
                      ).createShader(bounds),
                      child: Text(
                        'PULSO',
                        style: Theme.of(context).textTheme.displayLarge?.copyWith(
                          letterSpacing: 6,
                          fontSize: 64,
                        ),
                      ),
                    ).animate().fadeIn(delay: 400.ms).moveY(begin: 20, end: 0),
                    const SizedBox(height: 12),
                    Text(
                      'Public Unified Local Service Operations',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: Colors.white70,
                        fontWeight: FontWeight.w400,
                        fontSize: 16,
                        letterSpacing: 1.2,
                      ),
                    ).animate().fadeIn(delay: 600.ms),
                    const Spacer(),
                    Text(
                      'Empowering communities through digital transformation.',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.white60,
                      ),
                    ).animate().fadeIn(delay: 800.ms),
                    const SizedBox(height: 32),
                    ElevatedButton(
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const IDVerificationScreen(),
                          ),
                        );
                      },
                      child: const Text('GET STARTED'),
                    ).animate().fadeIn(delay: 1000.ms).scale(),
                    const SizedBox(height: 16),
                    TextButton(
                      onPressed: () {
                        Navigator.of(context).pushReplacementNamed('/home');
                      },
                      child: Text(
                        'SKIP REGISTRATION (DEV)',
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.3),
                          fontSize: 12,
                          letterSpacing: 1,
                        ),
                      ),
                    ).animate().fadeIn(delay: 1200.ms),
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
