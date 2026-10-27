import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingItemData {
  final IconData icon;
  final String title;
  final String description;
  final int? number;

  const _OnboardingItemData({
    required this.icon,
    required this.title,
    required this.description,
    this.number,
  });
}

class _OnboardingStepData {
  final int step;
  final String? eyebrow;
  final String title;
  final String subtitle;
  final String? sectionTitle;
  final List<_OnboardingItemData> items;
  final String primaryButtonText;
  final bool hasBackButton;

  const _OnboardingStepData({
    required this.step,
    this.eyebrow,
    required this.title,
    required this.subtitle,
    this.sectionTitle,
    required this.items,
    required this.primaryButtonText,
    this.hasBackButton = true,
  });
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  int _currentStep = 1;
  final int _totalSteps = 5;
  late final PageController _pageController;

  final List<_OnboardingStepData> _steps = const [
    _OnboardingStepData(
      step: 1,
      eyebrow: 'CALOOCAN CITY',
      title: 'A better neighborhood starts with you.',
      subtitle: 'Report local infrastructure concerns and follow the city\'s response.',
      sectionTitle: 'How it works',
      hasBackButton: false,
      primaryButtonText: 'Start a report',
      items: [
        _OnboardingItemData(
          icon: Icons.looks_one_rounded,
          number: 1,
          title: 'Describe the concern',
          description: 'Tell us what needs attention.',
        ),
        _OnboardingItemData(
          icon: Icons.looks_two_rounded,
          number: 2,
          title: 'Pin the location',
          description: 'Add the spot and a clear photo.',
        ),
        _OnboardingItemData(
          icon: Icons.looks_3_rounded,
          number: 3,
          title: 'Review and submit',
          description: 'Check your details before sending.',
        ),
      ],
    ),
    _OnboardingStepData(
      step: 2,
      title: 'Show us what needs attention.',
      subtitle: 'Choose a category and describe the concern.',
      hasBackButton: true,
      primaryButtonText: 'Continue',
      items: [
        _OnboardingItemData(
          icon: Icons.build_rounded,
          title: 'Roads and public facilities',
          description: 'Report issues like roads, sidewalks, streetlights and more.',
        ),
        _OnboardingItemData(
          icon: Icons.chat_bubble_outline_rounded,
          title: 'Clear specific description',
          description: 'Share what you see in simple details.',
        ),
        _OnboardingItemData(
          icon: Icons.assignment_outlined,
          title: 'One concern per report',
          description: 'Keep each report focused on one issue.',
        ),
      ],
    ),
    _OnboardingStepData(
      step: 3,
      title: 'Put the issue on the map.',
      subtitle: 'Pin the exact location so the team knows where to look.',
      hasBackButton: true,
      primaryButtonText: 'Continue',
      items: [
        _OnboardingItemData(
          icon: Icons.location_on_outlined,
          title: 'Place the map pin',
          description: 'Tap the map to mark the exact location.',
        ),
        _OnboardingItemData(
          icon: Icons.map_outlined,
          title: 'Add a street or landmark',
          description: 'Include a nearby street address or landmark to help.',
        ),
        _OnboardingItemData(
          icon: Icons.my_location_rounded,
          title: 'Check the location',
          description: 'Make sure the pin is in the right spot before continuing.',
        ),
      ],
    ),
    _OnboardingStepData(
      step: 4,
      title: 'A clear photo tells the story.',
      subtitle: 'Add useful evidence from a safe place.',
      hasBackButton: true,
      primaryButtonText: 'Continue',
      items: [
        _OnboardingItemData(
          icon: Icons.camera_alt_outlined,
          title: 'Show the issue clearly',
          description: 'Capture the problem in good light and focus.',
        ),
        _OnboardingItemData(
          icon: Icons.image_outlined,
          title: 'Include nearby surroundings',
          description: 'Show the area around the issue to provide context.',
        ),
        _OnboardingItemData(
          icon: Icons.person_outline_rounded,
          title: 'Avoid unnecessary personal details',
          description: 'Keep people\'s faces, license plates and private information out of photos.',
        ),
      ],
    ),
    _OnboardingStepData(
      step: 5,
      title: 'Stay informed after you submit.',
      subtitle: 'Find your report ID and follow updates in My Reports.',
      hasBackButton: true,
      primaryButtonText: 'Start a report',
      items: [
        _OnboardingItemData(
          icon: Icons.notifications_none_rounded,
          title: 'Check report status',
          description: 'See progress and any changes in My Reports.',
        ),
        _OnboardingItemData(
          icon: Icons.chat_bubble_outline_rounded,
          title: 'Read department feedback',
          description: 'Look for messages or requests for more information.',
        ),
        _OnboardingItemData(
          icon: Icons.assignment_turned_in_outlined,
          title: 'Review any next steps',
          description: 'Follow any instructions provided by the department.',
        ),
      ],
    ),
  ];

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _onNext() {
    if (_currentStep < _totalSteps) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeInOut,
      );
    } else {
      _finishOnboarding();
    }
  }

  void _onBack() {
    if (_currentStep > 1) {
      _pageController.previousPage(
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeInOut,
      );
    }
  }

  void _finishOnboarding() {
    Navigator.of(context).pushReplacementNamed('/home');
  }

  void _goToLogin() {
    Navigator.of(context).pushNamed('/login');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final bgColor = isDark ? const Color(0xFF060D1A) : Colors.white;
    final textColor = isDark ? Colors.white : const Color(0xFF0F172A);
    final subtitleColor = isDark ? Colors.white : const Color(0xFF64748B);
    const primaryOrange = Color(0xFFEA580C);
    final heroAsset = isDark
        ? 'assets/images/onboarding_hero_dark.png'
        : 'assets/images/onboarding_hero.png';

    return Scaffold(
      backgroundColor: bgColor,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 10.0),
          child: Column(
            children: [
              // ── Header: Seal Logo + "City Engineering Department" / "powered by PULSO" + "Skip" ──
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 32,
                        height: 32,
                        margin: const EdgeInsets.only(right: 10),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
                          border: Border.all(
                            color: isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0),
                            width: 1,
                          ),
                        ),
                        child: ClipOval(
                          child: Image.asset(
                            'assets/images/engineering-logo.jpg',
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) => const Icon(
                              Icons.location_city_rounded,
                              size: 16,
                              color: primaryOrange,
                            ),
                          ),
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'City Engineering Department',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: textColor,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                'powered by ',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w500,
                                  color: subtitleColor,
                                ),
                              ),
                              Text(
                                'PULSO',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  color: primaryOrange,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                  TextButton(
                    onPressed: _finishOnboarding,
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: Text(
                      'Skip',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: subtitleColor,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // ── Connected Progress Track: Line with 5 nodes + "X of 5" ──
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  SizedBox(
                    width: 160,
                    height: 16,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        // Background track line
                        Positioned(
                          left: 4,
                          right: 4,
                          child: Container(
                            height: 1.5,
                            color: isDark ? const Color(0xFF1E2D48) : const Color(0xFFE2E8F0),
                          ),
                        ),
                        // 5 Nodes
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: List.generate(_totalSteps, (index) {
                            final stepIndex = index + 1;
                            final isActive = stepIndex == _currentStep;
                            return Container(
                              width: isActive ? 12 : 8,
                              height: isActive ? 12 : 8,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: isActive
                                    ? primaryOrange
                                    : (isDark ? const Color(0xFF1E2D48) : const Color(0xFFCBD5E1)),
                                border: isActive
                                    ? Border.all(color: primaryOrange.withOpacity(0.3), width: 3)
                                    : Border.all(
                                        color: isDark ? const Color(0xFF2D3F60) : Colors.transparent,
                                        width: 1,
                                      ),
                              ),
                            );
                          }),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    '$_currentStep of $_totalSteps',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: subtitleColor,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // ── Graphic Hero Illustration ──
              Container(
                height: 200,
                width: double.infinity,
                alignment: Alignment.center,
                child: Image.asset(
                  heroAsset,
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      height: 190,
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF111C30) : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.location_city_rounded,
                          size: 60,
                          color: primaryOrange,
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 10),

              // ── PageView for the 5 Step contents ──
              Expanded(
                child: PageView.builder(
                  controller: _pageController,
                  physics: const ClampingScrollPhysics(),
                  onPageChanged: (index) {
                    setState(() {
                      _currentStep = index + 1;
                    });
                  },
                  itemCount: _steps.length,
                  itemBuilder: (context, index) {
                    final stepData = _steps[index];
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (stepData.eyebrow != null) ...[
                          Text(
                            stepData.eyebrow!,
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                              color: primaryOrange,
                              letterSpacing: 1.2,
                            ),
                          ),
                          const SizedBox(height: 4),
                        ],
                        Text(
                          stepData.title,
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 21,
                            fontWeight: FontWeight.w800,
                            color: textColor,
                            height: 1.22,
                            letterSpacing: -0.2,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          stepData.subtitle,
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 13,
                            fontWeight: FontWeight.w400,
                            color: subtitleColor,
                            height: 1.35,
                          ),
                        ),
                        if (stepData.sectionTitle != null) ...[
                          const SizedBox(height: 8),
                          Text(
                            stepData.sectionTitle!,
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: textColor,
                            ),
                          ),
                        ],
                        const SizedBox(height: 10),
                        Expanded(
                          child: ListView.separated(
                            padding: EdgeInsets.zero,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: stepData.items.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 12),
                            itemBuilder: (context, i) {
                              final item = stepData.items[i];
                              final isStep1 = stepData.step == 1;
                              return Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  if (isStep1)
                                    Container(
                                      width: 38,
                                      height: 38,
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(10),
                                        color: isDark
                                            ? const Color(0xFF121B2F)
                                            : const Color(0xFFFFF7ED),
                                        border: Border.all(
                                          color: primaryOrange,
                                          width: 1.5,
                                        ),
                                      ),
                                      child: Center(
                                        child: Text(
                                          '${item.number ?? i + 1}',
                                          style: GoogleFonts.plusJakartaSans(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w800,
                                            color: primaryOrange,
                                          ),
                                        ),
                                      ),
                                    )
                                  else
                                    Container(
                                      width: 38,
                                      height: 38,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        color: isDark
                                            ? const Color(0xFF111C30)
                                            : const Color(0xFFFFF7ED),
                                        border: Border.all(
                                          color: isDark
                                              ? const Color(0xFF1E2E4A)
                                              : const Color(0xFFFFEDD5),
                                          width: 1,
                                        ),
                                      ),
                                      child: Center(
                                        child: Icon(
                                          item.icon,
                                          size: 19,
                                          color: primaryOrange,
                                        ),
                                      ),
                                    ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          item.title,
                                          style: GoogleFonts.plusJakartaSans(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w700,
                                            color: textColor,
                                            height: 1.25,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          item.description,
                                          style: GoogleFonts.plusJakartaSans(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w400,
                                            color: subtitleColor,
                                            height: 1.3,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              );
                            },
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),

              // ── Action Buttons ──
              if (_currentStep == 1)
                Column(
                  children: [
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        onPressed: _onNext,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: primaryOrange,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              'Start a report',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(width: 8),
                            const Icon(Icons.arrow_forward_rounded, size: 18),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'Already have an account? ',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w500,
                            color: subtitleColor,
                          ),
                        ),
                        GestureDetector(
                          onTap: _goToLogin,
                          child: Text(
                            'Sign in',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                              color: primaryOrange,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                )
              else
                Column(
                  children: [
                    Row(
                      children: [
                        TextButton(
                          onPressed: _onBack,
                          style: TextButton.styleFrom(
                            foregroundColor: isDark ? Colors.white : const Color(0xFF64748B),
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          ),
                          child: Text(
                            'Back',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 14.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        const Spacer(),
                        SizedBox(
                          height: 48,
                          child: ElevatedButton(
                            onPressed: _onNext,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: primaryOrange,
                              foregroundColor: Colors.white,
                              elevation: 0,
                              padding: const EdgeInsets.symmetric(horizontal: 24),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  _currentStep == _totalSteps ? 'Start a report' : 'Continue',
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 14.5,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                const Icon(Icons.arrow_forward_rounded, size: 18),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (_currentStep == _totalSteps) ...[
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            'Already have an account? ',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w500,
                              color: subtitleColor,
                            ),
                          ),
                          GestureDetector(
                            onTap: _goToLogin,
                            child: Text(
                              'Sign in',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w700,
                                color: primaryOrange,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              const SizedBox(height: 4),
            ],
          ),
        ),
      ),
    );
  }
}
