import 'package:pulso_mobile/widgets/pulso_icon.dart';
import 'dart:io';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:pulso_mobile/features/agent/agent_provider.dart';
import 'package:pulso_mobile/features/registration/screens/camera_screen.dart';
import 'package:pulso_mobile/core/api/api_client.dart';
import 'package:pulso_mobile/core/theme/app_theme.dart';
import 'package:shared_preferences/shared_preferences.dart';

// ═══════════════════════════════════════════════════════════════
//  AGENT COMMAND CENTER  —  Fully Functional
// ═══════════════════════════════════════════════════════════════
class AgentScreen extends StatefulWidget {
  const AgentScreen({super.key});
  @override
  State<AgentScreen> createState() => _AgentScreenState();
}

class _AgentScreenState extends State<AgentScreen> {
  int _currentTab = 0;

  @override
  void initState() {
    super.initState();
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
      ),
    );
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final p = context.read<AgentProvider>();
      p.loadMyWorkOrders();
      p.loadProfile();
    });
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      const _HomeTab(),
      const _MapTab(),
      const _ReportsTab(),
      const _ProfileTab(),
    ];

    return Scaffold(
      backgroundColor: const Color(0xFF020617), // Deeper Dark
      body: IndexedStack(index: _currentTab, children: pages),
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  Widget _buildBottomNav() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A).withOpacity(0.8),
        border: Border(top: BorderSide(color: Colors.white.withOpacity(0.05), width: 0.5)),
      ),
      child: ClipRRect(
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
          child: BottomNavigationBar(
            currentIndex: _currentTab,
            onTap: (i) => setState(() => _currentTab = i),
            backgroundColor: Colors.transparent,
            elevation: 0,
            type: BottomNavigationBarType.fixed,
            selectedItemColor: AppTheme.primaryOrange,
            unselectedItemColor: Colors.white24,
            showSelectedLabels: true,
            selectedFontSize: 10,
            unselectedFontSize: 10,
            items: [
              _navItem(Icons.dashboard_rounded, 'Home', 0),
              _navItem(Icons.map_rounded, 'Map', 1),
              _navItem(Icons.assignment_rounded, 'Report', 2),
              _navItem(Icons.person_rounded, 'Account', 3),
            ],
          ),
        ),
      ),
    );
  }

  BottomNavigationBarItem _navItem(IconData icon, String label, int index) {
    bool isSelected = _currentTab == index;
    return BottomNavigationBarItem(
      icon: Container(
        padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 16),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primaryOrange.withOpacity(0.08) : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
        ),
        child: PulsoIcon(icon, size: 22),
      ),
      label: label,
    );
  }
}

// ═══════════════════════════════════════════════════════════════
//  TAB 1 — DASHBOARD (PREMIUM OVERHAUL)
// ═══════════════════════════════════════════════════════════════
class _HomeTab extends StatelessWidget {
  const _HomeTab();

