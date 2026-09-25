import 'package:flutter/material.dart';
import 'package:pulso_mobile/core/theme/app_theme.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'dart:io';
import 'dart:ui';
import 'package:flutter/cupertino.dart';
import 'package:provider/provider.dart';
import 'package:pulso_mobile/features/home/home_provider.dart';
import 'package:pulso_mobile/features/registration/screens/camera_screen.dart';
import 'package:pulso_mobile/features/home/screens/map_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  // Quick Links remain static UI components
  final List<Map<String, dynamic>> _quickLinks = [
    {
      'title': 'Report\nIssue',
      'icon': Icons.warning_amber_rounded,
      'color': AppTheme.primaryOrange,
    },
    {
      'title': 'LGU\nProjects',
      'icon': Icons.map_outlined,
      'color': Colors.blueAccent,
    },
    {
      'title': 'OBO\nPermits',
      'icon': Icons.foundation_rounded,
      'color': Colors.tealAccent,
    },
    {
      'title': 'My\nBarangay',
      'icon': Icons.location_city_rounded,
      'color': Colors.indigoAccent,
    },
  ];

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<HomeProvider>();

    /// Pages indexed by bottom nav
    final List<Widget> pages = [
      _HomeFeed(provider: provider, quickLinks: _quickLinks),
      const MapScreen(), // Live Google Maps view
      _PlaceholderPage(icon: Icons.foundation_rounded, label: 'OBO Services'),
      _PlaceholderPage(icon: Icons.person_rounded, label: 'Profile'),
    ];

    return Scaffold(
      backgroundColor: AppTheme.primaryDark,
      body: IndexedStack(index: _currentIndex, children: pages),

      // Floating Action Button — only show on Home tab
      floatingActionButton: _currentIndex == 0
          ? Container(
              height: 65,
              width: 160,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(35),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primaryOrange.withOpacity(0.4),
                    blurRadius: 15,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(35),
                child: Material(
                  color: AppTheme.primaryOrange,
                  child: InkWell(
                    onTap: () async {
                      final result = await Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) =>
                              const CameraScreen(side: 'incident_report'),
                        ),
                      );

                      if (result != null &&
                          result is Map &&
                          result['file'] != null &&
                          mounted) {
                        final File imageFile = result['file'];
                        final double? capturedLat = result['lat'];
                        final double? capturedLng = result['lng'];
                        final String? capturedAddress = result['address'];
                        // Show Quick Review / Submission Dialog
                        String selectedCategory = 'Road Issue';
                        final TextEditingController notesController =
                            TextEditingController();
                        final TextEditingController locationDescController =
                            TextEditingController();

                        showModalBottomSheet(
                          context: context,
                          isScrollControlled: true,
                          backgroundColor: Colors.transparent,
                          builder: (context) => StatefulBuilder(
                            builder: (context, setModalState) => Container(
                              height: MediaQuery.of(context).size.height * 0.75,
                              decoration: const BoxDecoration(
                                color: AppTheme.primaryDark,
                                borderRadius: BorderRadius.vertical(
                                  top: Radius.circular(30),
                                ),
                              ),
                              padding: const EdgeInsets.all(24),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      const Text(
                                        'New AI Report',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: 20,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      IconButton(
                                        onPressed: () => Navigator.pop(context),
                                        icon: const Icon(
                                          Icons.close,
                                          color: Colors.white54,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 16),
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(16),
                                    child: Image.file(
                                      imageFile,
                                      height: 180,
                                      width: double.infinity,
                                      fit: BoxFit.cover,
                                    ),
                                  ),
                                  const SizedBox(height: 20),
                                  const Text(
                                    'Category',
                                    style: TextStyle(
                                      color: Colors.white70,
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 16,
                                    ),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withOpacity(0.05),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: Colors.white10),
                                    ),
                                    child: DropdownButton<String>(
                                      value: selectedCategory,
                                      dropdownColor: AppTheme.primaryDark,
                                      isExpanded: true,
                                      underline: const SizedBox(),
                                      items:
                                          [
                                                'Road Issue',
                                                'Water / Drainage',
                                                'Waste Management',
                                                'Street Lighting',
                                                'Public Safety',
                                              ]
                                              .map(
                                                (c) => DropdownMenuItem(
                                                  value: c,
                                                  child: Text(
                                                    c,
                                                    style: const TextStyle(
                                                      color: Colors.white,
                                                    ),
                                                  ),
                                                ),
                                              )
                                              .toList(),
                                      onChanged: (val) => setModalState(
                                        () => selectedCategory = val!,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 20),
                                  // Location Info Display
                                  if (capturedLat != null &&
                                      capturedLng != null) ...[
                                    Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: Colors.green.withOpacity(0.15),
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(
                                          color: Colors.green.withOpacity(0.3),
                                        ),
                                      ),
                                      child: Row(
                                        children: [
                                          const Icon(
                                            Icons.location_on,
                                            color: Colors.green,
                                            size: 20,
                                          ),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Text(
                                              'GPS: ${capturedLat!.toStringAsFixed(5)}, ${capturedLng!.toStringAsFixed(5)}',
                                              style: const TextStyle(
                                                color: Colors.green,
                                                fontSize: 12,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(height: 16),
                                    const Text(
                                      'Exact Location Description',
                                      style: TextStyle(
                                        color: Colors.white70,
                                        fontSize: 13,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    TextField(
                                      controller: locationDescController,
                                      maxLines: 2,
                                      style: const TextStyle(
                                        color: Colors.white,
                                      ),
                                      decoration: InputDecoration(
                                        hintText:
                                            'e.g., "Near the yellow street sign at the corner of..."',
                                        hintStyle: const TextStyle(
                                          color: Colors.white24,
                                        ),
                                        filled: true,
                                        fillColor: Colors.white.withOpacity(
                                          0.05,
                                        ),
                                        border: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(
                                            12,
                                          ),
                                          borderSide: BorderSide.none,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      '⚠️ Please describe exactly where in the photo the issue is located.',
                                      style: TextStyle(
                                        color: Colors.orange.shade300,
                                        fontSize: 11,
                                      ),
                                    ),
                                    const SizedBox(height: 16),
                                  ],
                                  const Text(
                                    'Description',
                                    style: TextStyle(
                                      color: Colors.white70,
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  TextField(
                                    controller: notesController,
                                    maxLines: 3,
                                    style: const TextStyle(color: Colors.white),
                                    decoration: InputDecoration(
                                      hintText: 'Describe the hazard...',
                                      hintStyle: const TextStyle(
                                        color: Colors.white24,
                                      ),
                                      filled: true,
                                      fillColor: Colors.white.withOpacity(0.05),
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(12),
                                        borderSide: BorderSide.none,
                                      ),
                                    ),
                                  ),
                                  const Spacer(),
                                  SizedBox(
                                    width: double.infinity,
                                    height: 55,
                                    child: ElevatedButton(
                                      onPressed: () async {
                                        Navigator.pop(context);

                                        // Append location description to the report
                                        String fullDescription =
                                            notesController.text;
                                        if (locationDescController
                                            .text
                                            .isNotEmpty) {
                                          fullDescription +=
                                              '\n\n📍 EXACT LOCATION: ${locationDescController.text}';
                                        }
                                        if (capturedLat != null &&
                                            capturedLng != null) {
                                          fullDescription +=
                                              '\n(GPS: ${capturedLat!.toStringAsFixed(5)}, ${capturedLng!.toStringAsFixed(5)})';
                                        }

                                        // Trigger submission via Provider
                                        final result = await provider
                                            .submitReport(
                                              category: selectedCategory,
                                              description: fullDescription,
                                              lat: capturedLat ?? 14.7566,
                                              lng: capturedLng ?? 121.0450,
                                              locationString: capturedAddress,
                                              image: imageFile,
                                            );

                                        if (mounted) {
                                          ScaffoldMessenger.of(
                                            context,
                                          ).showSnackBar(
                                            SnackBar(
                                              content: Text(
                                                result['message'] ??
                                                    (result['success']
                                                        ? 'Report submitted successfully!'
                                                        : 'Submission failed'),
                                              ),
                                              backgroundColor: result['success']
                                                  ? Colors.green
                                                  : Colors.redAccent,
                                              behavior:
                                                  SnackBarBehavior.floating,
                                            ),
                                          );
                                        }
                                      },
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: AppTheme.primaryOrange,
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(
                                            16,
                                          ),
                                        ),
                                      ),
                                      child: const Text(
                                        'Verify & Submit',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 16,
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      }
                    },
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.camera_alt_rounded,
                          color: Colors.white,
                          size: 22,
                        ),
                        SizedBox(width: 8),
                        Text(
                          'Post Report',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 15,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ).animate().slideY(
              begin: 1.5,
              curve: Curves.easeOutBack,
              duration: 800.ms,
            )
          : null,
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,

      // Bottom Nav
      bottomNavigationBar: ClipRRect(
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
          child: Container(
            color: Colors.white.withOpacity(0.02),
            child: BottomNavigationBar(
              currentIndex: _currentIndex,
              onTap: (index) => setState(() => _currentIndex = index),
              backgroundColor: Colors.transparent,
              elevation: 0,
              type: BottomNavigationBarType.fixed,
              selectedItemColor: AppTheme.primaryOrange,
              unselectedItemColor: Colors.white38,
              showSelectedLabels: true,
              showUnselectedLabels: true,
              selectedFontSize: 11,
              unselectedFontSize: 11,
              items: const [
                BottomNavigationBarItem(
                  icon: Padding(
                    padding: EdgeInsets.only(bottom: 4),
                    child: Icon(Icons.home_rounded),
                  ),
                  label: 'Home',
                ),
                BottomNavigationBarItem(
                  icon: Padding(
                    padding: EdgeInsets.only(bottom: 4),
                    child: Icon(Icons.map_rounded),
                  ),
                  label: 'Map',
                ),
                BottomNavigationBarItem(
                  icon: Padding(
                    padding: EdgeInsets.only(bottom: 4),
                    child: Icon(Icons.shield_rounded),
                  ),
                  label: 'OBO Services',
                ),
                BottomNavigationBarItem(
                  icon: Padding(
                    padding: EdgeInsets.only(bottom: 4),
                    child: Icon(Icons.person_rounded),
                  ),
                  label: 'Profile',
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ─── Home Feed (extracted so IndexedStack child is stateless) ─────────────────

class _HomeFeed extends StatelessWidget {
  final HomeProvider provider;
  final List<Map<String, dynamic>> quickLinks;

  const _HomeFeed({required this.provider, required this.quickLinks});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Background Blobs Top Right
        Positioned(
              top: -200,
              right: -150,
              child: Container(
                width: 500,
                height: 500,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      AppTheme.primaryOrange.withOpacity(0.15),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            )
            .animate()
            .fadeIn(duration: 2.seconds)
            .scale(begin: const Offset(0.8, 0.8)),

        // Background Blobs Bottom Left
        Positioned(
              bottom: -200,
              left: -150,
              child: Container(
                width: 450,
                height: 450,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      Colors.blueAccent.withOpacity(0.12),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            )
            .animate()
            .fadeIn(duration: 2.seconds, delay: 500.ms)
            .scale(begin: const Offset(0.8, 0.8)),

        SafeArea(
          bottom: false,
          child: RefreshIndicator(
            color: AppTheme.primaryOrange,
            backgroundColor: AppTheme.primaryDark,
            onRefresh: () => provider.refreshFeed(),
            child: CustomScrollView(
              physics: const ClampingScrollPhysics(),
              slivers: [
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
                    child: _ColorsHeader(),
                  ),
                ),

                // Quick Links Horizon
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(24, 32, 24, 16),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: quickLinks
                          .map((link) => _buildQuickLink(link))
                          .toList(),
                    ),
                  ),
                ),

                // My Reports
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(24, 24, 24, 16),
                    child: _buildSectionHeader(
                      'My Incident Reports',
                      Icons.history_rounded,
                      action: 'View All',
                    ),
                  ),
                ),
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) => Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 24,
                        vertical: 6,
                      ),
                      child: _ReportCard(report: provider.myReports[index]),
                    ),
                    childCount: provider.myReports.length,
                  ),
                ),

                // Official Board (Facebook-style Pinned Feed)
                SliverPersistentHeader(
                  pinned: true,
                  delegate: _StickyHeaderDelegate(
                    minHeight: 75.0,
                    maxHeight: 75.0,
                    child: ClipRRect(
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                        child: Container(
                          color: AppTheme.primaryDark.withOpacity(0.6),
                          padding: const EdgeInsets.fromLTRB(24, 28, 24, 16),
                          alignment: Alignment.bottomLeft,
                          child: _buildSectionHeader(
                            'Official Board',
                            Icons.public_rounded,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) => Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 24,
                        vertical: 8,
                      ),
                      child: _AdvisoryPost(
                        advisory: provider.advisories[index],
                      ),
                    ),
                    childCount: provider.advisories.length,
                  ),
                ),

                const SliverToBoxAdapter(child: SizedBox(height: 100)),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildQuickLink(Map<String, dynamic> link) {
    return Column(
      children: [
        Container(
          width: 60,
          height: 60,
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.05),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white.withOpacity(0.08)),
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(20),
              onTap: () {},
              child: Center(
                child: Icon(link['icon'], color: link['color'], size: 28),
              ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          link['title'],
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: Colors.white70,
            fontSize: 11,
            fontWeight: FontWeight.w600,
            height: 1.2,
          ),
        ),
      ],
    ).animate().fadeIn().slideY(begin: 0.2);
  }

  Widget _buildSectionHeader(String title, IconData icon, {String? action}) {
    return Row(
      children: [
        Icon(icon, color: Colors.white54, size: 18),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        const Spacer(),
        if (action != null)
          Text(
            action,
            style: const TextStyle(
              color: AppTheme.primaryOrange,
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),
      ],
    );
  }
}

// ─── Placeholder for unbuilt tabs ──────────────────────────────────────────────

class _PlaceholderPage extends StatelessWidget {
  final IconData icon;
  final String label;

  const _PlaceholderPage({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.primaryDark,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 64, color: Colors.white12),
            const SizedBox(height: 16),
            Text(
              label,
              style: const TextStyle(
                color: Colors.white38,
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Coming in next release',
              style: TextStyle(color: Colors.white24, fontSize: 13),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Shared Feed Widgets (unchanged from original) ────────────────────────────

class _ColorsHeader extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  ShaderMask(
                    shaderCallback: (bounds) => const LinearGradient(
                      colors: [
                        AppTheme.primaryOrange,
                        AppTheme.primaryOrangeLight,
                      ],
                    ).createShader(bounds),
                    child: Text(
                      'PULSO',
                      style: Theme.of(context).textTheme.displayLarge?.copyWith(
                        height: 1.0,
                        fontSize: 28,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.greenAccent.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(
                        color: Colors.greenAccent.withOpacity(0.3),
                      ),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.verified,
                          color: Colors.greenAccent,
                          size: 10,
                        ),
                        SizedBox(width: 4),
                        Text(
                          'VERIFIED ID',
                          style: TextStyle(
                            color: Colors.greenAccent,
                            fontSize: 8,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              const Text(
                'Welcome, Validated Resident',
                style: TextStyle(
                  color: Colors.white54,
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
        Stack(
          clipBehavior: Clip.none,
          children: [
            const CircleAvatar(
              radius: 20,
              backgroundColor: AppTheme.primaryOrange,
              child: Icon(Icons.person, color: Colors.white, size: 20),
            ),
            Positioned(
              top: -2,
              right: -2,
              child: Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: Colors.redAccent,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppTheme.primaryDark, width: 2),
                ),
              ),
            ),
          ],
        ),
      ],
    ).animate().fadeIn(duration: 600.ms).moveY(begin: -10);
  }
}

class _AdvisoryPost extends StatelessWidget {
  final Map<String, dynamic> advisory;
  const _AdvisoryPost({required this.advisory});

  @override
  Widget build(BuildContext context) {
    bool isAlert = advisory['type'] == 'alert';
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.02),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: isAlert
                    ? Colors.redAccent.withOpacity(0.2)
                    : Colors.blueAccent.withOpacity(0.2),
                child: Icon(
                  isAlert ? Icons.warning_rounded : Icons.info_rounded,
                  color: isAlert ? Colors.redAccent : Colors.blueAccent,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    advisory['dept'],
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                      color: Colors.white,
                    ),
                  ),
                  Text(
                    advisory['time'],
                    style: const TextStyle(color: Colors.white54, fontSize: 11),
                  ),
                ],
              ),
              const Spacer(),
              const Icon(Icons.more_horiz, color: Colors.white54),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            advisory['title'],
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 16,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            advisory['desc'],
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 14,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 16),
          const Divider(color: Colors.white10, height: 1),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _FeedActionButton(
                icon: Icons.thumb_up_alt_outlined,
                label: 'Like',
              ),
              _FeedActionButton(
                icon: Icons.chat_bubble_outline_rounded,
                label: 'Comment',
              ),
              _FeedActionButton(icon: Icons.share_rounded, label: 'Share'),
            ],
          ),
        ],
      ),
    );
  }
}

class _FeedActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  const _FeedActionButton({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return TextButton.icon(
      onPressed: () {},
      style: TextButton.styleFrom(
        foregroundColor: Colors.white54,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      ),
      icon: Icon(icon, size: 18),
      label: Text(label, style: const TextStyle(fontSize: 12)),
    );
  }
}

class _ReportCard extends StatelessWidget {
  final Map<String, dynamic> report;
  const _ReportCard({required this.report});

  @override
  Widget build(BuildContext context) {
    final isResolved = report['status'].toString().toLowerCase() == 'resolved';
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.04),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: (report['color'] as Color).withOpacity(0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(report['icon'], color: report['color'], size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  report['title'],
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  report['category'],
                  style: const TextStyle(color: Colors.white54, fontSize: 13),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(
                      Icons.access_time_rounded,
                      size: 12,
                      color: Colors.white38,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      report['date'],
                      style: const TextStyle(
                        color: Colors.white38,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: isResolved
                  ? Colors.greenAccent.withOpacity(0.15)
                  : AppTheme.primaryOrange.withOpacity(0.15),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: isResolved
                    ? Colors.greenAccent.withOpacity(0.3)
                    : AppTheme.primaryOrange.withOpacity(0.3),
              ),
            ),
            child: Text(
              report['status'],
              style: TextStyle(
                color: isResolved ? Colors.greenAccent : AppTheme.primaryOrange,
                fontSize: 10,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StickyHeaderDelegate extends SliverPersistentHeaderDelegate {
  final Widget child;
  final double minHeight;
  final double maxHeight;

  _StickyHeaderDelegate({
    required this.minHeight,
    required this.maxHeight,
    required this.child,
  });

  @override
  double get minExtent => minHeight;

  @override
  double get maxExtent => maxHeight;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return SizedBox.expand(child: child);
  }

  @override
  bool shouldRebuild(_StickyHeaderDelegate oldDelegate) {
    return maxHeight != oldDelegate.maxHeight ||
        minHeight != oldDelegate.minHeight ||
        child != oldDelegate.child;
  }
}
