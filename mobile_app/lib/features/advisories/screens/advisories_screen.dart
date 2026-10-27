import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:pulso_mobile/core/theme/app_theme.dart';
import 'package:pulso_mobile/features/advisories/advisories_provider.dart';

class AdvisoriesScreen extends StatefulWidget {
  const AdvisoriesScreen({super.key});

  @override
  State<AdvisoriesScreen> createState() => _AdvisoriesScreenState();
}

class _AdvisoriesScreenState extends State<AdvisoriesScreen> {
  String _selectedCategory = 'All';
  String _selectedArea = 'Barangay 171';
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  final List<Map<String, dynamic>> _categoryTabs = const [
    {'id': 'All', 'label': 'All', 'icon': null},
    {'id': 'Utilities', 'label': 'Utilities', 'icon': Icons.water_drop_outlined, 'color': Color(0xFF0D9488)},
    {'id': 'Roadworks', 'label': 'Roadworks', 'icon': Icons.construction_outlined, 'color': Color(0xFFD97706)},
    {'id': 'Advisories', 'label': 'Advisories', 'icon': Icons.campaign_outlined, 'color': Color(0xFFE11D48)},
  ];

  final List<String> _caloocanAreas = const [
    'Barangay 171',
    'Barangay 172',
    'Barangay 173',
    'Bagumbong',
    'Camarin',
    'Deparo',
    'Caloocan North',
    'All Caloocan',
  ];