  @override
  Widget build(BuildContext context) {
    return Consumer<AgentProvider>(
      builder: (context, provider, _) {
        return Stack(
          children: [
            // Ambient Aesthetic Blobs
            _buildAmbientBlobs(),

            SafeArea(
              bottom: false,
              child: RefreshIndicator(
                color: AppTheme.primaryOrange,
                backgroundColor: AppTheme.darkSlate,
                onRefresh: () async {
                  await provider.loadMyWorkOrders();
                  await provider.loadProfile();
                },
                child: CustomScrollView(
                  physics: const BouncingScrollPhysics(),
                  slivers: [
                    SliverToBoxAdapter(child: _buildAgentHeroHeader(provider)),
                    SliverToBoxAdapter(child: _buildTrackingCard(provider)),
                    SliverToBoxAdapter(child: _buildQuickActionGrid(context, provider)),
                    SliverPersistentHeader(
                      pinned: true,
                      delegate: _SectionHeaderDelegate(
                        title: 'Work Assignments',
                        count: provider.myWorkOrders.length,
                        isLoading: provider.isLoadingOrders,
                      ),
                    ),
                    _buildAssignmentsList(context, provider),
                    const SliverToBoxAdapter(child: SizedBox(height: 120)),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildAmbientBlobs() {
    return Stack(
      children: [
        Positioned(
          top: -150, left: -100,
          child: Container(
            width: 400, height: 400,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(colors: [AppTheme.primaryOrange.withOpacity(0.12), Colors.transparent]),
            ),
          ),
        ).animate().fadeIn(duration: 3.seconds),
        Positioned(
          top: 200, right: -150,
          child: Container(
            width: 350, height: 350,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(colors: [AppTheme.infoBlue.withOpacity(0.08), Colors.transparent]),
            ),
          ),
        ).animate().fadeIn(duration: 4.seconds),
      ],
    );
  }

  Widget _buildAgentHeroHeader(AgentProvider provider) {
    final name = provider.userProfile?['full_name'] ?? 'Field Agent';
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 20),
      child: Row(
        children: [
          Container(
            width: 50, height: 50,
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [AppTheme.primaryOrange, AppTheme.primaryDark], begin: Alignment.topLeft, end: Alignment.bottomRight),
              borderRadius: BorderRadius.circular(16),
              boxShadow: [BoxShadow(color: AppTheme.primaryOrange.withOpacity(0.3), blurRadius: 10, offset: const Offset(0, 4))],
            ),
            child: const PulsoIcon(Icons.shield_rounded, color: Colors.white, size: 24),
          ).animate().scale(delay: 100.ms),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('PULSO COMMAND', style: TextStyle(color: Colors.white24, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1.5)),
                Text(name, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
              ],
            ),
          ),
          _buildTrackingPill(provider).animate().fadeIn(delay: 300.ms).slideX(begin: 0.1),
        ],
      ),
    );
  }

  Widget _buildTrackingPill(AgentProvider provider) {
    final isActive = provider.isTracking;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: isActive ? AppTheme.successGreen.withOpacity(0.1) : Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isActive ? AppTheme.successGreen.withOpacity(0.3) : Colors.white10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (isActive) 
            Container(
              width: 8, height: 8,
              margin: const EdgeInsets.only(right: 8),
              decoration: const BoxDecoration(color: AppTheme.successGreen, shape: BoxShape.circle),
            ).animate(onPlay: (c) => c.repeat()).scale(duration: 800.ms, end: const Offset(1.5, 1.5)).fadeOut(),
          Text(isActive ? 'ONLINE' : 'OFFLINE', style: TextStyle(color: isActive ? AppTheme.successGreen : Colors.white38, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 0.5)),
        ],
      ),
    );
  }

  Widget _buildTrackingCard(AgentProvider provider) {
    final loc = provider.currentLocation;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Container(
        height: 180,
        decoration: BoxDecoration(
          color: const Color(0xFF0F172A),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: Colors.white.withOpacity(0.08)),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 20, offset: const Offset(0, 10))],
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          children: [
            // Blurred Map Preview Background
            Opacity(
              opacity: 0.3,
              child: GoogleMap(
                initialCameraPosition: CameraPosition(target: LatLng(loc?['latitude'] ?? 14.6507, loc?['longitude'] ?? 120.9841), zoom: 15),
                liteModeEnabled: true, zoomControlsEnabled: false, myLocationEnabled: false, mapToolbarEnabled: false,
              ),
            ),
            Container(decoration: BoxDecoration(gradient: LinearGradient(colors: [const Color(0xFF0F172A), const Color(0xFF0F172A).withOpacity(0.2)], begin: Alignment.bottomCenter, end: Alignment.topCenter))),
            
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    const Text('Field Operations Stat', style: TextStyle(color: Colors.white54, fontSize: 12, fontWeight: FontWeight.w600)),
                    PulsoIcon(Icons.radar_rounded, color: provider.isTracking ? AppTheme.primaryOrange : Colors.white24, size: 20),
                  ]),
                  const Spacer(),
                  const Text('Current Location', style: TextStyle(color: Colors.white38, fontSize: 11)),
                  const SizedBox(height: 4),
                  Text(loc != null ? '${loc['latitude'].toStringAsFixed(6)}, ${loc['longitude'].toStringAsFixed(6)}' : 'Awaiting GPS Signal...',
                    style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
                  const SizedBox(height: 16),
                  Row(children: [
                    _statItem(Icons.battery_charging_full_rounded, '84%', 'Battery'),
                    _divider(),
                    _statItem(Icons.speed_rounded, '0 km/h', 'Speed'),
                    _divider(),
                    _statItem(Icons.timer_outlined, '02:45h', 'Shift'),
                  ]),
                ],
              ),
            ),
          ],
        ),
      ),
    ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.1);
  }

  Widget _statItem(IconData icon, String val, String label) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        PulsoIcon(icon, size: 12, color: AppTheme.primaryOrange),
        const SizedBox(width: 4),
        Text(val, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
      ]),
      Text(label, style: const TextStyle(color: Colors.white24, fontSize: 9)),
    ]);
  }

  Widget _divider() => Container(height: 20, width: 1, color: Colors.white10, margin: const EdgeInsets.symmetric(horizontal: 16));

  Widget _buildQuickActionGrid(BuildContext context, AgentProvider provider) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _actionTile(context, 'Report', Icons.edit_document, AppTheme.primaryOrange, () => _showFieldReportSheet(context, provider)),
              _actionTile(context, 'Photo', Icons.camera_enhance_rounded, Colors.indigoAccent, () => _handlePhotoAction(context, provider)),
              _actionTile(context, 'SOS', Icons.emergency_share_rounded, AppTheme.errorRed, () => _showSOSDialog(context, provider)),
              _actionTile(context, 'Status', Icons.radio_button_checked_rounded, AppTheme.successGreen, () => _showStatusPicker(context, provider)),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(delay: 600.ms);
  }

  Widget _actionTile(BuildContext context, String label, IconData icon, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            width: 68, height: 68,
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: color.withOpacity(0.25), width: 1.5),
            ),
            child: PulsoIcon(icon, color: color, size: 28),
          ),
          const SizedBox(height: 10),
          Text(label, style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }

  Widget _buildAssignmentsList(BuildContext context, AgentProvider provider) {
    if (provider.isLoadingOrders) {
      return const SliverToBoxAdapter(child: Padding(padding: EdgeInsets.symmetric(vertical: 40), child: Center(child: CircularProgressIndicator(color: AppTheme.primaryOrange))));
    }
    if (provider.myWorkOrders.isEmpty) {
      return SliverToBoxAdapter(child: _buildEmptyState());
    }

    return SliverList(
      delegate: SliverChildBuilderDelegate(
        (ctx, index) {
          final wo = provider.myWorkOrders[index];
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
            child: _AssignmentCardPremium(wo: wo, provider: provider).animate().fadeIn(delay: (200 + index * 50).ms).slideX(begin: 0.05),
          );
        },
        childCount: provider.myWorkOrders.length,
      ),
    );
  }

  Widget _buildEmptyState() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      padding: const EdgeInsets.symmetric(vertical: 40),
      decoration: BoxDecoration(color: Colors.white.withOpacity(0.02), borderRadius: BorderRadius.circular(24), border: Border.all(color: Colors.white.withOpacity(0.05))),
      child: Column(children: [
        PulsoIcon(Icons.task_alt_rounded, size: 48, color: AppTheme.successGreen.withOpacity(0.4)),
        const SizedBox(height: 16),
        const Text('Standby Mode', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
        const Text('Waiting for new assignments...', style: TextStyle(color: Colors.white38, fontSize: 13)),
      ]),
    );
  }

  static void _handlePhotoAction(BuildContext context, AgentProvider provider) async {
    final result = await Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => const CameraScreen(side: 'field_operation'),
    ));
    if (result != null && result is Map && result['path'] != null) {
      if (context.mounted) {
        _showFieldReportSheet(
          context, 
          provider, 
          category: 'Photo Evidence', 
          attachment: File(result['path']),
        );
      }
    }
  }

  static void _showStatusPicker(BuildContext context, AgentProvider provider) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(color: Color(0xFF020617), borderRadius: BorderRadius.vertical(top: Radius.circular(30))),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Duty Status', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 20),
            _statusPick(provider, 'available', 'Available', Icons.check_circle_rounded, AppTheme.successGreen),
            _statusPick(provider, 'en_route', 'En Route to Site', Icons.navigation_rounded, AppTheme.primaryOrange),
            _statusPick(provider, 'on_site', 'Working on Site', Icons.engineering_rounded, AppTheme.infoBlue),
            _statusPick(provider, 'returning', 'Returning to HQ', Icons.home_repair_service_rounded, Colors.purpleAccent),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  static Widget _statusPick(AgentProvider provider, String status, String label, IconData icon, Color color) {
    bool isSelected = provider.agentStatus == status;
    return InkWell(
      onTap: () async {
        await provider.setStatus(status);
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected ? color.withOpacity(0.15) : Colors.white.withOpacity(0.05),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isSelected ? color.withOpacity(0.5) : Colors.white10),
        ),
        child: Row(
          children: [
            PulsoIcon(icon, color: isSelected ? color : Colors.white54, size: 24),
            const SizedBox(width: 16),
            Expanded(
              child: Text(label, style: TextStyle(color: isSelected ? Colors.white : Colors.white70, fontSize: 15, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
            ),
            if (isSelected) PulsoIcon(Icons.check_circle, color: color, size: 20),
          ],
        ),
      ),
    );
  }

  static void _showFieldReportSheet(BuildContext context, AgentProvider provider, {String? category, File? attachment}) {
    String selectedCategory = category ?? 'Situation Report';
    final descController = TextEditingController();
    final categories = ['Situation Report', 'Photo Evidence', 'Infrastructure Status', 'Incident Report', 'Road Issue', 'Water / Drainage', 'Street Lighting', 'Public Safety'];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          height: MediaQuery.of(context).size.height * (attachment != null ? 0.85 : 0.7),
          decoration: const BoxDecoration(color: AppTheme.darkSlate, borderRadius: BorderRadius.vertical(top: Radius.circular(30))),
          padding: const EdgeInsets.all(24),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              ShaderMask(
                shaderCallback: (bounds) => const LinearGradient(colors: [AppTheme.primaryOrange, AppTheme.primaryOrangeLight]).createShader(bounds),
                child: const Text('New Field Report', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900)),
              ),
              IconButton(onPressed: () => Navigator.pop(context), icon: const PulsoIcon(Icons.close, color: Colors.white54)),
            ]),
            const SizedBox(height: 8),
            // GPS badge
            if (provider.currentLocation != null)
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: AppTheme.successGreen.withOpacity(0.1), borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.successGreen.withOpacity(0.2))),
                child: Row(children: [
                  const PulsoIcon(Icons.location_on, color: AppTheme.successGreen, size: 16),
                  const SizedBox(width: 8),
                  Text('GPS: ${provider.currentLocation!['latitude']?.toStringAsFixed(5)}, ${provider.currentLocation!['longitude']?.toStringAsFixed(5)}',
                    style: const TextStyle(color: AppTheme.successGreen, fontSize: 12)),
                ]),
              ),
            const SizedBox(height: 16),
            const Text('Category', style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white10)),
              child: DropdownButton<String>(
                value: selectedCategory,
                dropdownColor: AppTheme.darkSlate,
                isExpanded: true,
                underline: const SizedBox(),
                items: categories.map((c) => DropdownMenuItem(value: c, child: Text(c, style: const TextStyle(color: Colors.white)))).toList(),
                onChanged: (val) => setModalState(() => selectedCategory = val!),
              ),
            ),
            if (attachment != null) ...[
              const SizedBox(height: 16),
              const Text('Attachment', style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Stack(
                children: [
                  Container(
                    height: 120,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      image: DecorationImage(image: FileImage(attachment!), fit: BoxFit.cover),
                      border: Border.all(color: Colors.white10),
                    ),
                  ),
                  Positioned(
                    top: 8, right: 8,
                    child: GestureDetector(
                      onTap: () => setModalState(() => attachment = null),
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
                        child: const PulsoIcon(Icons.close, color: Colors.white, size: 16),
                      ),
                    ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 16),
            const Text('Description', style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            TextField(
              controller: descController,
              maxLines: 4,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Describe the situation, conditions, or hazard…',
                hintStyle: const TextStyle(color: Colors.white24),
                filled: true,
                fillColor: Colors.white.withOpacity(0.05),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
            const Spacer(),
            SizedBox(
              width: double.infinity, height: 55,
              child: Consumer<AgentProvider>(
                builder: (context, p, _) => ElevatedButton(
                  onPressed: p.isSubmittingReport ? null : () async {
                    if (descController.text.trim().isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please add a description'), backgroundColor: AppTheme.errorRed, behavior: SnackBarBehavior.floating));
                      return;
                    }
                    final result = await p.submitFieldReport(
                      category: selectedCategory, 
                      description: descController.text.trim(),
                      imageFile: attachment,
                    );
                    if (context.mounted) {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                        content: Text(result['message'] ?? 'Report submitted'),
                        backgroundColor: result['success'] == true ? AppTheme.successGreen : AppTheme.errorRed,
                        behavior: SnackBarBehavior.floating,
                      ));
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryOrange,
                    disabledBackgroundColor: AppTheme.primaryOrange.withOpacity(0.5),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: p.isSubmittingReport
                      ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('Submit Report', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                ),
              ),
            ),
          ]),
        ),
      ),
    );
  }

  static void _showSOSDialog(BuildContext context, AgentProvider provider) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.darkSlateLight,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: AppTheme.errorRed.withOpacity(0.15), borderRadius: BorderRadius.circular(12)),
            child: const PulsoIcon(Icons.sos_rounded, color: AppTheme.errorRed, size: 24),
          ),
          const SizedBox(width: 12),
          const Text('Send SOS Alert', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
        ]),
        content: const Text('This will immediately notify all dispatchers and government command center of your location and emergency.',
          style: TextStyle(color: Colors.white54, fontSize: 14)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel', style: TextStyle(color: Colors.white38))),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final result = await provider.submitFieldReport(
                category: 'SOS Emergency',
                description: 'EMERGENCY SOS: Agent requires immediate assistance at current location.',
              );
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                  content: Text(result['success'] == true ? '🆘 SOS Alert sent! Help is on the way.' : 'Failed to send SOS'),
                  backgroundColor: result['success'] == true ? AppTheme.errorRed : Colors.grey,
                  behavior: SnackBarBehavior.floating,
                ));
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.errorRed, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            child: const Text('SEND SOS', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
          ),
        ],
      ),
    );
  }
}

