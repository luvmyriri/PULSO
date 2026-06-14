import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:pulso_mobile/core/theme/app_theme.dart';
import 'package:pulso_mobile/features/registration/registration_provider.dart';
import 'package:pulso_mobile/features/registration/screens/camera_screen.dart';
import 'package:pulso_mobile/features/registration/screens/registration_form_screen.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'dart:ui';
import 'package:flutter_animate/flutter_animate.dart';

class IDVerificationScreen extends StatelessWidget {
  const IDVerificationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<RegistrationProvider>();
    return Scaffold(
      backgroundColor: AppTheme.primaryDark,
      appBar: AppBar(
        title: Text(
          'IDENTITY VERIFICATION',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 16, letterSpacing: 2),
        ),
      ),
      body: Stack(
        children: [
          // Background Depth Blobs
          Positioned(
            top: 200,
            right: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppTheme.primaryOrange.withOpacity(0.05),
              ),
            ),
          ).animate().fadeIn(duration: 2.seconds),
          
          SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'STEP 01 OF 03',
                  style: TextStyle(
                    color: AppTheme.primaryOrange,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                    letterSpacing: 1.5,
                  ),
                ).animate().fadeIn(),
                const SizedBox(height: 8),
                Text(
                  'VALIDATE IDENTITY',
                  style: Theme.of(context).textTheme.displayLarge?.copyWith(
                    fontSize: 32,
                  ),
                ).animate().fadeIn(delay: 200.ms).moveX(begin: -10),
                const SizedBox(height: 12),
                const Text(
                  'Capture your government-issued ID to seamlessly auto-fill your registration profile.',
                  style: TextStyle(color: Colors.white60, fontSize: 16, height: 1.5),
                ).animate().fadeIn(delay: 400.ms),
                const SizedBox(height: 32),
                _IDCardSlot(
                  side: 'front',
                  label: 'ID FRONT',
                  icon: Icons.badge_outlined,
                  delay: 600,
                ),
                const SizedBox(height: 20),
                _IDCardSlot(
                  side: 'back',
                  label: 'ID BACK',
                  icon: Icons.credit_card_outlined,
                  delay: 800,
                ),
                const SizedBox(height: 48),
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
                  onPressed: provider.isLoading || provider.idFrontFile == null
                      ? null
                      : () async {
                          final success = await provider.scanID();
                          if (success && context.mounted) {
                            Navigator.of(context).push(
                              MaterialPageRoute(builder: (_) => const RegistrationFormScreen()),
                            );
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
                      : const Text('PROCEED TO REGISTRATION'),
                ).animate().fadeIn(delay: 1.seconds).scale(),
                const SizedBox(height: 40),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _IDCardSlot extends StatelessWidget {
  final String side;
  final String label;
  final IconData icon;
  final int delay;

  const _IDCardSlot({
    required this.side,
    required this.label,
    required this.icon,
    required this.delay,
  });

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<RegistrationProvider>();
    final file = side == 'front' ? provider.idFrontFile : provider.idBackFile;

    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: Container(
          width: double.infinity,
          height: 210,
          decoration: AppTheme.glassDecoration(
            opacity: file != null ? 0.8 : 0.4,
          ).copyWith(
            border: Border.all(
              color: file != null ? AppTheme.primaryOrange.withOpacity(0.5) : Colors.white.withOpacity(0.1),
              width: 1.5,
            ),
          ),
          child: Stack(
            children: [
              if (file != null)
                Positioned.fill(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(22),
                    child: Image.file(file, fit: BoxFit.cover),
                  ),
                ),
              Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (file == null) ...[
                      Icon(icon, size: 48, color: Colors.white30),
                      const SizedBox(height: 12),
                      Text(
                        label,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: Colors.white38,
                          fontSize: 14,
                          letterSpacing: 2,
                        ),
                      ),
                    ],
                    const SizedBox(height: 20),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        _ActionButton(
                          icon: Icons.camera_alt_rounded,
                          label: 'CAPTURE',
                          onPressed: () async {
                            final result = await Navigator.of(context).push<File>(
                              MaterialPageRoute(
                                builder: (_) => CameraScreen(side: side),
                              ),
                            );
                            if (result != null) {
                              if (side == 'front') {
                                provider.setIDFront(result);
                              } else {
                                provider.setIDBack(result);
                              }
                            }
                          },
                        ),
                        const SizedBox(width: 16),
                        _ActionButton(
                          icon: Icons.cloud_upload_outlined,
                          label: 'UPLOAD',
                          onPressed: () async {
                            final picker = ImagePicker();
                            final image = await picker.pickImage(source: ImageSource.gallery, imageQuality: 90);
                            if (image != null) {
                              if (side == 'front') {
                                provider.setIDFront(File(image.path));
                              } else {
                                provider.setIDBack(File(image.path));
                              }
                            }
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              if (file != null)
                Positioned(
                  top: 12,
                  right: 12,
                  child: GestureDetector(
                    onTap: () {
                      if (side == 'front') {
                        provider.clearIDFront();
                      } else {
                        provider.clearIDBack();
                      }
                    },
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(50),
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.black45,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white24),
                          ),
                          child: const Icon(Icons.refresh_rounded, size: 16, color: Colors.white),
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    ).animate().fadeIn(delay: delay.ms).moveY(begin: 20);
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onPressed;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
        child: TextButton.icon(
          onPressed: onPressed,
          style: TextButton.styleFrom(
            backgroundColor: Colors.white.withOpacity(0.05),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            side: BorderSide(color: Colors.white.withOpacity(0.05)),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          icon: Icon(icon, size: 18, color: AppTheme.primaryOrange),
          label: Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 11,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.2,
            ),
          ),
        ),
      ),
    );
  }
}
