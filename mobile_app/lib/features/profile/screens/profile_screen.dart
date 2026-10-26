import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:pulso_mobile/core/theme/app_theme.dart';
import 'package:pulso_mobile/core/providers/settings_provider.dart';
import 'package:pulso_mobile/features/profile/profile_provider.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _notificationsEnabled = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ProfileProvider>().fetchProfile();
    });
  }

  String _maskEmail(String? email) {
    if (email == null || email.isEmpty) return 'resident••••@gmail.com';
    if (!email.contains('@')) return email;
    final parts = email.split('@');
    final name = parts[0];
    final domain = parts[1];
    if (name.length <= 4) {
      return '${name.substring(0, 1)}••••@$domain';
    }
    return '${name.substring(0, 4)}••••@$domain';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final settings = context.watch<SettingsProvider>();
    final profileProvider = context.watch<ProfileProvider>();
    final user = profileProvider.userProfile;

    final bgColor = isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC);
    final cardBg = isDark ? const Color(0xFF1E293B) : Colors.white;
    final cardBorder = isDark ? const Color(0xFF334155) : const Color(0xFFE5E7EB);
    final dividerColor = isDark ? const Color(0xFF334155) : const Color(0xFFF1F5F9);
    final textPrimary = isDark ? Colors.white : const Color(0xFF111827);
    final textSecondary = isDark ? const Color(0xFF94A3B8) : const Color(0xFF6B7280);
    const orangeColor = Color(0xFFEA580C);

    final fullName = (user?['full_name'] != null && user!['full_name'].toString().trim().isNotEmpty)
        ? user['full_name'].toString()
        : 'Marc Alexis';
    final initial = fullName.isNotEmpty ? fullName[0].toUpperCase() : 'M';
    final displayEmail = _maskEmail(user?['email']?.toString() ?? 'marc.alexis@gmail.com');
    final barangayText = (user?['barangay'] != null && user!['barangay'].toString().trim().isNotEmpty)
        ? '${user['barangay']}, Caloocan'
        : 'Barangay 171, Caloocan';

    return Scaffold(
      backgroundColor: bgColor,
      body: SafeArea(
        child: Column(
          children: [
            // ─── Header / App Bar ──────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  IconButton(
                    icon: Icon(Icons.arrow_back, color: textPrimary),
                    onPressed: () {
                      if (Navigator.canPop(context)) {
                        Navigator.pop(context);
                      }
                    },
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Account & Settings',
                          style: GoogleFonts.outfit(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: textPrimary,
                            letterSpacing: -0.3,
                          ),
                        ),
                        const SizedBox(height: 1),
                        Text(
                          'Manage your account and preferences.',
                          style: TextStyle(
                            fontSize: 12.5,
                            color: textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'PULSO',
                        style: GoogleFonts.outfit(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          color: orangeColor,
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(width: 2),
                      const Icon(
                        Icons.wifi_tethering,
                        size: 17,
                        color: orangeColor,
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // ─── Content Scroll View ────────────────────────────────────────
            Expanded(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ─── User Profile Banner Card ───────────────────────────
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: cardBg,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: cardBorder),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.03),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 28,
                            backgroundColor: orangeColor,
                            child: Text(
                              initial,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  fullName,
                                  style: GoogleFonts.outfit(
                                    fontSize: 16.5,
                                    fontWeight: FontWeight.w700,
                                    color: textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  displayEmail,
                                  style: TextStyle(
                                    fontSize: 12.5,
                                    color: textSecondary,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    Icon(
                                      Icons.location_on_outlined,
                                      size: 14,
                                      color: textSecondary,
                                    ),
                                    const SizedBox(width: 2),
                                    Flexible(
                                      child: Text(
                                        barangayText,
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: textSecondary,
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          OutlinedButton(
                            onPressed: () => _showEditProfileDialog(context, user),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: orangeColor),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                            child: const Text(
                              'Edit profile',
                              style: TextStyle(
                                color: orangeColor,
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // ─── Section: ACCOUNT ──────────────────────────────────
                    _buildSectionHeader('ACCOUNT', textSecondary),
                    const SizedBox(height: 8),
                    _buildCardGroup(
                      cardBg: cardBg,
                      cardBorder: cardBorder,
                      children: [
                        _buildSettingsRow(
                          icon: Icons.person_outline_rounded,
                          title: 'Personal information',
                          subtitle: 'Name, email, and barangay',
                          textPrimary: textPrimary,
                          textSecondary: textSecondary,
                          onTap: () => _showPersonalInfoDialog(context, user),
                        ),
                        Divider(height: 1, thickness: 1, color: dividerColor),
                        _buildSettingsRow(
                          icon: Icons.lock_outline_rounded,
                          title: 'Password & security',
                          subtitle: 'Password and account access',
                          textPrimary: textPrimary,
                          textSecondary: textSecondary,
                          onTap: () => _showChangePasswordDialog(context),
                        ),
                      ],
                    ),

                    const SizedBox(height: 20),

                    // ─── Section: PREFERENCES ──────────────────────────────
                    _buildSectionHeader('PREFERENCES', textSecondary),
                    const SizedBox(height: 8),
                    _buildCardGroup(
                      cardBg: cardBg,
                      cardBorder: cardBorder,
                      children: [
                        _buildSettingsRow(
                          icon: Icons.notifications_none_rounded,
                          title: 'Notifications',
                          subtitle: 'Choose updates you receive',
                          textPrimary: textPrimary,
                          textSecondary: textSecondary,
                          trailingBadge: Text(
                            _notificationsEnabled ? 'On' : 'Off',
                            style: TextStyle(
                              color: _notificationsEnabled ? orangeColor : textSecondary,
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                            ),
                          ),
                          onTap: () => _showNotificationsSheet(context),
                        ),
                        Divider(height: 1, thickness: 1, color: dividerColor),
                        _buildSettingsRow(
                          icon: Icons.translate_rounded,
                          title: 'Language',
                          subtitle: 'Current language: ${settings.locale.languageCode == 'tl' ? 'Filipino' : 'English'}',
                          textPrimary: textPrimary,
                          textSecondary: textSecondary,
                          onTap: () => _showLanguageSheet(context, settings),
                        ),
                        Divider(height: 1, thickness: 1, color: dividerColor),
                        Padding(
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(Icons.wb_sunny_outlined, size: 22, color: textPrimary),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Appearance',
                                          style: GoogleFonts.outfit(
                                            fontSize: 15,
                                            fontWeight: FontWeight.w600,
                                            color: textPrimary,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          'Choose your display style',
                                          style: TextStyle(fontSize: 12, color: textSecondary),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Container(
                                padding: const EdgeInsets.all(4),
                                decoration: BoxDecoration(
                                  color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    _buildThemeSegment(
                                      title: 'Light',
                                      icon: Icons.wb_sunny_outlined,
                                      isSelected: settings.themeMode == ThemeMode.light,
                                      orangeColor: orangeColor,
                                      isDark: isDark,
                                      onTap: () => settings.setThemeMode(ThemeMode.light),
                                    ),
                                    _buildThemeSegment(
                                      title: 'Dark',
                                      icon: Icons.dark_mode_outlined,
                                      isSelected: settings.themeMode == ThemeMode.dark,
                                      orangeColor: orangeColor,
                                      isDark: isDark,
                                      onTap: () => settings.setThemeMode(ThemeMode.dark),
                                    ),
                                    _buildThemeSegment(
                                      title: 'System',
                                      icon: Icons.computer_outlined,
                                      isSelected: settings.themeMode == ThemeMode.system,
                                      orangeColor: orangeColor,
                                      isDark: isDark,
                                      onTap: () => settings.setThemeMode(ThemeMode.system),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 20),

                    // ─── Section: HELP & SUPPORT ───────────────────────────
                    _buildSectionHeader('HELP & SUPPORT', textSecondary),
                    const SizedBox(height: 8),
                    _buildCardGroup(
                      cardBg: cardBg,
                      cardBorder: cardBorder,
                      children: [
                        _buildSettingsRow(
                          icon: Icons.menu_book_outlined,
                          title: 'How PULSO works',
                          subtitle: 'Learn about reporting and features',
                          textPrimary: textPrimary,
                          textSecondary: textSecondary,
                          onTap: () => _showHowItWorksSheet(context),
                        ),
                        Divider(height: 1, thickness: 1, color: dividerColor),
                        _buildSettingsRow(
                          icon: Icons.help_outline_rounded,
                          title: 'Help center',
                          subtitle: 'Find answers to common questions',
                          textPrimary: textPrimary,
                          textSecondary: textSecondary,
                          onTap: () => _showHelpCenterSheet(context),
                        ),
                        Divider(height: 1, thickness: 1, color: dividerColor),
                        _buildSettingsRow(
                          icon: Icons.chat_bubble_outline_rounded,
                          title: 'Contact support',
                          subtitle: 'Get in touch with our team',
                          textPrimary: textPrimary,
                          textSecondary: textSecondary,
                          onTap: () => _showContactSupportSheet(context),
                        ),
                      ],
                    ),

                    const SizedBox(height: 20),

                    // ─── Section: PRIVACY & LEGAL ──────────────────────────
                    _buildSectionHeader('PRIVACY & LEGAL', textSecondary),
                    const SizedBox(height: 8),
                    _buildCardGroup(
                      cardBg: cardBg,
                      cardBorder: cardBorder,
                      children: [
                        _buildSettingsRow(
                          icon: Icons.shield_outlined,
                          title: 'Privacy policy',
                          subtitle: 'How we collect and use your information',
                          textPrimary: textPrimary,
                          textSecondary: textSecondary,
                          onTap: () => _showPrivacyPolicySheet(context),
                        ),
                        Divider(height: 1, thickness: 1, color: dividerColor),
                        _buildSettingsRow(
                          icon: Icons.description_outlined,
                          title: 'Terms of use',
                          subtitle: 'Rules and guidelines for using PULSO',
                          textPrimary: textPrimary,
                          textSecondary: textSecondary,
                          onTap: () => _showTermsSheet(context),
                        ),
                        Divider(height: 1, thickness: 1, color: dividerColor),
                        _buildSettingsRow(
                          icon: Icons.cookie_outlined,
                          title: 'Cookie preferences',
                          subtitle: 'Manage your cookie settings',
                          textPrimary: textPrimary,
                          textSecondary: textSecondary,
                          onTap: () => _showCookiesSheet(context),
                        ),
                      ],
                    ),

                    const SizedBox(height: 24),

                    // ─── Sign Out Button ────────────────────────────────────
                    InkWell(
                      onTap: () => _showLogoutDialog(context),
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        width: double.infinity,
                        height: 48,
                        decoration: BoxDecoration(
                          color: isDark ? Colors.transparent : Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: orangeColor, width: 1.2),
                        ),
                        alignment: Alignment.center,
                        child: Row(
                          mainAxisAlignment: MainAxisSize.min,
                          children: const [
                            Icon(Icons.logout_rounded, color: orangeColor, size: 20),
                            SizedBox(width: 8),
                            Text(
                              'Sign out',
                              style: TextStyle(
                                color: orangeColor,
                                fontWeight: FontWeight.w700,
                                fontSize: 14.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Center(
                      child: Text(
                        'End your session on this device.',
                        style: TextStyle(
                          fontSize: 12,
                          color: textSecondary,
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─── Helper Widgets ────────────────────────────────────────────────────────

  Widget _buildSectionHeader(String title, Color color) {
    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: color,
          letterSpacing: 0.6,
        ),
      ),
    );
  }

  Widget _buildCardGroup({
    required Color cardBg,
    required Color cardBorder,
    required List<Widget> children,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
      ),
      child: Column(children: children),
    );
  }

  Widget _buildSettingsRow({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color textPrimary,
    required Color textSecondary,
    required VoidCallback onTap,
    Widget? trailingBadge,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        child: Row(
          children: [
            Icon(icon, size: 22, color: textPrimary),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.outfit(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 12,
                      color: textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            if (trailingBadge != null) ...[
              trailingBadge,
              const SizedBox(width: 6),
            ],
            Icon(
              Icons.chevron_right_rounded,
              size: 20,
              color: textSecondary,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildThemeSegment({
    required String title,
    required IconData icon,
    required bool isSelected,
    required Color orangeColor,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected
                ? (isDark ? const Color(0xFF334155) : const Color(0xFFFFF7ED))
                : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
            border: isSelected
                ? Border.all(color: isDark ? orangeColor : const Color(0xFFFDBA74))
                : Border.all(color: Colors.transparent),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 16,
                color: isSelected ? orangeColor : (isDark ? const Color(0xFF94A3B8) : const Color(0xFF475569)),
              ),
              const SizedBox(width: 6),
              Text(
                title,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  color: isSelected ? orangeColor : (isDark ? const Color(0xFFCBD5E1) : const Color(0xFF334155)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ─── Dialogs & Sheets ──────────────────────────────────────────────────────

  void _showEditProfileDialog(BuildContext context, Map<String, dynamic>? user) {
    final nameController = TextEditingController(text: user?['full_name'] ?? '');
    final phoneController = TextEditingController(text: user?['phone_number'] ?? '');
    final addressController = TextEditingController(text: user?['address'] ?? '');
    final barangayController = TextEditingController(text: user?['barangay'] ?? '');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Edit Profile'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(labelText: 'Full Name'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: phoneController,
                decoration: const InputDecoration(labelText: 'Phone Number'),
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: barangayController,
                decoration: const InputDecoration(labelText: 'Barangay (e.g. Barangay 171)'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: addressController,
                decoration: const InputDecoration(labelText: 'Street Address'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEA580C)),
            onPressed: () async {
              final provider = context.read<ProfileProvider>();
              final success = await provider.updateProfile(
                fullName: nameController.text.trim(),
                phoneNumber: phoneController.text.trim(),
                address: addressController.text.trim(),
                barangay: barangayController.text.trim(),
              );
              if (mounted) {
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(success ? 'Profile updated successfully!' : 'Failed to update profile'),
                    backgroundColor: success ? Colors.green : Colors.red,
                  ),
                );
              }
            },
            child: const Text('Save', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showPersonalInfoDialog(BuildContext context, Map<String, dynamic>? user) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Personal Information',
                  style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(ctx),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _buildInfoTile('Full Name', user?['full_name'] ?? 'Marc Alexis'),
            _buildInfoTile('Email Address', user?['email'] ?? 'marc.alexis@gmail.com'),
            _buildInfoTile('Phone Number', user?['phone_number'] ?? '0912 345 6789'),
            _buildInfoTile('Barangay', user?['barangay'] ?? 'Barangay 171, Caloocan'),
            _buildInfoTile('Street Address', user?['address'] ?? 'Not set'),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFEA580C),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: () {
                  Navigator.pop(ctx);
                  _showEditProfileDialog(context, user);
                },
                child: const Text('Edit Information', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoTile(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
          const SizedBox(height: 2),
          Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  void _showChangePasswordDialog(BuildContext context) {
    final currentController = TextEditingController();
    final newController = TextEditingController();
    final confirmController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Password & Security'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: currentController,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Current Password'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: newController,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'New Password'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: confirmController,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Confirm New Password'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEA580C)),
            onPressed: () async {
              if (newController.text != confirmController.text) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('New passwords do not match')),
                );
                return;
              }
              final provider = context.read<ProfileProvider>();
              final success = await provider.changePassword(
                currentPassword: currentController.text,
                newPassword: newController.text,
              );
              if (mounted) {
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(success ? 'Password updated successfully!' : provider.error ?? 'Failed to update password'),
                  ),
                );
              }
            },
            child: const Text('Update', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showNotificationsSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (context, setSheetState) => Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Notification Preferences',
                style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              SwitchListTile(
                title: const Text('Report Updates'),
                subtitle: const Text('Get real-time notices when city engineers review your report'),
                value: _notificationsEnabled,
                activeColor: const Color(0xFFEA580C),
                onChanged: (val) {
                  setSheetState(() => _notificationsEnabled = val);
                  setState(() => _notificationsEnabled = val);
                },
              ),
              SwitchListTile(
                title: const Text('City Advisories'),
                subtitle: const Text('Public works, road closures, and maintenance alerts'),
                value: _notificationsEnabled,
                activeColor: const Color(0xFFEA580C),
                onChanged: (val) {
                  setSheetState(() => _notificationsEnabled = val);
                  setState(() => _notificationsEnabled = val);
                },
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFEA580C),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Save Preferences', style: TextStyle(color: Colors.white)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showLanguageSheet(BuildContext context, SettingsProvider settings) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Select Language',
              style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.language),
              title: const Text('English'),
              subtitle: const Text('Default interface language'),
              trailing: settings.locale.languageCode == 'en'
                  ? const Icon(Icons.check_circle, color: Color(0xFFEA580C))
                  : null,
              onTap: () {
                settings.setLocale(const Locale('en'));
                Navigator.pop(ctx);
              },
            ),
            ListTile(
              leading: const Icon(Icons.translate),
              title: const Text('Filipino (Tagalog)'),
              subtitle: const Text('Pambansang wika ng Pilipinas'),
              trailing: settings.locale.languageCode == 'tl'
                  ? const Icon(Icons.check_circle, color: Color(0xFFEA580C))
                  : null,
              onTap: () {
                settings.setLocale(const Locale('tl'));
                Navigator.pop(ctx);
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showHowItWorksSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('How PULSO Works', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            _buildHowStep('1', 'Report an Issue', 'Capture photo evidence, GPS coordinates, and category details.'),
            _buildHowStep('2', 'Engineering Triage', 'City engineers verify and prioritize the report with work orders.'),
            _buildHowStep('3', 'Field Dispatch', 'Maintenance crews are dispatched to the exact coordinates.'),
            _buildHowStep('4', 'Verified Resolution', 'After-work photos and signed inspection reports close the ticket.'),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEA580C)),
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Got it', style: TextStyle(color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHowStep(String number, String title, String description) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 14,
            backgroundColor: const Color(0xFFFFF7ED),
            child: Text(number, style: const TextStyle(color: Color(0xFFEA580C), fontWeight: FontWeight.bold)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                const SizedBox(height: 2),
                Text(description, style: const TextStyle(fontSize: 12.5, color: Colors.grey)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showHelpCenterSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Help Center & FAQs', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 14),
            _buildFaqItem('How do I track my submitted report?', 'Go to My Reports tab to see live status markers, assigned engineer details, and field photos.'),
            _buildFaqItem('What should I do for emergencies?', 'For life-threatening emergencies, call Caloocan CDRRMO hotline (02) 888-22566 directly.'),
            _buildFaqItem('Can I edit my report after submission?', 'Reports currently in Pending Triage can be amended or cancelled with reason.'),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEA580C)),
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Close', style: TextStyle(color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFaqItem(String question, String answer) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(question, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5)),
          const SizedBox(height: 3),
          Text(answer, style: const TextStyle(fontSize: 12, color: Colors.grey)),
        ],
      ),
    );
  }

  void _showContactSupportSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Contact Support', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 14),
            const ListTile(
              leading: Icon(Icons.phone, color: Color(0xFFEA580C)),
              title: Text('Engineering Hotline'),
              subtitle: Text('(02) 8288-8811 local 2234 / 2235'),
            ),
            const ListTile(
              leading: Icon(Icons.email_outlined, color: Color(0xFFEA580C)),
              title: Text('Official Support Email'),
              subtitle: Text('engineering@caloocancity.gov.ph'),
            ),
            const ListTile(
              leading: Icon(Icons.location_city_outlined, color: Color(0xFFEA580C)),
              title: Text('City Engineering Office'),
              subtitle: Text('Caloocan City Hall Complex, 8th Ave, Grace Park, Caloocan'),
            ),
          ],
        ),
      ),
    );
  }

  void _showPrivacyPolicySheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Privacy Policy', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            const Text(
              'PULSO adheres strictly to the Data Privacy Act of 2012 (RA 10173). Citizen reports, photographs, and precise coordinate data are encrypted and utilized exclusively for official civic engineering verification and dispatch.',
              style: TextStyle(fontSize: 13, height: 1.5),
            ),
            const SizedBox(height: 10),
            const Text(
              'Personal identities remain confidential and are never shared publicly without express authorization.',
              style: TextStyle(fontSize: 13, height: 1.5, color: Colors.grey),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEA580C)),
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Understood', style: TextStyle(color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showTermsSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Terms of Use', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            const Text(
              'By utilizing PULSO, you agree to submit truthful, genuine reports regarding civic infrastructure concerns within Caloocan City. Frivolous or fraudulent submissions may result in account restriction.',
              style: TextStyle(fontSize: 13, height: 1.5),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEA580C)),
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Accept', style: TextStyle(color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showCookiesSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Cookie & Storage Preferences', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            const Text(
              'PULSO uses local device storage solely to preserve your login session, offline draft submissions, and UI preferences (such as dark mode and language choice).',
              style: TextStyle(fontSize: 13, height: 1.5),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEA580C)),
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Save Settings', style: TextStyle(color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showLogoutDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign out'),
        content: const Text('Are you sure you want to end your session on this device?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEA580C)),
            onPressed: () async {
              await context.read<ProfileProvider>().logout();
              if (mounted) {
                Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
              }
            },
            child: const Text('Sign out', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