// ── CUSTOM HEADER DELEGATE ──────────────────────────────
class _SectionHeaderDelegate extends SliverPersistentHeaderDelegate {
  final String title;
  final int count;
  final bool isLoading;
  _SectionHeaderDelegate({required this.title, required this.count, required this.isLoading});

  @override
  double get minExtent => 60;
  @override
  double get maxExtent => 60;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: const Color(0xFF020617),
      padding: const EdgeInsets.symmetric(horizontal: 24),
      alignment: Alignment.centerLeft,
      child: Row(children: [
        Text(title, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
        const SizedBox(width: 10),
        if (!isLoading) Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(color: AppTheme.primaryOrange.withOpacity(0.15), borderRadius: BorderRadius.circular(20)),
          child: Text('$count', style: const TextStyle(color: AppTheme.primaryOrange, fontSize: 12, fontWeight: FontWeight.w900)),
        ),
      ]),
    );
  }

  @override
  bool shouldRebuild(covariant _SectionHeaderDelegate oldDelegate) => oldDelegate.count != count || oldDelegate.isLoading != isLoading;
}

// ── PREMIUM ASSIGNMENT CARD ──────────────────────────────
class _AssignmentCardPremium extends StatelessWidget {
  final Map<String, dynamic> wo;
  final AgentProvider provider;
  const _AssignmentCardPremium({required this.wo, required this.provider});

