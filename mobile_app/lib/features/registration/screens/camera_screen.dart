import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:pulso_mobile/core/theme/app_theme.dart';
import 'package:pulso_mobile/core/services/location_service.dart';
import 'package:pulso_mobile/core/api/api_client.dart';
import 'dart:io';
import 'dart:ui';
import 'package:flutter_animate/flutter_animate.dart';

class CameraScreen extends StatefulWidget {
  final String side;
  const CameraScreen({super.key, required this.side});

  @override
  State<CameraScreen> createState() => _CameraScreenState();
}

class _CameraScreenState extends State<CameraScreen> {
  CameraController? _controller;
  List<CameraDescription>? _cameras;
  bool _isReady = false;
  String? _error;
  double? _capturedLat;
  double? _capturedLng;
  bool _isGettingLocation = false;
  LocationService? _locationService;

  @override
  void initState() {
    super.initState();
    _initializeCamera();
    if (widget.side == 'incident_report') {
      _locationService = LocationService(ApiClient());
    }
  }

  Future<void> _initializeCamera() async {
    try {
      _cameras = await availableCameras();
      if (_cameras == null || _cameras!.isEmpty) {
        setState(() => _error = 'No camera detected');
        return;
      }

      final backCamera = _cameras!.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.back,
        orElse: () => _cameras!.first,
      );

      _controller = CameraController(
        backCamera,
        ResolutionPreset.high,
        enableAudio: false,
      );

      await _controller!.initialize();
      if (mounted) {
        setState(() => _isReady = true);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _error = 'Camera error: $e');
      }
    }
  }

  Future<void> _getCurrentLocation() async {
    if (_locationService == null) return;

    setState(() => _isGettingLocation = true);
    try {
      final position = await _locationService!.getCurrentPosition();
      setState(() {
        _capturedLat = position.latitude;
        _capturedLng = position.longitude;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Could not get location: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isGettingLocation = false);
      }
    }
  }

  String _generateFilename() {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    if (_capturedLat != null && _capturedLng != null) {
      final latStr = _capturedLat!.toStringAsFixed(6).replaceAll('.', 'p');
      final lngStr = _capturedLng!.toStringAsFixed(6).replaceAll('.', 'p');
      return 'report_${latStr}_${lngStr}_$timestamp.jpg';
    }
    return 'report_$timestamp.jpg';
  }

  Future<void> _takePicture() async {
    if (_controller == null || !_controller!.value.isInitialized) return;

    if (widget.side == 'incident_report') {
      await _getCurrentLocation();
      if (_capturedLat == null && _capturedLng == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'Location required for incident reports. Please enable GPS.',
              ),
              backgroundColor: Colors.orange,
            ),
          );
        }
        return;
      }
    }

    try {
      final image = await _controller!.takePicture();
      final filename = _generateFilename();

      // Create a new file with the GPS-based filename
      final newPath = image.path.replaceAll(
        image.path.split('/').last,
        filename,
      );
      final originalFile = File(image.path);
      await originalFile.rename(newPath);

      if (mounted) {
        // Return both file and location data
        Navigator.of(context).pop({
          'file': File(newPath),
          'lat': _capturedLat,
          'lng': _capturedLng,
          'address': _capturedLat != null
              ? '${_capturedLat!.toStringAsFixed(5)}, ${_capturedLng!.toStringAsFixed(5)}'
              : null,
        });
      }
    } catch (e) {
      print('Error taking picture: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return Scaffold(
        backgroundColor: Colors.black,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.error_outline,
                size: 64,
                color: AppTheme.errorRed,
              ),
              const SizedBox(height: 16),
              Text(_error!, style: const TextStyle(color: Colors.white)),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('BACK'),
              ),
            ],
          ),
        ),
      );
    }

    if (!_isReady || _controller == null) {
      return const Scaffold(
        backgroundColor: Colors.black,
        body: Center(
          child: CircularProgressIndicator(color: AppTheme.primaryOrange),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          CameraPreview(_controller!),

          // ID Guide Overlay (Only if not field operation)
          if (widget.side != 'field_operation' && widget.side != 'incident_report')
            Center(
                  child: AspectRatio(
                    aspectRatio: 1.586 / 1,
                    child: Container(
                      width: MediaQuery.of(context).size.width * 0.85,
                      margin: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.white30, width: 2),
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: Stack(
                        children: [
                          _buildCorner(const Offset(0, 0), true, true),
                          _buildCorner(const Offset(1, 0), true, false),
                          _buildCorner(const Offset(0, 1), false, true),
                          _buildCorner(const Offset(1, 1), false, false),
                        ],
                      ),
                    ),
                  ),
                )
                .animate()
                .fadeIn(duration: 1.seconds)
                .scale(begin: const Offset(1.1, 1.1)),

          // Controls & Instructions
          Positioned(
            bottom: 60,
            left: 0,
            right: 0,
            child: Column(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.black45,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.white10),
                      ),
                      child: Text(
                        widget.side == 'field_operation' || widget.side == 'incident_report'
                            ? 'CAPTURE CLEAR PHOTO EVIDENCE'
                            : 'ALIGN THE ${widget.side.toUpperCase()} OF YOUR ID',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 2.0,
                        ),
                      ),
                    ),
                  ),
                ).animate().fadeIn(delay: 500.ms).moveY(begin: 20),
                const SizedBox(height: 48),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    IconButton(
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(
                        Icons.close_rounded,
                        color: Colors.white,
                        size: 36,
                      ),
                    ).animate().fadeIn(delay: 800.ms),
                    const SizedBox(width: 40),
                    _CaptureButton(
                      onPressed: _takePicture,
                    ).animate().fadeIn(delay: 1.seconds).scale(),
                    const SizedBox(width: 40),
                    const SizedBox(width: 48), // Spacer
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCorner(Offset anchor, bool isTop, bool isLeft) {
    return Positioned(
      top: isTop ? 0 : null,
      bottom: !isTop ? 0 : null,
      left: isLeft ? 0 : null,
      right: !isLeft ? 0 : null,
      child: Container(
        width: 50,
        height: 50,
        decoration: BoxDecoration(
          border: Border(
            top: isTop
                ? const BorderSide(color: AppTheme.primaryOrange, width: 5)
                : BorderSide.none,
            bottom: !isTop
                ? const BorderSide(color: AppTheme.primaryOrange, width: 5)
                : BorderSide.none,
            left: isLeft
                ? const BorderSide(color: AppTheme.primaryOrange, width: 5)
                : BorderSide.none,
            right: !isLeft
                ? const BorderSide(color: AppTheme.primaryOrange, width: 5)
                : BorderSide.none,
          ),
          borderRadius: BorderRadius.only(
            topLeft: isTop && isLeft ? const Radius.circular(24) : Radius.zero,
            topRight: isTop && !isLeft
                ? const Radius.circular(24)
                : Radius.zero,
            bottomLeft: !isTop && isLeft
                ? const Radius.circular(24)
                : Radius.zero,
            bottomRight: !isTop && !isLeft
                ? const Radius.circular(24)
                : Radius.zero,
          ),
        ),
      ),
    );
  }
}

class _CaptureButton extends StatelessWidget {
  final VoidCallback onPressed;
  const _CaptureButton({required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onPressed,
      child: Container(
        width: 84,
        height: 84,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 5),
        ),
        child: Center(
          child: Container(
            width: 62,
            height: 62,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: AppTheme.primaryOrange,
            ),
          ),
        ),
      ),
    );
  }
}
