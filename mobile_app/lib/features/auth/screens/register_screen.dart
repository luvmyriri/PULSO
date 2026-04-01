import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:animate_do/animate_do.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'package:intl/intl.dart';
import 'package:pulso_mobile/core/theme/app_theme.dart';
import 'package:pulso_mobile/widgets/glass_card.dart';
import 'package:pulso_mobile/core/api/api_client.dart';
import 'package:dio/dio.dart';
import 'package:provider/provider.dart';
import 'package:pulso_mobile/core/providers/settings_provider.dart';
import 'package:pulso_mobile/widgets/pulso_branding.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final PageController _pageController = PageController();
  final ApiClient _apiClient = ApiClient();
  final ImagePicker _picker = ImagePicker();

  int _currentStep = 0;
  bool _isLoading = false;
  String? _errorMessage;

  // Step 1: ID Data
  File? _idFront;
  File? _idBack;
  String? _verifiedBadge;

  // Step 2-4 Controller/State
  final _firstNameController = TextEditingController();
  final _middleNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _suffixController = TextEditingController();
  DateTime? _dob;
  String _sex = 'Male';
  
  final _houseNoController = TextEditingController();
  final _blockLotController = TextEditingController();
  final _streetController = TextEditingController();
  final _subdivisionController = TextEditingController();
  String _barangay = '';
  final _municipalityController = TextEditingController(text: 'Caloocan City - North');
  final _provinceController = TextEditingController(text: 'Metro Manila');
  final _postalCodeController = TextEditingController();

  final _emailController = TextEditingController();
  final _mobileController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;

  // Step 4: OTP Verification
  final List<TextEditingController> _otpControllers = List.generate(6, (index) => TextEditingController());
  final List<FocusNode> _otpFocusNodes = List.generate(6, (index) => FocusNode());
  int _resendTimer = 0;
  bool _isVerifying = false;
  bool _isResending = false;

  final List<String> _barangays = List.generate(24, (i) => 'Barangay ${165 + i}');

  @override
  void dispose() {
    _pageController.dispose();
    _firstNameController.dispose();
    _middleNameController.dispose();
    _lastNameController.dispose();
    _suffixController.dispose();
    _houseNoController.dispose();
    _blockLotController.dispose();
    _streetController.dispose();
    _subdivisionController.dispose();
    _municipalityController.dispose();
    _provinceController.dispose();
    _postalCodeController.dispose();
    _emailController.dispose();
    _mobileController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    for (var controller in _otpControllers) {
      controller.dispose();
    }
    for (var node in _otpFocusNodes) {
      node.dispose();
    }
    super.dispose();
  }

  String _getPostalCodeForBarangay(String brgy) {
    final numMatch = RegExp(r'\d+').firstMatch(brgy);
    if (numMatch == null) return '';
    final num = int.parse(numMatch.group(0)!);
    
    if ([165, 166, 168, 169, 170].contains(num)) return '1420';
    if (num == 167) return '1423';
    if ([171, 172, 173].contains(num)) return '1421';
    if ([174, 175, 177, 178].contains(num)) return '1424';
    if (num == 176) return '1428';
    if (num == 179) return '1425';
    if ([180, 181, 182].contains(num)) return '1422';
    if ([183, 184].contains(num)) return '1426';
    if ([185, 186, 187, 188].contains(num)) return '1427';
    return '';
  }

  Future<void> _pickImage(ImageSource source, bool isFront) async {
    try {
      final XFile? image = await _picker.pickImage(
        source: source,
        imageQuality: 85,
        maxWidth: 1920,
      );
      if (image != null) {
        setState(() {
          if (isFront) _idFront = File(image.path);
          else _idBack = File(image.path);
        });
      }
    } catch (e) {
      _showError("Failed to capture image: $e");
    }
  }

  Widget _buildStepVerification(bool isDark, Color onSurface) {
    return FadeInRight(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: AppTheme.primaryOrange.withOpacity(0.1), shape: BoxShape.circle),
              child: const Icon(Icons.mark_email_read_outlined, size: 48, color: AppTheme.primaryOrange),
            ),
            const SizedBox(height: 24),
            Text("Verify Email", style: GoogleFonts.outfit(fontSize: 32, fontWeight: FontWeight.w900, color: onSurface)),
            const SizedBox(height: 8),
            Text("We've sent a 6-digit code to ${_emailController.text}", textAlign: TextAlign.center, style: TextStyle(color: onSurface.withOpacity(0.5))),
            const SizedBox(height: 40),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: List.generate(6, (index) => SizedBox(
                width: 45,
                height: 55,
                child: TextField(
                  controller: _otpControllers[index],
                  focusNode: _otpFocusNodes[index],
                  textAlign: TextAlign.center,
                  keyboardType: TextInputType.number,
                  maxLength: 1,
                  style: GoogleFonts.outfit(fontSize: 24, fontWeight: FontWeight.bold, color: onSurface, height: 1.0),
                  textAlignVertical: TextAlignVertical.center,
                  decoration: InputDecoration(
                    counterText: "",
                    contentPadding: EdgeInsets.zero,
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: onSurface.withOpacity(0.1))),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.primaryOrange, width: 2)),
                  ),
                  onChanged: (value) {
                    if (value.isNotEmpty && index < 5) {
                      _otpFocusNodes[index + 1].requestFocus();
                    } else if (value.isEmpty && index > 0) {
                      _otpFocusNodes[index - 1].requestFocus();
                    }
                  },
                ),
              )),
            ),
            const SizedBox(height: 40),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isVerifying ? null : _handleVerify,
                style: AppTheme.orangeButtonStyle,
                child: _isVerifying 
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text("VERIFY & COMPLETE", style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 2)),
              ),
            ),
            const SizedBox(height: 24),
            TextButton(
              onPressed: _resendTimer > 0 || _isResending ? null : _handleResendCode,
              child: Text(
                _resendTimer > 0 ? "Resend code in ${_resendTimer}s" : "I didn't receive a code. Resend", 
                style: TextStyle(
                  color: _resendTimer > 0 ? onSurface.withOpacity(0.7) : AppTheme.primaryOrange, 
                  fontWeight: FontWeight.bold
                )
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _handleVerify() async {
    final code = _otpControllers.map((c) => c.text).join();
    if (code.length < 6) {
      _showError("Please enter the full 6-digit code.");
      return;
    }

    setState(() => _isVerifying = true);
    try {
      await _apiClient.post('/api/auth/verify-registration', data: {
        'email': _emailController.text.trim(),
        'code': code,
      });
      
      if (!mounted) return;
      
      // Success - Navigate to Login
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => AlertDialog(
          backgroundColor: Theme.of(context).cardColor,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.check_circle_outline_rounded, color: Colors.green, size: 64),
              const SizedBox(height: 16),
              Text("Verified!", style: GoogleFonts.outfit(fontSize: 24, fontWeight: FontWeight.w900)),
              const SizedBox(height: 8),
              const Text("Your account is now active. You can now log in.", textAlign: TextAlign.center),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.of(context).popUntil((route) => route.isFirst),
                  style: AppTheme.orangeButtonStyle,
                  child: const Text("LOG IN NOW"),
                ),
              ),
            ],
          ),
        ),
      );
    } on DioException catch (de) {
      _showError(de.response?.data['detail'] ?? "Verification failed.");
    } finally {
      setState(() => _isVerifying = false);
    }
  }

  Future<void> _handleResendCode() async {
    setState(() => _isResending = true);
    try {
      await _apiClient.post('/api/auth/resend-code', data: {
        'email': _emailController.text.trim(),
      });
      _showSuccess("A new code has been sent to your email.");
      setState(() {
        _resendTimer = 60;
        _startResendTimer();
      });
    } on DioException catch (de) {
      _showError(de.response?.data['detail'] ?? "Failed to resend code.");
    } finally {
      setState(() => _isResending = false);
    }
  }

  void _startResendTimer() {
    Future.delayed(const Duration(seconds: 1), () {
      if (!mounted || _resendTimer == 0) return;
      setState(() => _resendTimer--);
      _startResendTimer();
    });
  }

  void _showSuccess(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: Colors.green, behavior: SnackBarBehavior.floating),
    );
  }

  void _showError(String msg) {
    setState(() => _errorMessage = msg);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: Colors.redAccent, behavior: SnackBarBehavior.floating),
    );
  }

  Future<void> _handleScanID() async {
    if (_idFront == null || _idBack == null) {
      _showError("Please provide both Front and Back ID images.");
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final response = await _apiClient.uploadID(front: _idFront, back: _idBack);
      final result = response.data;

      if (result['success'] == true) {
        final data = result['extracted_data'];
        
        // Face Match Validation
        if (data['is_visual_face_match'] == false) {
           _showError("Face Mismatch: The portrait on ID front does not match the back.");
           setState(() => _isLoading = false);
           return;
        }

        // Residency Check
        if (data['is_north_caloocan'] == false) {
           _showError(data['verification_message'] ?? "Registration restricted to North Caloocan residents.");
           setState(() => _isLoading = false);
           return;
        }

        // Auto-fill
        setState(() {
          _firstNameController.text = data['first_name'] ?? '';
          _lastNameController.text = data['last_name'] ?? '';
          _middleNameController.text = data['middle_name'] ?? '';
          if (data['dob'] != null) {
            _dob = DateTime.tryParse(data['dob']);
          }
          _sex = (data['sex'] == 'Female' || data['sex'] == 'F') ? 'Female' : 'Male';
          
          // Address Auto-fill
          _houseNoController.text = data['house_no'] ?? '';
          _blockLotController.text = data['block_lot'] ?? '';
          _streetController.text = data['street'] ?? '';
          _subdivisionController.text = data['subdivision'] ?? '';
          _barangay = data['barangay'] != null ? "Barangay ${RegExp(r'\d+').firstMatch(data['barangay'])?.group(0) ?? ''}" : '';
          
          if (_barangay.isNotEmpty) {
            _postalCodeController.text = _getPostalCodeForBarangay(_barangay);
          }
          
          _verifiedBadge = "${data['id_type_label'] ?? 'ID'} Verified";
          _isLoading = false;
        });

        _nextPage();
      } else {
      _showError(result['error'] ?? "OCR verification failed.");
      setState(() => _isLoading = false);
    }
  } on DioException catch (de) {
    String msg = "Connection error: ${de.type}";
    if (de.response?.data != null && de.response?.data is Map) {
      msg = de.response?.data['detail'] ?? de.response?.data['message'] ?? msg;
    } else if (de.type == DioExceptionType.connectionTimeout) {
      msg = "Connection timed out. Check your internet.";
    } else if (de.type == DioExceptionType.connectionError) {
      msg = "Cannot reach server. Is it running at ${ApiClient.baseUrl}?";
    }
    _showError(msg);
    setState(() => _isLoading = false);
  } catch (e) {
    _showError("An unexpected error occurred: $e");
    setState(() => _isLoading = false);
  }
}

  Future<void> _handleRegister() async {
    if (_emailController.text.isEmpty || _passwordController.text.isEmpty) {
      _showError("Please complete all account fields.");
      return;
    }
    if (_passwordController.text != _confirmPasswordController.text) {
      _showError("Passwords do not match.");
      return;
    }

    setState(() => _isLoading = true);

    try {
      // Use the registration logic from previous version
      final fullName = [_firstNameController.text.trim(), _middleNameController.text.trim(), _lastNameController.text.trim(), _suffixController.text.trim()].where((s) => s.isNotEmpty).join(' ');
      final addressParts = [_houseNoController.text.trim(), _blockLotController.text.trim(), _subdivisionController.text.trim(), _streetController.text.trim(), _barangay, _municipalityController.text].where((s) => s.isNotEmpty).toList();
      final address = addressParts.join(', ');

      final response = await _apiClient.post(
        '/api/auth/register',
        data: {
          "email": _emailController.text.trim(),
          "password": _passwordController.text,
          "full_name": fullName,
          "phone_number": _mobileController.text.trim(),
          "role": "resident",
          "address": address,
          "barangay": _barangay,
        },
      ).timeout(const Duration(seconds: 60));

      if (!mounted) return;

      if (response.statusCode == 200 || response.statusCode == 201) {
        if (mounted) setState(() => _isLoading = false);
        _nextPage();
        _resendTimer = 60;
        _startResendTimer();
      } else {
        final errorDetail = response.data?['detail']?.toString() ?? "Registration failed.";
        _showError(errorDetail);
      }
    } catch (e) {
      String errorMessage = "Registration Error: ${e.toString()}";
      if (e is DioException && e.response != null) {
        errorMessage = e.response?.data?['detail']?.toString() ?? e.message ?? errorMessage;
      }
      _showError(errorMessage);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _nextPage() {
    _pageController.nextPage(duration: const Duration(milliseconds: 400), curve: Curves.easeInOutCubic);
    if (_currentStep < 3) setState(() => _currentStep++);
  }

  void _prevPage() {
    _pageController.previousPage(duration: const Duration(milliseconds: 400), curve: Curves.easeInOutCubic);
    if (_currentStep > 0) setState(() => _currentStep--);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final onSurface = isDark ? Colors.white : const Color(0xFF0F172A);

    return Scaffold(
      extendBodyBehindAppBar: true,
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: _currentStep > 0 ? IconButton(
          icon: Icon(Icons.arrow_back_ios_new, color: onSurface),
          onPressed: _prevPage,
        ) : IconButton(
          icon: Icon(Icons.close, color: onSurface),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          "Step ${_currentStep + 1} of 4",
          style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w900, color: onSurface.withOpacity(0.5), letterSpacing: 1),
        ),
        centerTitle: true,
      ),
      body: Stack(
        children: [
          // Background pattern
          Positioned.fill(
            child: Opacity(
              opacity: isDark ? 0.05 : 0.02,
              child: Image.network('https://www.transparenttextures.com/patterns/carbon-fibre.png', repeat: ImageRepeat.repeat),
            ),
          ),

          SafeArea(
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
                  child: Column(
                    children: [
                      // Header Branding
                      FadeInDown(
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Flexible(
                              child: PulsoBranding(
                                scale: 0.5,
                                subtitle: 'REGISTRATION',
                              ),
                            ),
                            Row(
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
                                      _buildThemeButton(context, ThemeMode.light, Icons.wb_sunny_outlined, onSurface),
                                      _buildThemeButton(context, ThemeMode.system, Icons.settings_brightness_outlined, onSurface),
                                      _buildThemeButton(context, ThemeMode.dark, Icons.nightlight_outlined, onSurface),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                 // Home Button
                                 TextButton.icon(
                                   onPressed: () => Navigator.of(context).pop(),
                                   icon: const Icon(Icons.home_outlined, color: AppTheme.primaryOrange, size: 22),
                                   label: Text("Home", style: GoogleFonts.outfit(fontSize: 10, fontWeight: FontWeight.w900, color: AppTheme.primaryOrange, letterSpacing: 1)),
                                   style: TextButton.styleFrom(
                                     padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                     minimumSize: Size.zero,
                                     tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                   ),
                                 ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                      
                      // Progress Indicator
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(4, (index) => Container(
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                          height: 4,
                          width: 30,
                          decoration: BoxDecoration(
                            color: index <= _currentStep ? AppTheme.primaryOrange : onSurface.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(2),
                          ),
                        )),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),

                  Expanded(
                    child: PageView(
                      controller: _pageController,
                      physics: const NeverScrollableScrollPhysics(),
                      children: [
                        _buildStepIdentity(isDark, onSurface),
                        _buildStepInformation(isDark, onSurface),
                        _buildStepAccount(isDark, onSurface),
                        _buildStepVerification(isDark, onSurface),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          
          if (_isLoading)
            Container(
              color: Colors.black.withOpacity(0.5),
              child: Center(
                child: GlassCard(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const CircularProgressIndicator(color: AppTheme.primaryOrange),
                      const SizedBox(height: 20),
                      Text("Processing audit...", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.white)),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildStepIdentity(bool isDark, Color onSurface) {
    return FadeInRight(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("Identity Audit", style: GoogleFonts.outfit(fontSize: 32, fontWeight: FontWeight.w900, color: onSurface)),
            Text("Verification required for North Caloocan residency.", style: TextStyle(color: onSurface.withOpacity(0.5))),
            const SizedBox(height: 40),
            _buildIDUploadBox("FRONT OF ID", _idFront, true),
            const SizedBox(height: 16),
            _buildIDUploadBox("BACK OF ID", _idBack, false),
            const SizedBox(height: 40),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: (_idFront != null && _idBack != null) ? _handleScanID : null,
                style: AppTheme.orangeButtonStyle,
                child: const Text("CONTINUE TO SCAN", style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 2)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildIDUploadBox(String label, File? file, bool isFront) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1.5, color: AppTheme.primaryOrange)),
        const SizedBox(height: 8),
        GestureDetector(
          onTap: () => _showImageSourceDialog(isFront),
          child: Container(
            height: 180,
            width: double.infinity,
            decoration: BoxDecoration(
              color: file == null ? (isDark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.03)) : Colors.transparent,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: file == null ? (isDark ? Colors.white.withOpacity(0.1) : Colors.black.withOpacity(0.05)) : AppTheme.primaryOrange.withOpacity(0.5)),
            ),
            child: file != null 
              ? ClipRRect(borderRadius: BorderRadius.circular(20), child: Image.file(file, fit: BoxFit.cover))
              : Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.add_a_photo_outlined, size: 32, color: isDark ? Colors.white24 : Colors.black26),
                    const SizedBox(height: 12),
                    Text("Tap to capture or upload", style: TextStyle(fontSize: 12, color: isDark ? Colors.white24 : Colors.black26, fontWeight: FontWeight.bold)),
                  ],
                ),
          ),
        ),
      ],
    );
  }

  Widget _buildStepInformation(bool isDark, Color onSurface) {
    return FadeInRight(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_verifiedBadge != null)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(color: Colors.green.withOpacity(0.1), borderRadius: BorderRadius.circular(30), border: Border.all(color: Colors.green.withOpacity(0.2))),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.verified, size: 14, color: Colors.green),
                    const SizedBox(width: 6),
                    Text(_verifiedBadge!, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.green)),
                  ],
                ),
              ),
            Text("Personal Information", style: GoogleFonts.outfit(fontSize: 32, fontWeight: FontWeight.w900, color: onSurface)),
            Text("Complete your profile and residential details.", style: TextStyle(color: onSurface.withOpacity(0.5))),
            
            const SizedBox(height: 32),
            _buildTextField("FIRST NAME", _firstNameController, Icons.person_outline),
            const SizedBox(height: 20),
            _buildTextField("MIDDLE NAME", _middleNameController, Icons.person_outline),
            const SizedBox(height: 20),
            _buildTextField("LAST NAME", _lastNameController, Icons.person_outline),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(child: _buildTextField("SUFFIX", _suffixController, Icons.badge_outlined)),
                const SizedBox(width: 16),
                Expanded(child: _buildSexDropdown()),
              ],
            ),
            const SizedBox(height: 20),
            _buildDatePicker(),
            
            const SizedBox(height: 40),
            const Divider(),
            const SizedBox(height: 40),
            
            Text("Residential Address", style: GoogleFonts.outfit(fontSize: 24, fontWeight: FontWeight.w900, color: onSurface)),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(child: _buildTextField("HOUSE NUMBER / FLOOR / UNIT", _houseNoController, Icons.home_outlined)),
                const SizedBox(width: 16),
                Expanded(child: _buildTextField("BLOCK & LOT", _blockLotController, Icons.map_outlined)),
              ],
            ),
            const SizedBox(height: 20),
            _buildTextField("STREET / AVENUE / CORNER / ROAD", _streetController, Icons.add_road),
            const SizedBox(height: 20),
            _buildTextField("BUILDING / SUBDIVISION / VILLAGE", _subdivisionController, Icons.location_city_outlined),
            const SizedBox(height: 20),
            _buildBarangayDropdown(),
            const SizedBox(height: 20),
            Row(
               children: [
                 Expanded(child: _buildTextField("CITY", _municipalityController, Icons.location_on_outlined, readOnly: true)),
                 const SizedBox(width: 16),
                 Expanded(child: _buildTextField("POSTAL CODE", _postalCodeController, Icons.mark_as_unread_outlined, readOnly: true)),
               ],
            ),
            const SizedBox(height: 20),
            _buildTextField("PROVINCE", _provinceController, Icons.map_rounded, readOnly: true),
            
            const SizedBox(height: 48),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _nextPage,
                style: AppTheme.orangeButtonStyle,
                child: const Text("CREDENTIALS SETUP", style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 2)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStepAccount(bool isDark, Color onSurface) {
    return FadeInRight(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("Credentials", style: GoogleFonts.outfit(fontSize: 32, fontWeight: FontWeight.w900, color: onSurface)),
            Text("Secure your account with MFA verified contact.", style: TextStyle(color: onSurface.withOpacity(0.5))),
            const SizedBox(height: 32),
            _buildTextField("EMAIL ADDRESS", _emailController, Icons.alternate_email_rounded),
            const SizedBox(height: 20),
            _buildTextField(
              "MOBILE NUMBER", 
              _mobileController, 
              Icons.phone_android_rounded,
              keyboardType: TextInputType.number,
              inputFormatters: [
                FilteringTextInputFormatter.digitsOnly,
                LengthLimitingTextInputFormatter(11),
              ],
            ),
            const SizedBox(height: 20),
            _buildTextField(
              "PASSWORD", 
              _passwordController, 
              Icons.lock_outline_rounded, 
              obscure: _obscurePassword, 
              toggleObscure: () => setState(() => _obscurePassword = !_obscurePassword),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 8),
            _buildPasswordStrengthMeter(_passwordController.text),
            const SizedBox(height: 20),
            _buildTextField(
              "CONFIRM PASSWORD", 
              _confirmPasswordController, 
              Icons.shield_outlined, 
              obscure: _obscureConfirmPassword, 
              toggleObscure: () => setState(() => _obscureConfirmPassword = !_obscureConfirmPassword),
            ),
            const SizedBox(height: 48),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _handleRegister,
                style: AppTheme.orangeButtonStyle,
                child: _isLoading 
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text("COMPLETE REGISTRATION", style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 2)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPasswordStrengthMeter(String password) {
    if (password.isEmpty) return const SizedBox.shrink();
    
    final lengthOk = password.length >= 8;
    final hasUpper = password.contains(RegExp(r'[A-Z]'));
    final hasNumber = password.contains(RegExp(r'[0-9]'));
    final hasSpecial = password.contains(RegExp(r'[^A-Za-z0-9]'));
    
    String strength = "Weak";
    Color strengthColor = Colors.redAccent;
    double progress = 0.25;

    if (lengthOk) {
      if (hasUpper && hasNumber && hasSpecial) {
        strength = "Strong";
        strengthColor = Colors.green;
        progress = 1.0;
      } else {
        strength = "Medium";
        strengthColor = Colors.orange;
        progress = 0.5 + (hasUpper ? 0.15 : 0) + (hasNumber ? 0.15 : 0) + (hasSpecial ? 0.2 : 0);
      }
    }

    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text("STRENGTH", style: GoogleFonts.outfit(fontSize: 9, fontWeight: FontWeight.w900, letterSpacing: 1.5, color: Colors.grey)),
            Text(strength.toUpperCase(), style: GoogleFonts.outfit(fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1, color: strengthColor)),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(2),
          child: LinearProgressIndicator(
            value: progress,
            backgroundColor: Colors.grey.withOpacity(0.1),
            valueColor: AlwaysStoppedAnimation<Color>(strengthColor),
            minHeight: 4,
          ),
        ),
      ],
    );
  }

  Widget _buildTextField(
    String label, 
    TextEditingController controller, 
    IconData icon, {
      bool readOnly = false, 
      bool obscure = false, 
      VoidCallback? toggleObscure,
      TextInputType? keyboardType,
      List<TextInputFormatter>? inputFormatters,
      ValueChanged<String>? onChanged,
    }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1.5, color: AppTheme.primaryOrange)),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          readOnly: readOnly,
          obscureText: obscure,
          keyboardType: keyboardType,
          inputFormatters: inputFormatters,
          onChanged: onChanged,
          style: TextStyle(color: isDark ? Colors.white : const Color(0xFF0F172A), fontSize: 14),
          decoration: InputDecoration(
            prefixIcon: Icon(icon, size: 20, color: isDark ? Colors.white38 : Colors.black38),
            suffixIcon: toggleObscure != null ? IconButton(icon: Icon(obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 18), onPressed: toggleObscure) : null,
            filled: true,
            fillColor: isDark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.03),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
          ),
        ),
      ],
    );
  }

  Widget _buildSexDropdown() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text("SEX", style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1.5, color: AppTheme.primaryOrange)),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(color: isDark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.03), borderRadius: BorderRadius.circular(16)),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: _sex,
              isExpanded: true,
              style: TextStyle(color: isDark ? Colors.white : const Color(0xFF0F172A), fontSize: 14),
              dropdownColor: isDark ? const Color(0xFF1E293B) : Colors.white,
              items: ['Male', 'Female'].map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
              onChanged: (v) => setState(() => _sex = v!),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildBarangayDropdown() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text("BARANGAY", style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1.5, color: AppTheme.primaryOrange)),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(color: isDark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.03), borderRadius: BorderRadius.circular(16)),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: _barangay.isEmpty ? null : _barangay,
              hint: Text("Select Barangay", style: TextStyle(color: isDark ? Colors.white24 : Colors.black26, fontSize: 14)),
              isExpanded: true,
              style: TextStyle(color: isDark ? Colors.white : const Color(0xFF0F172A), fontSize: 14),
              dropdownColor: isDark ? const Color(0xFF1E293B) : Colors.white,
              items: _barangays.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
              onChanged: (v) => setState(() {
                _barangay = v!;
                _postalCodeController.text = _getPostalCodeForBarangay(_barangay);
              }),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDatePicker() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text("DATE OF BIRTH", style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1.5, color: AppTheme.primaryOrange)),
        const SizedBox(height: 8),
        InkWell(
          onTap: () async {
            final date = await showDatePicker(
              context: context,
              initialDate: _dob ?? DateTime.now().subtract(const Duration(days: 365 * 18)),
              firstDate: DateTime(1920),
              lastDate: DateTime.now(),
            );
            if (date != null) setState(() => _dob = date);
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            decoration: BoxDecoration(color: isDark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.03), borderRadius: BorderRadius.circular(16)),
            child: Row(
              children: [
                Icon(Icons.calendar_today_outlined, size: 20, color: isDark ? Colors.white38 : Colors.black38),
                const SizedBox(width: 12),
                Text(
                  _dob == null ? "Select Date" : DateFormat('MMMM dd, yyyy').format(_dob!),
                  style: TextStyle(color: _dob == null ? (isDark ? Colors.white24 : Colors.black26) : (isDark ? Colors.white : const Color(0xFF0F172A)), fontSize: 14),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  void _showImageSourceDialog(bool isFront) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => GlassCard(
        margin: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt_outlined, color: AppTheme.primaryOrange),
              title: const Text("Take Photo", style: TextStyle(fontWeight: FontWeight.bold)),
              onTap: () { Navigator.pop(context); _pickImage(ImageSource.camera, isFront); },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined, color: AppTheme.primaryOrange),
              title: const Text("Upload from Gallery", style: TextStyle(fontWeight: FontWeight.bold)),
              onTap: () { Navigator.pop(context); _pickImage(ImageSource.gallery, isFront); },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildThemeButton(BuildContext context, ThemeMode mode, IconData icon, Color onSurface) {
    final settings = Provider.of<SettingsProvider>(context);
    final isActive = settings.themeMode == mode;
    return GestureDetector(
      onTap: () => settings.setThemeMode(mode),
      child: Container(
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: isActive ? AppTheme.primaryOrange : Colors.transparent,
          shape: BoxShape.circle,
        ),
        child: Icon(
          icon,
          size: 14,
          color: isActive ? Colors.white : onSurface.withOpacity(0.4),
        ),
      ),
    );
  }
}