  @override
  Widget build(BuildContext context) {
    final status = wo['status'] ?? 'assigned';
    final prio = wo['priority']?.toString().toLowerCase() ?? 'normal';
    final isCritical = prio == 'critical';
    final nextStatus = status == 'assigned' ? 'in_progress' : status == 'in_progress' ? 'completed' : null;

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: isCritical ? AppTheme.errorRed.withOpacity(0.3) : Colors.white.withOpacity(0.08)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10)],
      ),
      child: Column(children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: (isCritical ? AppTheme.errorRed : AppTheme.primaryOrange).withOpacity(0.1), borderRadius: BorderRadius.circular(14)),
                child: PulsoIcon(isCritical ? Icons.priority_high_rounded : Icons.engineering_rounded, color: isCritical ? AppTheme.errorRed : AppTheme.primaryOrange, size: 22),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                      Text(wo['wo_number'] ?? 'WO-XXXX', style: const TextStyle(color: Colors.white24, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1)),
                      _prioBadge(prio),
                    ]),
                    const SizedBox(height: 4),
                    Text(wo['title'] ?? 'Title Unavailable', style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700), maxLines: 1, overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 8),
                    Row(children: [
                      const PulsoIcon(Icons.location_on_rounded, color: Colors.white24, size: 14),
                      const SizedBox(width: 6),
                      Expanded(child: Text(wo['location_string'] ?? 'No location details', style: const TextStyle(color: Colors.white38, fontSize: 12), maxLines: 1, overflow: TextOverflow.ellipsis)),
                    ]),
                  ],
                ),
              ),
            ],
          ),
        ),
        if (nextStatus != null)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.white.withOpacity(0.02), borderRadius: const BorderRadius.vertical(bottom: Radius.circular(22))),
            child: Row(children: [
              Expanded(
                child: _statusInfo(status),
              ),
              const SizedBox(width: 12),
              ElevatedButton(
                onPressed: () => provider.updateWorkOrderStatus(wo['wo_id'] ?? wo['id'], nextStatus),
                style: ElevatedButton.styleFrom(
                  backgroundColor: nextStatus == 'completed' ? AppTheme.successGreen : AppTheme.primaryOrange,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                ),
                child: Text(nextStatus == 'in_progress' ? 'Start Task' : 'Complete', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              ),
            ]),
          ),
      ]),
    );
  }

  Widget _prioBadge(String prio) {
    Color col = Colors.white24;
    if (prio == 'critical') col = AppTheme.errorRed;
    else if (prio == 'high') col = AppTheme.primaryOrange;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(color: col.withOpacity(0.1), borderRadius: BorderRadius.circular(4), border: Border.all(color: col.withOpacity(0.3))),
      child: Text(prio.toUpperCase(), style: TextStyle(color: col, fontSize: 9, fontWeight: FontWeight.w900)),
    );
  }

  Widget _statusInfo(String status) {
    Color col = AppTheme.primaryOrange;
    String txt = 'Assigned';
    if (status == 'in_progress') { col = AppTheme.infoBlue; txt = 'In Progress'; }
    return Row(children: [
      Container(width: 8, height: 8, decoration: BoxDecoration(color: col, shape: BoxShape.circle)),
      const SizedBox(width: 8),
      Text(txt, style: TextStyle(color: col, fontSize: 12, fontWeight: FontWeight.w600)),
    ]);
  }
}
// ═══════════════════════════════════════════════════════════════
//  TAB 2 — FULL-SCREEN MAP TRACKER
// ═══════════════════════════════════════════════════════════════
class _MapTab extends StatefulWidget {
  const _MapTab();
  @override
  State<_MapTab> createState() => _MapTabState();
}