  final List<Map<String, dynamic>> _sampleNotices = [
    {
      'id': 'ADV-2026-MAY-014',
      'type': 'service_interruption',
      'category': 'Utilities',
      'title': 'Water service interruption',
      'subtitle': 'Temporary water service interruption in selected areas due to transmission-line repair.',
      'status_label': 'Service interruption',
      'source': 'Maynilad Water Services',
      'schedule': 'Mar 26 · 1:00 PM – 10:00 PM',
      'zones': 'Zones 10 – 15',
      'published': 'Published Mar 26 · Sample',
      'reason': 'Transmission-line repair',
      'what_you_can_do': 'Store water before the interruption.\nCheck the publisher for restoration updates.',
      'note': 'Estimated restoration may change.',
      'primary_cta': 'Read full notice',
      'secondary_cta': 'Affected areas',
    },
    {
      'id': 'ADV-2026-ENG-089',
      'type': 'scheduled_works',
      'category': 'Roadworks',
      'title': 'Road maintenance & re-blocking',
      'subtitle': 'Phase 1 Main Avenue road repairs and drainage re-alignment.',
      'status_label': 'Scheduled works',
      'source': 'City Engineering Department',
      'schedule': 'Mar 27 · 8:00 PM – Mar 28, 4:00 AM',
      'zones': 'Phase 1 Main Avenue',
      'published': 'Published Mar 25 · Sample',
      'reason': 'Heavy asphalt pavement and culvert upgrade',
      'what_you_can_do': 'Take alternate barangay bypass roads. Expect one-lane passable traffic.',
      'note': 'Work suspended in case of heavy monsoon rains.',
      'primary_cta': 'Read full notice',
      'secondary_cta': 'View detour route',
    },
    {
      'id': 'ADV-2026-CDR-022',
      'type': 'advisory',
      'category': 'Advisories',
      'title': 'Monsoon rainfall advisory',
      'subtitle': 'Low-lying sectors in Caloocan North under active monitoring.',
      'status_label': 'Advisory',
      'source': 'CDRRMO Caloocan',
      'schedule': 'Mar 28 · 6:00 AM – 6:00 PM',
      'zones': 'Low-lying corridors in Brgy 171 & 172',
      'published': 'Published Mar 26 · Sample',
      'reason': 'Southwest monsoon enhancement',
      'what_you_can_do': 'Clear roadside grates fronting homes and keep emergency hotlines handy.',
      'note': 'Evacuation centers placed on standby alert.',
      'primary_cta': 'Read full notice',
      'secondary_cta': 'Affected areas',
    },
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AdvisoriesProvider>().fetchAdvisories();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> _getFilteredNotices(List<dynamic> apiAdvisories) {
    List<Map<String, dynamic>> list = List.from(_sampleNotices);

    if (apiAdvisories.isNotEmpty) {
      for (final a in apiAdvisories) {
        if (a is Map) {
          final title = a['title']?.toString() ?? 'Municipal Notice';
          final category = a['category']?.toString() ?? 'Advisories';
          final dept = a['dept']?.toString() ?? a['department']?.toString() ?? 'Caloocan City';
          final desc = a['description']?.toString() ?? '';

          list.add({
            'id': a['id']?.toString() ?? a['advisory_id']?.toString() ?? 'ADV-LIVE',
            'type': category.toLowerCase().contains('util')
                ? 'service_interruption'
                : (category.toLowerCase().contains('road') ? 'scheduled_works' : 'advisory'),
            'category': category.toLowerCase().contains('util')
                ? 'Utilities'
                : (category.toLowerCase().contains('road') ? 'Roadworks' : 'Advisories'),
            'title': title,
            'subtitle': desc.isNotEmpty ? desc : 'City advisory update.',
            'status_label': category,
            'source': dept,
            'schedule': 'Recent Notice',
            'zones': 'All Caloocan',
            'published': 'Published recently',
            'reason': 'Official public announcement',
            'what_you_can_do': 'Follow city government announcements and guidelines.',
            'note': 'Official release.',
            'primary_cta': 'Read full notice',
            'secondary_cta': 'Affected areas',
          });
        }
      }
    }

    if (_selectedCategory != 'All') {
      list = list.where((n) {
        final cat = n['category']?.toString() ?? '';
        return cat.toLowerCase() == _selectedCategory.toLowerCase();
      }).toList();
    }

    if (_searchQuery.trim().isNotEmpty) {
      final q = _searchQuery.toLowerCase().trim();
      list = list.where((n) {
        final title = (n['title'] ?? '').toString().toLowerCase();
        final sub = (n['subtitle'] ?? '').toString().toLowerCase();
        final src = (n['source'] ?? '').toString().toLowerCase();
        final zones = (n['zones'] ?? '').toString().toLowerCase();
        return title.contains(q) || sub.contains(q) || src.contains(q) || zones.contains(q);
      }).toList();
    }

    return list;
  }

  void _showAreaPicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.between,
                  children: [
                    const Text(
                      'Select Area / Barangay',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, size: 20),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Expanded(
                  child: ListView.separated(
                    itemCount: _caloocanAreas.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (_, index) {
                      final area = _caloocanAreas[index];
                      final isSelected = area == _selectedArea;
                      return ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: Icon(
                          Icons.location_on,
                          color: isSelected ? const Color(0xFFEA580C) : const Color(0xFF94A3B8),
                        ),
                        title: Text(
                          area,
                          style: TextStyle(
                            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                            color: isSelected ? const Color(0xFFEA580C) : const Color(0xFF1E293B),
                          ),
                        ),
                        trailing: isSelected
                            ? const Icon(Icons.check, color: Color(0xFFEA580C), size: 20)
                            : null,
                        onTap: () {
                          setState(() => _selectedArea = area);
                          Navigator.pop(ctx);
                        },
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showSampleNoticeInfo() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.info_outline, color: Color(0xFF0284C7)),
            SizedBox(width: 8),
            Text(
              'Sample Notices',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
            ),
          ],
        ),
        content: const Text(
          'These notices reflect realistic advisory formats from Maynilad Water Services, Manila Electric Company (Meralco), and the Caloocan City Engineering Department for field coordination and civic preparedness.',
          style: TextStyle(fontSize: 13, color: Color(0xFF475569), height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text(
              'Understood',
              style: TextStyle(color: Color(0xFFEA580C), fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  void _showNoticeDetails(Map<String, dynamic> notice) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.75,
          maxChildSize: 0.95,
          minChildSize: 0.5,
          builder: (_, scrollController) {
            return SingleChildScrollView(
              controller: scrollController,
              padding: const EdgeInsets.all(22),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: const Color(0xFFCBD5E1),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),
                  Text(
                    notice['title'] ?? '',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF0B1528),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    notice['subtitle'] ?? '',
                    style: const TextStyle(
                      fontSize: 14,
                      color: Color(0xFF475569),
                      height: 1.4,
                    ),
                  ),
                  const Divider(height: 28),
                  if (notice['zones'] != null) ...[
                    _buildModalRow(
                      Icons.location_on_outlined,
                      'Affected Areas',
                      notice['zones'],
                    ),
                    const SizedBox(height: 10),
                  ],
                  if (notice['schedule'] != null) ...[
                    _buildModalRow(
                      Icons.calendar_today_outlined,
                      'Schedule',
                      notice['schedule'],
                    ),
                    const SizedBox(height: 10),
                  ],
                  if (notice['reason'] != null) ...[
                    _buildModalRow(
                      Icons.build_outlined,
                      'Reason',
                      notice['reason'],
                    ),
                    const SizedBox(height: 10),
                  ],
                  if (notice['what_you_can_do'] != null) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF7ED),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFFFFEDD5)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.lightbulb, color: Color(0xFFEA580C), size: 18),
                              SizedBox(width: 6),
                              Text(
                                'Recommended Actions',
                                style: TextStyle(
                                  fontWeight: FontWeight.w800,
                                  color: Color(0xFFC2410C),
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            notice['what_you_can_do'],
                            style: const TextStyle(
                              color: Color(0xFF334155),
                              fontSize: 13,
                              height: 1.4,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(ctx),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFEA580C),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      child: const Text(
                        'Close Notice',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildModalRow(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: const Color(0xFF64748B)),
        const SizedBox(width: 10),
        SizedBox(
          width: 130,
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              color: Color(0xFF64748B),
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
              fontSize: 13,
              color: Color(0xFF0F172A),
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<AdvisoriesProvider>();
    final notices = _getFilteredNotices(provider.advisories);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: RefreshIndicator(
          color: const Color(0xFFEA580C),
          onRefresh: () => provider.fetchAdvisories(),
          child: Align(
            alignment: Alignment.topCenter,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 640),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                // ── Top Title Block ──
                const Text(
                  'City Updates & Advisories',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0B1528),
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Plan ahead with notices that matter to your area.',
                  style: TextStyle(
                    fontSize: 13,
                    color: Color(0xFF64748B),
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 10),

                // ── Sample notices button pill ──
                InkWell(
                  onTap: _showSampleNoticeInfo,
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0F9FF),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFFBAE6FD)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.info_outline,
                          color: Color(0xFF0284C7),
                          size: 14,
                        ),
                        SizedBox(width: 6),
                        Text(
                          'Sample notices',
                          style: TextStyle(
                            color: Color(0xFF0369A1),
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 14),

                // ── Search Input Field (Full Width) ──
                Container(
                  height: 46,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.02),
                        blurRadius: 4,
                        offset: const Offset(0, 1),
                      ),
                    ],
                  ),
                  child: TextField(
                    controller: _searchController,
                    onChanged: (val) => setState(() => _searchQuery = val),
                    style: const TextStyle(
                      fontSize: 13.5,
                      color: Color(0xFF0F172A),
                      fontWeight: FontWeight.w500,
                    ),
                    decoration: InputDecoration(
                      border: InputBorder.none,
                      prefixIcon: const Icon(
                        Icons.search,
                        color: Color(0xFF94A3B8),
                        size: 20,
                      ),
                      suffixIcon: _searchQuery.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, size: 16, color: Color(0xFF94A3B8)),
                              onPressed: () {
                                _searchController.clear();
                                setState(() => _searchQuery = '');
                              },
                            )
                          : null,
                      hintText: 'Search notices, locations or keywords..',
                      hintStyle: const TextStyle(
                        color: Color(0xFF94A3B8),
                        fontSize: 13.5,
                        fontWeight: FontWeight.w400,
                      ),
                      contentPadding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(height: 10),

                // ── Area Selector (Full Width Dropdown) ──
                InkWell(
                  onTap: _showAreaPicker,
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    height: 46,
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.02),
                          blurRadius: 4,
                          offset: const Offset(0, 1),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.location_on_outlined,
                          color: Color(0xFF0F172A),
                          size: 18,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _selectedArea,
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 13.5,
                              color: Color(0xFF0F172A),
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const Icon(
                          Icons.keyboard_arrow_down_rounded,
                          color: Color(0xFF64748B),
                          size: 20,
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // ── Category Horizontal Pills Row ──
                SizedBox(
                  height: 38,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: _categoryTabs.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (_, index) {
                      final tab = _categoryTabs[index];
                      final isSelected = _selectedCategory == tab['id'];
                      final IconData? icon = tab['icon'];
                      final Color? iconColor = tab['color'];

                      return GestureDetector(
                        onTap: () => setState(() => _selectedCategory = tab['id'] as String),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 180),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            color: isSelected ? const Color(0xFFEA580C) : Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isSelected ? const Color(0xFFEA580C) : const Color(0xFFE2E8F0),
                            ),
                            boxShadow: isSelected
                                ? [
                                    BoxShadow(
                                      color: const Color(0xFFEA580C).withOpacity(0.25),
                                      blurRadius: 4,
                                      offset: const Offset(0, 2),
                                    ),
                                  ]
                                : null,
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (icon != null) ...[
                                Icon(
                                  icon,
                                  size: 15,
                                  color: isSelected ? Colors.white : (iconColor ?? const Color(0xFF64748B)),
                                ),
                                const SizedBox(width: 6),
                              ],
                              Text(
                                tab['label'] as String,
                                style: TextStyle(
                                  color: isSelected ? Colors.white : const Color(0xFF334155),
                                  fontWeight: FontWeight.w700,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 14),

                // ── Area Summary Card Banner (Barangay 171 / 6 sample notices / Change area) ──
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.02),
                        blurRadius: 4,
                        offset: const Offset(0, 1),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(
                          Icons.location_on_outlined,
                          color: Color(0xFF0F172A),
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _selectedArea,
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 14.5,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${notices.length} sample notices in your area',
                              style: const TextStyle(
                                fontSize: 11.5,
                                color: Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                      ),
                      InkWell(
                        onTap: _showAreaPicker,
                        borderRadius: BorderRadius.circular(10),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF0F9FF),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.swap_horiz_rounded,
                                color: Color(0xFF0284C7),
                                size: 16,
                              ),
                              SizedBox(width: 4),
                              Text(
                                'Change area',
                                style: TextStyle(
                                  color: Color(0xFF0369A1),
                                  fontWeight: FontWeight.w700,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // ── Notices Cards ──
                for (final notice in notices) ...[
                  _buildNoticeCard(notice),
                  const SizedBox(height: 14),
                ],
              ],
            ),
          ),
        ),
      ),
    ),
  );
}

