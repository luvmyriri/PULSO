import 'package:pulso_mobile/widgets/pulso_icon.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:animate_do/animate_do.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:pulso_mobile/widgets/glass_card.dart';
import 'package:pulso_mobile/widgets/pulso_branding.dart';
import 'package:pulso_mobile/l10n/app_localizations.dart';
import 'package:pulso_mobile/core/theme/app_theme.dart';
import 'package:pulso_mobile/core/providers/settings_provider.dart';

class LandingScreen extends StatefulWidget {
  const LandingScreen({super.key});

  @override
  State<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends State<LandingScreen> {
  final ScrollController _scrollController = ScrollController();
  final GlobalKey _platformKey = GlobalKey();
  final GlobalKey _solutionsKey = GlobalKey();
  final GlobalKey _aboutKey = GlobalKey();
  final GlobalKey _servicesKey = GlobalKey();
  final GlobalKey _timelineKey = GlobalKey();

  bool _scrolled = false;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(() {
      if (_scrollController.offset > 50 && !_scrolled) {
        setState(() => _scrolled = true);
      } else if (_scrollController.offset <= 50 && _scrolled) {
        setState(() => _scrolled = false);
      }
    });
  }

  void _scrollToSection(GlobalKey key) {
    Scrollable.ensureVisible(
      key.currentContext!,
      duration: const Duration(milliseconds: 800),
      curve: Curves.easeInOut,
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final settings = context.watch<SettingsProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final brandOrange = AppTheme.primaryOrange;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      extendBodyBehindAppBar: true,
      drawer: Drawer(
        backgroundColor: Theme.of(context).colorScheme.surface,
        child: Column(
          children: [
            DrawerHeader(
              decoration: BoxDecoration(
                color: Theme.of(context).scaffoldBackgroundColor,
              ),
              child: const Center(child: PulsoBranding(scale: 0.8)),
            ),
            ListTile(
              leading: PulsoIcon(Icons.home, color: brandOrange),
              title: Text(
                l10n.home,
                style: GoogleFonts.outfit(
                  color: isDark ? Colors.white : Colors.black87,
                ),
              ),
              onTap: () {
                Navigator.pop(context);
                _scrollController.animateTo(
                  0,
                  duration: const Duration(milliseconds: 500),
                  curve: Curves.easeIn,
                );
              },
            ),
            ListTile(
              leading: PulsoIcon(Icons.dashboard, color: brandOrange),
              title: Text(
                l10n.platform,
                style: GoogleFonts.outfit(
                  color: isDark ? Colors.white : Colors.black87,
                ),
              ),
              onTap: () {
                Navigator.pop(context);
                _scrollToSection(_platformKey);
              },
            ),
            ListTile(
              leading: PulsoIcon(Icons.timeline, color: brandOrange),
              title: Text(
                l10n.howItWorks,
                style: GoogleFonts.outfit(
                  color: isDark ? Colors.white : Colors.black87,
                ),
              ),
              onTap: () {
                Navigator.pop(context);
                _scrollToSection(_timelineKey);
              },
            ),
            ListTile(
              leading: PulsoIcon(Icons.lightbulb, color: brandOrange),
              title: Text(
                l10n.solutions,
                style: GoogleFonts.outfit(
                  color: isDark ? Colors.white : Colors.black87,
                ),
              ),
              onTap: () {
                Navigator.pop(context);
                _scrollToSection(_solutionsKey);
              },
            ),
            ListTile(
              leading: PulsoIcon(Icons.business, color: brandOrange),
              title: Text(
                l10n.aboutLgu,
                style: GoogleFonts.outfit(
                  color: isDark ? Colors.white : Colors.black87,
                ),
              ),
              onTap: () {
                Navigator.pop(context);
                _scrollToSection(_aboutKey);
              },
            ),
            const Divider(color: Colors.white10),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    l10n.themeMode,
                    style: GoogleFonts.outfit(
                      color: isDark ? Colors.white70 : Colors.black54,
                      fontSize: 13,
                    ),
                  ),
                  Row(
                    children: [
                      IconButton(
                        icon: PulsoIcon(
                          Icons.light_mode,
                          color: settings.themeMode == ThemeMode.light
                              ? brandOrange
                              : Colors.grey,
                          size: 20,
                        ),
                        onPressed: () => settings.setThemeMode(ThemeMode.light),
                      ),
                      IconButton(
                        icon: PulsoIcon(
                          Icons.dark_mode,
                          color: settings.themeMode == ThemeMode.dark
                              ? brandOrange
                              : Colors.grey,
                          size: 20,
                        ),
                        onPressed: () => settings.setThemeMode(ThemeMode.dark),
                      ),
                      IconButton(
                        icon: PulsoIcon(
                          Icons.settings_brightness,
                          color: settings.themeMode == ThemeMode.system
                              ? brandOrange
                              : Colors.grey,
                          size: 20,
                        ),
                        onPressed: () =>
                            settings.setThemeMode(ThemeMode.system),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    l10n.language,
                    style: GoogleFonts.outfit(
                      color: isDark ? Colors.white70 : Colors.black54,
                      fontSize: 13,
                    ),
                  ),
                  TextButton(
                    onPressed: () => settings.toggleLocale(),
                    child: Text(
                      settings.locale.languageCode == 'en'
                          ? 'ENGLISH'
                          : 'TAGALOG',
                      style: GoogleFonts.outfit(
                        color: brandOrange,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const Spacer(),
            Padding(
              padding: const EdgeInsets.all(20.0),
              child: ElevatedButton(
                onPressed: () => Navigator.pushNamed(context, '/login'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: brandOrange,
                  minimumSize: const Size(double.infinity, 50),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Text(
                  l10n.login,
                  style: GoogleFonts.outfit(
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(85),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          decoration: BoxDecoration(
            color: _scrolled
                ? (isDark
                      ? const Color(0xCC020617)
                      : Colors.white.withOpacity(0.9))
                : Colors.transparent,
            border: Border(
              bottom: BorderSide(
                color: _scrolled
                    ? (isDark ? Colors.white10 : Colors.black12)
                    : Colors.transparent,
                width: 1,
              ),
            ),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
          child: SafeArea(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Builder(
                  builder: (context) {
                    return IconButton(
                      icon: PulsoIcon(
                        Icons.menu,
                        color: isDark ? Colors.white : brandOrange,
                        size: 28,
                      ),
                      onPressed: () => Scaffold.of(context).openDrawer(),
                    );
                  },
                ),
                Flexible(
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.centerLeft,
                    child: const PulsoBranding(scale: 0.6),
                  ),
                ),
                const SizedBox(width: 8),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Theme Toggle
                    Container(
                      padding: const EdgeInsets.all(2),
                      decoration: BoxDecoration(
                        color: isDark
                            ? Colors.white.withOpacity(0.05)
                            : Colors.black.withOpacity(0.05),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        children: [
                          _buildThemeButton(
                            context,
                            ThemeMode.light,
                            Icons.wb_sunny_outlined,
                          ),
                          _buildThemeButton(
                            context,
                            ThemeMode.system,
                            Icons.settings_brightness_outlined,
                          ),
                          _buildThemeButton(
                            context,
                            ThemeMode.dark,
                            Icons.nightlight_outlined,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    ElevatedButton(
                      onPressed: () => Navigator.pushNamed(context, '/login'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: brandOrange,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 10,
                        ),
                      ),
                      child: Text(
                        l10n.login,
                        style: GoogleFonts.outfit(
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
      body: SingleChildScrollView(
        controller: _scrollController,
        child: Column(
          children: [
            const IntroductionSection(),
            PlatformSection(key: _platformKey),
            TimelineSection(key: _timelineKey),
            SolutionsSection(key: _solutionsKey),
            ServicesSection(key: _servicesKey),
            AboutLguSection(key: _aboutKey),
            const FooterSection(),
          ],
        ),
      ),
    );
  }

  Widget _buildThemeButton(
    BuildContext context,
    ThemeMode mode,
    IconData icon,
  ) {
    final settings = context.watch<SettingsProvider>();
    final isSelected = settings.themeMode == mode;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final brandOrange = AppTheme.primaryOrange;

    return GestureDetector(
      onTap: () => settings.setThemeMode(mode),
      child: Container(
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: isSelected
              ? (isDark ? Colors.white10 : Colors.black12)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(15),
        ),
        child: PulsoIcon(
          icon,
          size: 14,
          color: isSelected
              ? brandOrange
              : (isDark ? Colors.white38 : brandOrange.withOpacity(0.4)),
        ),
      ),
    );
  }
}

class IntroductionSection extends StatelessWidget {
  const IntroductionSection({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final brandOrange = AppTheme.primaryOrange;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(24, 160, 24, 80),
      decoration: BoxDecoration(
        image: DecorationImage(
          image: const NetworkImage(
            'https://www.transparenttextures.com/patterns/carbon-fibre.png',
          ),
          opacity: isDark ? 0.05 : 0.02,
          repeat: ImageRepeat.repeat,
        ),
      ),
      child: FadeInDown(
        child: Column(
          children: [
            Text(
              l10n.heroTitle,
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(
                fontSize: 42,
                fontWeight: FontWeight.w900,
                color: isDark ? Colors.white : const Color(0xFF0F172A),
                height: 1.1,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              l10n.heroSubtitle,
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(
                fontSize: 16,
                color: isDark ? Colors.white70 : Colors.black54,
                height: 1.6,
              ),
            ),
            const SizedBox(height: 40),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => Navigator.pushNamed(context, '/register'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: brandOrange,
                      foregroundColor: Colors.white,
                      elevation: 8,
                      shadowColor: brandOrange.withOpacity(0.4),
                      padding: const EdgeInsets.symmetric(vertical: 18),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(15),
                      ),
                    ),
                    child: Text(
                      l10n.registerNow,
                      style: GoogleFonts.outfit(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {},
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(
                        color: isDark ? Colors.white24 : Colors.black12,
                        width: 2,
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 18),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(15),
                      ),
                    ),
                    child: Text(
                      l10n.documentation,
                      style: GoogleFonts.outfit(
                        color: isDark ? Colors.white70 : Colors.black54,
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class PlatformSection extends StatelessWidget {
  const PlatformSection({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      width: double.infinity,
      color: isDark
          ? Colors.white.withOpacity(0.01)
          : Colors.black.withOpacity(0.02),
      padding: const EdgeInsets.symmetric(vertical: 80, horizontal: 24),
      child: Column(
        children: [
          FadeInUp(
            child: Text(
              l10n.platformTitle,
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(
                fontSize: 32,
                fontWeight: FontWeight.w900,
                color: isDark ? Colors.white : const Color(0xFF0F172A),
                height: 1.1,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            l10n.platformSubtitle,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: isDark ? Colors.white54 : Colors.black54,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 50),
          _buildOptionCard(
            context,
            Icons.location_on,
            l10n.geoTriageTitle,
            l10n.geoTriageDesc,
          ),
          _buildOptionCard(
            context,
            Icons.analytics,
            l10n.predictiveTitle,
            l10n.predictiveDesc,
          ),
          _buildOptionCard(
            context,
            Icons.psychology,
            l10n.aiOptimizationTitle,
            l10n.aiOptimizationDesc,
          ),
        ],
      ),
    );
  }

  Widget _buildOptionCard(
    BuildContext context,
    IconData icon,
    String title,
    String desc,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final brandOrange = AppTheme.primaryOrange;

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 24),
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B).withOpacity(0.4) : Colors.white,
        borderRadius: BorderRadius.circular(25),
        border: Border.all(
          color: isDark
              ? Colors.white.withOpacity(0.05)
              : Colors.black.withOpacity(0.05),
        ),
        boxShadow: isDark
            ? []
            : [
                BoxShadow(
                  color: Colors.black.withOpacity(0.03),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                ),
              ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: brandOrange.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: PulsoIcon(icon, color: brandOrange, size: 28),
          ),
          const SizedBox(height: 20),
          Text(
            title,
            style: GoogleFonts.outfit(
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : const Color(0xFF0F172A),
              fontSize: 18,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            desc,
            style: TextStyle(
              color: isDark ? Colors.white54 : Colors.black54,
              fontSize: 13,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}

class TimelineSection extends StatelessWidget {
  const TimelineSection({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final brandOrange = AppTheme.primaryOrange;

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 80, horizontal: 24),
      child: Column(
        children: [
          FadeInUp(
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    PulsoIcon(
                      Icons.assignment_outlined,
                      color: brandOrange,
                      size: 16,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      l10n.howItWorks,
                      style: GoogleFonts.outfit(
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        color: brandOrange,
                        letterSpacing: 2,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  l10n.timelineTitle,
                  textAlign: TextAlign.center,
                  style: GoogleFonts.outfit(
                    fontSize: 30,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  l10n.timelineSubtitle,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: isDark ? Colors.white54 : Colors.black54,
                    fontSize: 14,
                    height: 1.5,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 60),
          _buildStep(
            context,
            1,
            Icons.person_search,
            l10n.step1Title,
            l10n.step1Desc,
            brandOrange,
          ),
          _buildStep(
            context,
            2,
            Icons.photo_camera,
            l10n.step2Title,
            l10n.step2Desc,
            const Color(0xFFEAB308),
          ),
          _buildStep(
            context,
            3,
            Icons.psychology,
            l10n.step3Title,
            l10n.step3Desc,
            const Color(0xFFA855F7),
          ),
          _buildStep(
            context,
            4,
            Icons.support_agent,
            l10n.step4Title,
            l10n.step4Desc,
            const Color(0xFF3B82F6),
          ),
          _buildStep(
            context,
            5,
            Icons.build,
            l10n.step5Title,
            l10n.step5Desc,
            const Color(0xFF22C55E),
          ),
        ],
      ),
    );
  }

  Widget _buildStep(
    BuildContext context,
    int num,
    IconData icon,
    String title,
    String desc,
    Color color,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return FadeInUp(
      child: Padding(
        padding: const EdgeInsets.only(bottom: 32),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Column(
              children: [
                Stack(
                  alignment: Alignment.topRight,
                  children: [
                    Container(
                      width: 60,
                      height: 60,
                      decoration: BoxDecoration(
                        color: color,
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: [
                          BoxShadow(
                            color: color.withOpacity(0.3),
                            blurRadius: 15,
                            offset: const Offset(0, 8),
                          ),
                        ],
                      ),
                      child: PulsoIcon(icon, color: Colors.white, size: 30),
                    ),
                    Transform.translate(
                      offset: const Offset(8, -8),
                      child: Container(
                        width: 24,
                        height: 24,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: isDark
                                ? const Color(0xFF020617)
                                : Colors.white,
                            width: 3,
                          ),
                        ),
                        child: Center(
                          child: Text(
                            '$num',
                            style: const TextStyle(
                              color: Colors.black,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                if (num < 5)
                  Container(
                    width: 2,
                    height: 80,
                    margin: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [color, color.withOpacity(0.0)],
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(width: 24),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 4),
                  Text(
                    title,
                    style: GoogleFonts.outfit(
                      color: isDark ? Colors.white : const Color(0xFF0F172A),
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    desc,
                    style: TextStyle(
                      color: isDark ? Colors.white54 : Colors.black54,
                      fontSize: 14,
                      height: 1.5,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class SolutionsSection extends StatelessWidget {
  const SolutionsSection({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final brandOrange = AppTheme.primaryOrange;

    return Container(
      color: isDark
          ? Colors.white.withOpacity(0.01)
          : Colors.black.withOpacity(0.01),
      padding: const EdgeInsets.symmetric(vertical: 80, horizontal: 24),
      child: Column(
        children: [
          FadeInUp(
            child: Column(
              children: [
                Text(
                  l10n.solutionsTitle,
                  textAlign: TextAlign.center,
                  style: GoogleFonts.outfit(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  l10n.solutionsSubtitle,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: isDark ? Colors.white54 : Colors.black54,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 50),
          _buildSolutionCard(
            context,
            Icons.edit_road,
            l10n.roadsTitle,
            l10n.roadsDesc,
            [l10n.roadsTitle, 'Pavement Markings'],
            brandOrange,
          ),
          _buildSolutionCard(
            context,
            Icons.water_drop,
            l10n.waterTitle,
            l10n.waterDesc,
            ['Drainage De-clogging', 'Flood Control'],
            const Color(0xFF3B82F6),
          ),
          _buildSolutionCard(
            context,
            Icons.lightbulb,
            l10n.lightingTitle,
            l10n.lightingDesc,
            ['Bulb Replacement', 'Grid Safety'],
            const Color(0xFFEAB308),
          ),
          _buildSolutionCard(
            context,
            Icons.security,
            l10n.safetyTitle,
            l10n.safetyDesc,
            ['Structural Safety', 'Debris Clearing'],
            const Color(0xFFEF4444),
          ),
          _buildSolutionCard(
            context,
            Icons.apartment,
            l10n.facilitiesTitle,
            l10n.facilitiesDesc,
            ['Facility Repair', 'Park Maintenance'],
            const Color(0xFF10B981),
          ),
        ],
      ),
    );
  }

  Widget _buildSolutionCard(
    BuildContext context,
    IconData icon,
    String title,
    String desc,
    List<String> items,
    Color color,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: isDark
            ? const Color(0xFF1E293B).withOpacity(0.35)
            : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark
              ? Colors.white.withOpacity(0.03)
              : Colors.black.withOpacity(0.05),
        ),
        boxShadow: isDark
            ? []
            : [
                BoxShadow(
                  color: Colors.black.withOpacity(0.04),
                  blurRadius: 15,
                  offset: const Offset(0, 8),
                ),
              ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          PulsoIcon(icon, color: color, size: 32),
          const SizedBox(height: 16),
          Text(
            title,
            style: GoogleFonts.outfit(
              color: isDark ? Colors.white : const Color(0xFF0F172A),
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            desc,
            style: TextStyle(
              color: isDark ? Colors.white60 : Colors.black54,
              fontSize: 13,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 16),
          ...items.map(
            (item) => Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                children: [
                  PulsoIcon(Icons.check_circle_outline, color: color, size: 14),
                  const SizedBox(width: 8),
                  Text(
                    item,
                    style: TextStyle(
                      color: isDark ? Colors.white70 : Colors.black87,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
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

class ServicesSection extends StatelessWidget {
  const ServicesSection({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final brandOrange = AppTheme.primaryOrange;

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 80, horizontal: 24),
      child: Column(
        children: [
          FadeInUp(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                PulsoIcon(Icons.open_in_new, size: 14, color: brandOrange),
                const SizedBox(width: 8),
                Text(
                  l10n.cityServicesBadge,
                  style: GoogleFonts.outfit(
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    color: brandOrange,
                    letterSpacing: 2,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Text(
            l10n.cityServicesTitle,
            textAlign: TextAlign.center,
            style: GoogleFonts.outfit(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : const Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 45),
          Wrap(
            spacing: 16,
            runSpacing: 16,
            alignment: WrapAlignment.center,
            children: [
              _buildServiceCard(
                context,
                Icons.person,
                'Senior Citizen ID (OSCA)',
                'Register for your official PVC ID card to access senior citizen benefits and services under OSCA.',
                [
                  {
                    'label': 'New Senior Registration',
                    'url': 'http://oscanew.caloocanservices.online/',
                  },
                  {
                    'label': 'PVC Card Replacement',
                    'url': 'https://osca.caloocanservices.online/',
                  },
                  {
                    'label': 'ID Status Tracking',
                    'url': 'https://oscaverify.caloocanservices.online/',
                  },
                ],
                const Color(0xFF6366F1), // Indigo
              ),
              _buildServiceCard(
                context,
                Icons.accessible,
                'PWD Registration',
                'Register for your official PVC ID card to access PWD benefits and services from the city government.',
                [
                  {
                    'label': 'Register as PWD',
                    'url': 'https://pwd.caloocanservices.online/',
                  },
                  {
                    'label': 'PWD ID Verifier',
                    'url': 'https://pwdverify.caloocanservices.online/',
                  },
                  {
                    'label': 'ID Status Tracking',
                    'url': 'https://pwd.caloocanservices.online/verify',
                  },
                ],
                const Color(0xFFA855F7), // Purple
              ),
              _buildServiceCard(
                context,
                Icons.favorite,
                'Solo Parent Registration',
                'Register for your Solo Parent ID card to access benefits and services under RA 8972 (Solo Parents Welfare Act).',
                [
                  {
                    'label': 'New Solo Parent Registration',
                    'url': 'https://soloparent.caloocanservices.online/',
                  },
                  {
                    'label': 'ID Status Tracking',
                    'url':
                        'https://soloparent.caloocanservices.online/tracker/',
                  },
                ],
                const Color(0xFFF43F5E), // Rose
              ),
              _buildServiceCard(
                context,
                Icons.description,
                'GAD Plan & Budget',
                'For barangays: Submit and track your Gender and Development Plan, Budget, and Accomplishment Reports.',
                [
                  {
                    'label': 'Submit GAD Report',
                    'url': 'https://gadplan.caloocanservices.online/',
                  },
                  {
                    'label': 'Check Report Status',
                    'url': 'https://gadplan.caloocanservices.online/verify.php',
                  },
                ],
                const Color(0xFF14B8A6), // Teal
              ),
            ],
          ),
          const SizedBox(height: 50),
          FadeInUp(
            child: OutlinedButton.icon(
              onPressed: () => _launchUrl('https://caloocanservices.online/'),
              icon: const PulsoIcon(Icons.open_in_new, size: 18),
              label: Text(
                l10n.visitPortal,
                style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
              ),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF6366F1),
                side: const BorderSide(color: Color(0xFF6366F1), width: 2),
                padding: const EdgeInsets.symmetric(
                  horizontal: 32,
                  vertical: 16,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(15),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildServiceCard(
    BuildContext context,
    IconData icon,
    String title,
    String desc,
    List<Map<String, String>> items,
    Color color,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      width: 320,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B).withOpacity(0.5) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.2)),
        boxShadow: isDark
            ? []
            : [
                BoxShadow(
                  color: Colors.black.withOpacity(0.04),
                  blurRadius: 15,
                  offset: const Offset(0, 8),
                ),
              ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: PulsoIcon(icon, color: color, size: 28),
          ),
          const SizedBox(height: 16),
          Text(
            title,
            style: GoogleFonts.outfit(
              color: isDark ? Colors.white : const Color(0xFF0F172A),
              fontSize: 17,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            desc,
            style: TextStyle(
              color: isDark ? Colors.white54 : Colors.black54,
              fontSize: 13,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 16),
          ...items.map(
            (item) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: InkWell(
                onTap: () => _launchUrl(item['url']!),
                child: Row(
                  children: [
                    PulsoIcon(Icons.radio_button_checked, color: color, size: 12),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        item['label']!,
                        style: TextStyle(
                          color: color.withOpacity(0.9),
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          decoration: TextDecoration.underline,
                          decorationColor: color.withOpacity(0.4),
                        ),
                      ),
                    ),
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

class AboutLguSection extends StatelessWidget {
  const AboutLguSection({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final brandOrange = AppTheme.primaryOrange;

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 80, horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          FadeInUp(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                PulsoIcon(Icons.people, color: brandOrange, size: 16),
                const SizedBox(width: 8),
                Text(
                  l10n.aboutBadge,
                  style: GoogleFonts.outfit(
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    color: brandOrange,
                    letterSpacing: 1,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Text(
            l10n.aboutTitle,
            textAlign: TextAlign.center,
            style: GoogleFonts.outfit(
              fontSize: 34,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : const Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            l10n.aboutDesc,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: isDark ? Colors.white70 : Colors.black54,
              fontSize: 14,
              height: 1.6,
            ),
          ),
          const SizedBox(height: 40),
          Container(
            padding: const EdgeInsets.all(25),
            decoration: BoxDecoration(
              color: isDark
                  ? const Color(0xFF1E293B).withOpacity(0.4)
                  : Colors.white,
              borderRadius: BorderRadius.circular(25),
              border: Border.all(
                color: isDark
                    ? Colors.white.withOpacity(0.08)
                    : Colors.black.withOpacity(0.05),
              ),
              boxShadow: isDark
                  ? []
                  : [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.03),
                        blurRadius: 20,
                        offset: const Offset(0, 10),
                      ),
                    ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      l10n.systemAnalytics,
                      style: GoogleFonts.outfit(
                        color: isDark ? Colors.white : const Color(0xFF0F172A),
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    PulsoIcon(Icons.bar_chart, color: brandOrange),
                  ],
                ),
                const SizedBox(height: 25),
                _buildAnalyticsBar(context, l10n.metricResolved, 0.87, '87%'),
                const SizedBox(height: 15),
                _buildAnalyticsBar(context, l10n.metricDispatch, 0.92, '92%'),
                const SizedBox(height: 15),
                _buildAnalyticsBar(context, l10n.metricAdoption, 0.64, '64%'),
              ],
            ),
          ),
          const SizedBox(height: 50),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildStat(context, '13', 'BARANGAYS'),
              _buildStat(context, '24/7', 'MONITORING'),
              _buildStat(context, '<2h', 'RESPONSE TARGET'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAnalyticsBar(
    BuildContext context,
    String label,
    double percent,
    String val,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final brandOrange = AppTheme.primaryOrange;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              label,
              style: TextStyle(
                color: isDark ? Colors.white70 : Colors.black54,
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              val,
              style: TextStyle(
                color: brandOrange,
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Stack(
          children: [
            Container(
              height: 6,
              decoration: BoxDecoration(
                color: isDark ? Colors.white10 : Colors.black12,
                borderRadius: BorderRadius.circular(3),
              ),
            ),
            FractionallySizedBox(
              widthFactor: percent,
              child: Container(
                height: 6,
                decoration: BoxDecoration(
                  color: brandOrange,
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildStat(BuildContext context, String val, String label) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final brandOrange = AppTheme.primaryOrange;

    return Column(
      children: [
        Text(
          val,
          style: GoogleFonts.outfit(
            color: isDark ? Colors.white : const Color(0xFF0F172A),
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: GoogleFonts.outfit(
            color: brandOrange,
            fontSize: 9,
            fontWeight: FontWeight.w900,
            letterSpacing: 0.5,
          ),
        ),
      ],
    );
  }
}

class FooterSection extends StatelessWidget {
  const FooterSection({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      width: double.infinity,
      color: isDark ? const Color(0xFF0F172A) : Colors.grey[200],
      padding: const EdgeInsets.all(50),
      child: Column(
        children: [
          const PulsoBranding(scale: 0.8),
          const SizedBox(height: 40),
          Divider(color: isDark ? Colors.white10 : Colors.black12),
          const SizedBox(height: 40),
          Text(
            'Engineering Operations Department\nCity Government of Caloocan, Philippines',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: isDark ? Colors.white38 : Colors.black38,
              fontSize: 13,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 60),
          Text(
            '© ${DateTime.now().year} PULSO PROJECT. All rights reserved.',
            style: GoogleFonts.outfit(
              color: isDark ? Colors.white24 : Colors.black26,
              fontSize: 10,
              fontWeight: FontWeight.bold,
              letterSpacing: 1,
            ),
          ),
        ],
      ),
    );
  }
}

Future<void> _launchUrl(String url) async {
  final Uri uri = Uri.parse(url);
  if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
    throw Exception('Could not launch $url');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// END
// ─────────────────────────────────────────────────────────────────────────────