class _MapTabState extends State<_MapTab> {
  GoogleMapController? _mapController;

  @override
  Widget build(BuildContext context) {
    return Consumer<AgentProvider>(
      builder: (context, provider, _) {
        final location = provider.currentLocation;
        final LatLng center = location != null ? LatLng(location['latitude'], location['longitude']) : const LatLng(14.6507, 120.9841);

        return Stack(children: [
          GoogleMap(
            initialCameraPosition: CameraPosition(target: center, zoom: 16),
            myLocationEnabled: true, myLocationButtonEnabled: false, zoomControlsEnabled: false, mapToolbarEnabled: false,
            onMapCreated: (c) => _mapController = c,
            markers: location != null ? {Marker(markerId: const MarkerId('me'), position: center, icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange), infoWindow: InfoWindow(title: 'You', snippet: provider.agentStatus))} : {},
          ),
          Positioned(
            top: MediaQuery.of(context).padding.top + 12, left: 16, right: 16,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(color: AppTheme.darkSlate.withOpacity(0.8), borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.white.withOpacity(0.1))),
                  child: Row(children: [
                    Container(
                      width: 10, height: 10,
                      decoration: BoxDecoration(
                        color: provider.isTracking ? AppTheme.successGreen : Colors.white24,
                        shape: BoxShape.circle,
                        boxShadow: provider.isTracking ? [BoxShadow(color: AppTheme.successGreen.withOpacity(0.5), blurRadius: 8)] : [],
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(child: Text(provider.isTracking ? 'GPS Active • Transmitting' : 'Location tracking is off', style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600))),
                    GestureDetector(
                      onTap: () => provider.isTracking ? provider.stopTracking() : provider.startTracking(),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(colors: provider.isTracking ? [AppTheme.errorRed, AppTheme.errorRed.withOpacity(0.8)] : [AppTheme.primaryOrange, AppTheme.primaryDark]),
                          borderRadius: BorderRadius.circular(10),
                          boxShadow: [BoxShadow(color: (provider.isTracking ? AppTheme.errorRed : AppTheme.primaryOrange).withOpacity(0.3), blurRadius: 10, offset: const Offset(0, 4))],
                        ),
                        child: Text(provider.isTracking ? 'STOP' : 'START', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w800, letterSpacing: 1)),
                      ),
                    ),
                  ]),
                ),
              ),
            ),
          ),
          Positioned(
            bottom: 16, left: 16, right: 16,
            child: Row(children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      decoration: BoxDecoration(color: AppTheme.darkSlate.withOpacity(0.8), borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.white.withOpacity(0.1))),
                      child: Row(children: [
                        const PulsoIcon(Icons.my_location_rounded, size: 16, color: AppTheme.primaryOrange),
                        const SizedBox(width: 10),
                        Text(location != null ? '${location['latitude']?.toStringAsFixed(5)}, ${location['longitude']?.toStringAsFixed(5)}' : 'Awaiting GPS signal…',
                          style: const TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w500)),
                      ]),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              GestureDetector(
                onTap: () { if (location != null) _mapController?.animateCamera(CameraUpdate.newLatLngZoom(center, 17)); },
                child: Container(
                  width: 50, height: 50,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [AppTheme.primaryOrange, AppTheme.primaryDark]),
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: [BoxShadow(color: AppTheme.primaryOrange.withOpacity(0.4), blurRadius: 12, offset: const Offset(0, 4))],
                  ),
                  child: const PulsoIcon(Icons.my_location, color: Colors.white, size: 22),
                ),
              ),
            ]),
          ),
        ]);
      },
    );
  }
}