  Widget _buildNoticeCard(Map<String, dynamic> notice) {
    final isServiceInterruption = notice['type'] == 'service_interruption';

    if (isServiceInterruption) {
      return _buildMayniladCard(notice);
    } else {
      return _buildGeneralCard(notice);
    }
  }

  Widget _buildMayniladCard(Map<String, dynamic> notice) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFFED7AA)), // Warm light amber border
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top Row: Circular Icon + Pill Badge + Source
          Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: const BoxDecoration(
                  color: Color(0xFFFFEDD5),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.water_drop_outlined,
                  color: Color(0xFFEA580C),
                  size: 18,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFEDD5),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(
                  notice['status_label'] ?? 'Service interruption',
                  style: const TextStyle(
                    color: Color(0xFFC2410C),
                    fontWeight: FontWeight.w800,
                    fontSize: 11,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Source: ${notice['source'] ?? 'Maynilad Water Services'}',
                  textAlign: TextAlign.right,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xFF475569),
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Title
          Text(
            notice['title'] ?? 'Water service interruption',
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w900,
              color: Color(0xFF0B1528),
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 4),
          // Subtitle
          Text(
            notice['subtitle'] ?? '',
            style: const TextStyle(
              fontSize: 12.5,
              color: Color(0xFF475569),
              height: 1.35,
            ),
          ),
          const SizedBox(height: 12),

          // Key Metadata List
          Row(
            children: [
              const Icon(Icons.calendar_today_outlined, size: 14, color: Color(0xFF64748B)),
              const SizedBox(width: 6),
              Text(
                notice['schedule'] ?? 'Mar 26 · 1:00 PM – 10:00 PM',
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF334155),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              const Icon(Icons.location_on_outlined, size: 14, color: Color(0xFF64748B)),
              const SizedBox(width: 6),
              Text(
                notice['zones'] ?? 'Zones 10 – 15',
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF334155),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              const Icon(Icons.description_outlined, size: 14, color: Color(0xFF64748B)),
              const SizedBox(width: 6),
              Text(
                notice['published'] ?? 'Published Mar 26 · Sample',
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF64748B),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Additional Detail Rows: Reason, What you can do, Note
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.build_outlined, size: 14, color: Color(0xFF0B1528)),
              const SizedBox(width: 6),
              Expanded(
                child: RichText(
                  text: TextSpan(
                    style: const TextStyle(fontSize: 12, color: Color(0xFF334155), height: 1.35),
                    children: [
                      const TextSpan(text: 'Reason\n', style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                      TextSpan(text: notice['reason'] ?? 'Transmission-line repair'),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.lightbulb_outline, size: 15, color: Color(0xFFEA580C)),
              const SizedBox(width: 6),
              Expanded(
                child: RichText(
                  text: TextSpan(
                    style: const TextStyle(fontSize: 12, color: Color(0xFF334155), height: 1.35),
                    children: [
                      const TextSpan(text: 'What you can do\n', style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                      TextSpan(text: notice['what_you_can_do'] ?? 'Store water before the interruption.\nCheck the publisher for restoration updates.'),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.info_outline, size: 14, color: Color(0xFF64748B)),
              const SizedBox(width: 6),
              Expanded(
                child: RichText(
                  text: TextSpan(
                    style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.35),
                    children: [
                      const TextSpan(text: 'Note\n', style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                      TextSpan(text: notice['note'] ?? 'Estimated restoration may change.'),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Action Buttons: Read full notice -> and Affected areas
          Row(
            children: [
              Expanded(
                child: SizedBox(
                  height: 42,
                  child: ElevatedButton(
                    onPressed: () => _showNoticeDetails(notice),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFEA580C),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'Read full notice',
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 13,
                          ),
                        ),
                        SizedBox(width: 4),
                        Icon(Icons.arrow_forward_rounded, size: 15),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: SizedBox(
                  height: 42,
                  child: OutlinedButton(
                    onPressed: () => _showNoticeDetails(notice),
                    style: OutlinedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: const Color(0xFF0F172A),
                      side: const BorderSide(color: Color(0xFFE2E8F0)),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.location_on_outlined, size: 15, color: Color(0xFF0F172A)),
                        SizedBox(width: 4),
                        Text(
                          'Affected areas',
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildGeneralCard(Map<String, dynamic> notice) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top Row: Circular Icon + Pill Badge + Source
          Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: const BoxDecoration(
                  color: Color(0xFFE0F2FE),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.construction_outlined,
                  color: Color(0xFF0284C7),
                  size: 18,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFE0F2FE),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(
                  notice['status_label'] ?? 'Scheduled works',
                  style: const TextStyle(
                    color: Color(0xFF0369A1),
                    fontWeight: FontWeight.w800,
                    fontSize: 11,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Source: ${notice['source'] ?? 'City Engineering Department'}',
                  textAlign: TextAlign.right,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xFF475569),
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Title
          Text(
            notice['title'] ?? '',
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w900,
              color: Color(0xFF0B1528),
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 4),
          // Subtitle
          Text(
            notice['subtitle'] ?? '',
            style: const TextStyle(
              fontSize: 12.5,
              color: Color(0xFF475569),
              height: 1.35,
            ),
          ),
          const SizedBox(height: 12),

          // Metadata List
          Row(
            children: [
              const Icon(Icons.calendar_today_outlined, size: 14, color: Color(0xFF64748B)),
              const SizedBox(width: 6),
              Text(
                notice['schedule'] ?? '',
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF334155),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              const Icon(Icons.location_on_outlined, size: 14, color: Color(0xFF64748B)),
              const SizedBox(width: 6),
              Text(
                notice['zones'] ?? '',
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF334155),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Action Buttons
          Row(
            children: [
              Expanded(
                child: SizedBox(
                  height: 42,
                  child: ElevatedButton(
                    onPressed: () => _showNoticeDetails(notice),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFEA580C),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'Read full notice',
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 13,
                          ),
                        ),
                        SizedBox(width: 4),
                        Icon(Icons.arrow_forward_rounded, size: 15),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: SizedBox(
                  height: 42,
                  child: OutlinedButton(
                    onPressed: () => _showNoticeDetails(notice),
                    style: OutlinedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: const Color(0xFF0F172A),
                      side: const BorderSide(color: Color(0xFFE2E8F0)),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.location_on_outlined, size: 15, color: Color(0xFF0F172A)),
                        SizedBox(width: 4),
                        Text(
                          'Affected areas',
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
