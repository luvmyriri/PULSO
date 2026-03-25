import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mobile_app/core/theme/app_theme.dart';
import 'package:mobile_app/features/registration/registration_provider.dart';
import 'package:mobile_app/features/registration/screens/account_setup_screen.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'dart:ui';

class RegistrationFormScreen extends StatefulWidget {
  const RegistrationFormScreen({super.key});

  @override
  State<RegistrationFormScreen> createState() => _RegistrationFormScreenState();
}

class _RegistrationFormScreenState extends State<RegistrationFormScreen> {
  final _formKey = GlobalKey<FormState>();
  
  // Controllers
  final _firstNameController = TextEditingController();
  final _middleNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _dobController = TextEditingController();
  final _sexController = TextEditingController();
  final _pcnController = TextEditingController();
  final _addressController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _prefillData();
  }

  void _prefillData() {
    final data = context.read<RegistrationProvider>().idData;
    if (data != null) {
      _firstNameController.text = data['first_name'] ?? '';
      _middleNameController.text = data['middle_name'] ?? '';
      _lastNameController.text = data['last_name'] ?? '';
      _dobController.text = data['dob'] ?? '';
      _sexController.text = data['sex'] ?? '';
      _pcnController.text = data['pcn'] ?? data['id_number'] ?? '';
      _addressController.text = data['address'] ?? data['address_info']?['raw_address'] ?? '';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.primaryDark,
      appBar: AppBar(
        title: Text(
          'RESIDENT DETAILS',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 14, letterSpacing: 2),
        ),
      ),
      body: Stack(
        children: [
          // Background Depth Blobs
          Positioned(
            bottom: -100,
            left: -50,
            child: Container(
              width: 300,
              height: 300,
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
                  'STEP 02 OF 03',
                  style: TextStyle(
                    color: AppTheme.primaryOrange,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                    letterSpacing: 1.5,
                  ),
                ).animate().fadeIn(),
                const SizedBox(height: 8),
                Text(
                  'CONFIRM PROFILE',
                  style: Theme.of(context).textTheme.displayLarge?.copyWith(fontSize: 32),
                ).animate().fadeIn(delay: 200.ms).moveX(begin: -10),
                const SizedBox(height: 12),
                const Text(
                  'Please review the data extracted from your ID and finalize your resident profile details.',
                  style: TextStyle(color: Colors.white60, fontSize: 16, height: 1.5),
                ).animate().fadeIn(delay: 400.ms),
                const SizedBox(height: 32),
                
                _buildGlassField('FIRST NAME', _firstNameController),
                _buildGlassField('MIDDLE NAME', _middleNameController),
                _buildGlassField('LAST NAME', _lastNameController),
                
                Row(
                  children: [
                    Expanded(child: _buildGlassField('DATE OF BIRTH', _dobController)),
                    const SizedBox(width: 16),
                    Expanded(child: _buildGlassField('SEX', _sexController)),
                  ],
                ),
                
                _buildGlassField('ID NUMBER (PCN/CRN)', _pcnController),
                _buildGlassField('FULL RESIDENTIAL ADDRESS', _addressController, maxLines: 3),
                
                const SizedBox(height: 40),
                ElevatedButton(
                  onPressed: () {
                    if (_formKey.currentState!.validate()) {
                      final provider = context.read<RegistrationProvider>();
                      provider.fullName = "${_firstNameController.text} ${_middleNameController.text} ${_lastNameController.text}".replaceAll(RegExp(r'\s+'), ' ').trim();
                      provider.address = _addressController.text;
                      provider.barangay = provider.idData?['barangay'] ?? '';

                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const AccountSetupScreen()),
                      );
                    }
                  },
                  child: const Text('CONTINUE TO ACCOUNT SETUP'),
                ).animate().fadeIn(delay: 600.ms).scale(),
                const SizedBox(height: 48),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGlassField(String label, TextEditingController controller, {int maxLines = 1}) {
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
                maxLines: maxLines,
                style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w500),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: Colors.white.withOpacity(0.05),
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
                validator: (val) => val == null || val.isEmpty ? 'REQUIRED' : null,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