// ═══════════════════════════════════════════════════════════════
//  TAB 3 — REPORTS (Connected to backend)
// ═══════════════════════════════════════════════════════════════
class _ReportsTab extends StatelessWidget {
  const _ReportsTab();

  @override
  Widget build(BuildContext context) {
    return Stack(children: [
      Positioned(
        top: -100, right: -100,
        child: Container(width: 350, height: 350, decoration: BoxDecoration(shape: BoxShape.circle, gradient: RadialGradient(colors: [AppTheme.primaryOrange.withOpacity(0.1), Colors.transparent]))),
      ),
      SafeArea(
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 8),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                ShaderMask(
                  shaderCallback: (bounds) => const LinearGradient(colors: [AppTheme.primaryOrange, AppTheme.primaryOrangeLight]).createShader(bounds),
                  child: const Text('Field Reports', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: Colors.white)),
                ),
                const SizedBox(height: 4),
                const Text('Submit updates to the Government Command Center', style: TextStyle(color: Colors.white54, fontSize: 13)),
              ]),
            )),
            ..._buildReportCards(context),
            const SliverToBoxAdapter(child: SizedBox(height: 100)),
          ],
        ),
      ),
    ]);
  }

  List<Widget> _buildReportCards(BuildContext context) {
    final reports = [
      {'icon': Icons.description_rounded, 'title': 'Situation Report', 'subtitle': 'Document conditions at deployment site', 'color': AppTheme.primaryOrange, 'category': 'Situation Report'},
      {'icon': Icons.camera_alt_rounded, 'title': 'Photo Evidence', 'subtitle': 'GPS-tagged photos for verification', 'color': Colors.tealAccent, 'category': 'Photo Evidence'},
      {'icon': Icons.build_rounded, 'title': 'Infrastructure Status', 'subtitle': 'Water, power, drainage conditions', 'color': AppTheme.infoBlue, 'category': 'Infrastructure Status'},
      {'icon': Icons.warning_amber_rounded, 'title': 'Incident Report', 'subtitle': 'Log emergencies or hazardous conditions', 'color': AppTheme.errorRed, 'category': 'Incident Report'},
    ];

    return reports.asMap().entries.map((entry) {
      final r = entry.value;
      return SliverToBoxAdapter(
        child: GestureDetector(
          onTap: () {
            final provider = context.read<AgentProvider>();
            _HomeTab._showFieldReportSheet(context, provider, category: r['category'] as String);
          },
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 6),
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(18), border: Border.all(color: Colors.white.withOpacity(0.08))),
            child: Row(children: [
              Container(
                width: 50, height: 50,
                decoration: BoxDecoration(color: (r['color'] as Color).withOpacity(0.12), borderRadius: BorderRadius.circular(16), border: Border.all(color: (r['color'] as Color).withOpacity(0.2))),
                child: PulsoIcon(r['icon'] as IconData, color: r['color'] as Color, size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(r['title'] as String, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.white)),
                const SizedBox(height: 2),
                Text(r['subtitle'] as String, style: const TextStyle(fontSize: 12, color: Colors.white38)),
              ])),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: (r['color'] as Color).withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
                child: PulsoIcon(Icons.arrow_forward_rounded, color: r['color'] as Color, size: 18),
              ),
            ]),
          ).animate().fadeIn(delay: (200 + entry.key * 100).ms).slideX(begin: 0.05),
        ),
      );
    }).toList();
  }
}

// ═══════════════════════════════════════════════════════════════
//  TAB 4 — PROFILE (Real user data)
// ═══════════════════════════════════════════════════════════════
class _ProfileTab extends StatelessWidget {
  const _ProfileTab();

  @override
  Widget build(BuildContext context) {
    return Consumer<AgentProvider>(
      builder: (context, provider, _) {
        final profile = provider.userProfile;
        final name = profile?['full_name'] ?? 'PULSO Agent';
        final role = (profile?['role'] ?? 'field_worker').toString().replaceAll('_', ' ');
        final email = profile?['email'] ?? '';

        return Stack(children: [
          Positioned(
            bottom: -150, left: -100,
            child: Container(width: 400, height: 400, decoration: BoxDecoration(shape: BoxShape.circle, gradient: RadialGradient(colors: [Colors.blueAccent.withOpacity(0.1), Colors.transparent]))),
          ),
          SafeArea(
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.all(24),
              child: Column(children: [
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(3),
                  decoration: BoxDecoration(gradient: const LinearGradient(colors: [AppTheme.primaryOrange, AppTheme.primaryOrangeLight]), borderRadius: BorderRadius.circular(26)),
                  child: Container(
                    width: 74, height: 74,
                    decoration: BoxDecoration(color: AppTheme.darkSlateLight, borderRadius: BorderRadius.circular(23)),
                    child: const PulsoIcon(Icons.shield_rounded, color: AppTheme.primaryOrange, size: 34),
                  ),
                ).animate().fadeIn().scale(begin: const Offset(0.8, 0.8)),
                const SizedBox(height: 16),
                ShaderMask(
                  shaderCallback: (bounds) => const LinearGradient(colors: [AppTheme.primaryOrange, AppTheme.primaryOrangeLight]).createShader(bounds),
                  child: Text(name, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Colors.white)),
                ),
                Text(role.split(' ').map((w) => w.isNotEmpty ? '${w[0].toUpperCase()}${w.substring(1)}' : w).join(' '),
                  style: const TextStyle(color: Colors.white38, fontSize: 13)),
                if (email.isNotEmpty) Text(email, style: const TextStyle(color: Colors.white24, fontSize: 12)),
                const SizedBox(height: 32),

                _profileRow(Icons.person_outline_rounded, 'My Account').animate().fadeIn(delay: 200.ms),
                _profileRow(Icons.history_rounded, 'Activity History').animate().fadeIn(delay: 300.ms),
                _profileRow(Icons.settings_outlined, 'Settings').animate().fadeIn(delay: 400.ms),
                _profileRow(Icons.help_outline_rounded, 'Help & Support').animate().fadeIn(delay: 500.ms),

                const SizedBox(height: 28),
                GestureDetector(
                  onTap: () async {
                    await ApiClient.clearTokens();
                    final prefs = await SharedPreferences.getInstance();
                    await prefs.setBool('remember_me', false);
                    if (context.mounted) Navigator.pushReplacementNamed(context, '/login');
                  },
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    decoration: BoxDecoration(color: AppTheme.errorRed.withOpacity(0.08), borderRadius: BorderRadius.circular(16), border: Border.all(color: AppTheme.errorRed.withOpacity(0.2))),
                    child: const Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                      PulsoIcon(Icons.logout_rounded, color: AppTheme.errorRed, size: 20),
                      SizedBox(width: 8),
                      Text('Log Out', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppTheme.errorRed)),
                    ]),
                  ),
                ).animate().fadeIn(delay: 600.ms),
                const SizedBox(height: 24),
                const Text('PULSO Agent v1.0.0', style: TextStyle(color: Colors.white24, fontSize: 12)),
              ]),
            ),
          ),
        ]);
      },
    );
  }

  Widget _profileRow(IconData icon, String title) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.white.withOpacity(0.06))),
      child: Row(children: [
        PulsoIcon(icon, color: Colors.white54, size: 22),
        const SizedBox(width: 14),
        Expanded(child: Text(title, style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w500))),
        const PulsoIcon(Icons.chevron_right_rounded, color: Colors.white24, size: 22),
      ]),
    );
  }
}
