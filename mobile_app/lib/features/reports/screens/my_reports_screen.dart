import 'package:flutter/material.dart';
import 'package:pulso_mobile/core/theme/app_theme.dart';

class MyReportsScreen extends StatefulWidget {
  final VoidCallback? onNewReport;
  final VoidCallback? onOpenProfile;
  final Function(Map<String, dynamic>)? onOpenMap;
  final Function(Map<String, dynamic>)? onOpenDetails;

  const MyReportsScreen({
    super.key,
    this.onNewReport,
    this.onOpenProfile,
    this.onOpenMap,
    this.onOpenDetails,
  });

  @override
  State<MyReportsScreen> createState() => _MyReportsScreenState();
}

class _MyReportsScreenState extends State<MyReportsScreen> {
  String _activeFilter = 'all'; // 'all' | 'pending' | 'in_progress' | 'resolved' | 'rejected'
  String _searchQuery = '';
  String _selectedMonth = 'October 2026';
  bool _sortNewestFirst = true;

  final List<Map<String, dynamic>> _sampleReports = [
    {
      'id': 'PUL-2026-2635',
      'title': 'Reported public safety hazard',
      'category': 'Public Safety',
      'status': 'rejected',
      'location': 'Barangay 171, Caloocan',
      'attachments': 2,
      'notice': 'Not accepted after review. Open details to read the reason.',
      'imageUrl': 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=400&q=80',
    },
    {
      'id': 'PUL-2026-1697',
      'title': 'Streetlight not working',
      'category': 'Streetlights',
      'status': 'pending',
      'location': 'Barangay 171, Caloocan',
      'attachments': 1,
      'notice': 'Received by the department. No action needed while under review.',
      'imageUrl': 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=400&q=80',
    },
    {
      'id': 'PUL-2026-1681',
      'title': 'Damaged road surface',
      'category': 'Roads and Infrastructure',
      'status': 'in_progress',
      'stage': 'Stage 4 of 5',
      'location': 'Barangay 171, Caloocan',
      'attachments': 3,
      'notice': 'Department work is in progress.',
      'imageUrl': 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=400&q=80',
    },
    {
      'id': 'PUL-2026-4745',
      'title': 'Water leak on sidewalk',
      'category': 'Water and Drainage',
      'status': 'resolved',
      'location': 'Barangay 171, Caloocan',
      'attachments': 2,
      'notice': 'Marked resolved. Review the completion update.',
      'imageUrl': 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=400&q=80',
    },
    {
      'id': 'PUL-2026-4802',
      'title': 'Clogged roadside drain',
      'category': 'Drainage and Flood Control',
      'status': 'pending',
      'location': 'Barangay 171, Caloocan',
      'attachments': 1,
      'notice': 'Received. Waiting for department review.',
      'imageUrl': 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=400&q=80',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final filteredReports = _sampleReports.where((r) {
      if (_activeFilter != 'all' && r['status'] != _activeFilter) {
        return false;
      }
      if (_searchQuery.trim().isNotEmpty) {
        final q = _searchQuery.toLowerCase().trim();
        final matchId = (r['id'] as String).toLowerCase().contains(q);
        final matchTitle = (r['title'] as String).toLowerCase().contains(q);
        final matchLoc = (r['location'] as String).toLowerCase().contains(q);
        if (!matchId && !matchTitle && !matchLoc) return false;
      }
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: Column(
          children: [
            // Top App Bar: PULSO CALOOCAN Logo + City Engineering Dept | Bell + Avatar
            _buildTopBar(context),

            // Scrollable Content
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                children: [
                  // Title + "+ New report" Button
                  _buildHeaderRow(),
                  const SizedBox(height: 14),

                  // 5 Stat Metric Counters Row (5 Total | 2 Pending | 1 In progress | 1 Resolved | 1 Rejected)
                  _buildMetricsRow(),
                  const SizedBox(height: 14),

                  // Search Bar + Filter Icon Button
                  _buildSearchBar(),
                  const SizedBox(height: 12),

                  // Filter Pills Row (All 5 | Awaiting review 2 | In progress 1 | Resolved 1 | Rejected 1)
                  _buildFilterPills(),
                  const SizedBox(height: 14),

                  // Subheader Row: Sample report history badge + October 2026 ⌵ | Newest first ⇅
                  _buildSubheaderRow(),
                  const SizedBox(height: 12),

                  // List of Report Cards
                  ...filteredReports.map((report) => _buildReportCard(report)),

                  const SizedBox(height: 8),

                  // Footer info text
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Text(
                        'Showing ${filteredReports.length} sample reports.',
                        style: const TextStyle(
                          fontSize: 11,
                          color: Color(0xFF94A3B8),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTopBar(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
      color: Colors.white,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Logo & LGU subtitle
          Row(
            children: [
              // Logo PULSO
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Text(
                            'PULS',
                            style: TextStyle(
                              color: Color(0xFF0B1528),
                              fontWeight: FontWeight.w900,
                              fontSize: 20,
                              letterSpacing: -0.5,
                            ),
                          ),
                          Container(
                            margin: const EdgeInsets.only(left: 1),
                            width: 14,
                            height: 18,
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                const Icon(
                                  Icons.location_on,
                                  color: Color(0xFFEA580C),
                                  size: 18,
                                ),
                                Container(
                                  width: 5,
                                  height: 5,
                                  decoration: const BoxDecoration(
                                    color: Colors.white,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const Text(
                        'CALOOCAN',
                        style: TextStyle(
                          color: Color(0xFFEA580C),
                          fontWeight: FontWeight.w900,
                          fontSize: 10,
                          letterSpacing: 1.2,
                          height: 0.9,
                        ),
                      ),
                    ],
                  ),
                  Container(
                    margin: const EdgeInsets.symmetric(horizontal: 10),
                    height: 24,
                    width: 1,
                    color: const Color(0xFFCBD5E1),
                  ),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'City Engineering',
                        style: TextStyle(
                          color: Color(0xFF1E293B),
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          height: 1.1,
                        ),
                      ),
                      Text(
                        'Department',
                        style: TextStyle(
                          color: Color(0xFF64748B),
                          fontSize: 10,
                          fontWeight: FontWeight.w500,
                          height: 1.1,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),

          // Notification Bell + Avatar
          Row(
            children: [
              // Notification Bell with Badge
              Stack(
                children: [
                  IconButton(
                    onPressed: () {},
                    icon: const Icon(
                      Icons.notifications_none_rounded,
                      color: Color(0xFF0F172A),
                      size: 24,
                    ),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                  ),
                  Positioned(
                    top: 6,
                    right: 6,
                    child: Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: Color(0xFFEA580C),
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 8),

              // Avatar Circle
              GestureDetector(
                onTap: widget.onOpenProfile,
                child: Container(
                  width: 36,
                  height: 36,
                  decoration: const BoxDecoration(
                    color: Color(0xFFFFEDD5),
                    shape: BoxShape.circle,
                  ),
                  child: const Center(
                    child: Text(
                      'MA',
                      style: TextStyle(
                        color: Color(0xFF9A3412),
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
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

  Widget _buildHeaderRow() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Title & Subtitle
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Text(
                'My Reports',
                style: TextStyle(
                  fontSize: 25,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF0B1528),
                  letterSpacing: -0.5,
                ),
              ),
              SizedBox(height: 2),
              Text(
                'See what changed and what happens next.',
                style: TextStyle(
                  fontSize: 12.5,
                  color: Color(0xFF64748B),
                  fontWeight: FontWeight.normal,
                ),
              ),
            ],
          ),
        ),

        // "+ New report" button
        InkWell(
          onTap: widget.onNewReport,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8.5),
            decoration: BoxDecoration(
              color: const Color(0xFFEA580C),
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFFEA580C).withOpacity(0.28),
                  blurRadius: 8,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: const [
                Icon(Icons.add, color: Colors.white, size: 16),
                SizedBox(width: 4),
                Text(
                  'New report',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 12.5,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMetricsRow() {
    final totalCount = _sampleReports.length;
    final pendingCount = _sampleReports.where((r) => r['status'] == 'pending').length;
    final inProgressCount = _sampleReports.where((r) => r['status'] == 'in_progress').length;
    final resolvedCount = _sampleReports.where((r) => r['status'] == 'resolved').length;
    final rejectedCount = _sampleReports.where((r) => r['status'] == 'rejected').length;

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          _buildMetricColumn('5', 'Total', const Color(0xFF0F172A), () => setState(() => _activeFilter = 'all')),
          _buildDivider(),
          _buildMetricColumn('$pendingCount', 'Pending', const Color(0xFFEA580C), () => setState(() => _activeFilter = 'pending')),
          _buildDivider(),
          _buildMetricColumn('$inProgressCount', 'In progress', const Color(0xFF2563EB), () => setState(() => _activeFilter = 'in_progress')),
          _buildDivider(),
          _buildMetricColumn('$resolvedCount', 'Resolved', const Color(0xFF16A34A), () => setState(() => _activeFilter = 'resolved')),
          _buildDivider(),
          _buildMetricColumn('$rejectedCount', 'Rejected', const Color(0xFFDC2626), () => setState(() => _activeFilter = 'rejected')),
        ],
      ),
    );
  }

  Widget _buildMetricColumn(String count, String label, Color color, VoidCallback onTap) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              count,
              style: TextStyle(
                fontSize: 19,
                fontWeight: FontWeight.w900,
                color: color,
                height: 1.1,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                color: color == const Color(0xFF0F172A) ? const Color(0xFF64748B) : color,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDivider() {
    return Container(
      height: 26,
      width: 1,
      color: const Color(0xFFE2E8F0),
    );
  }

  Widget _buildSearchBar() {
    return Row(
      children: [
        // Text Input
        Expanded(
          child: Container(
            height: 42,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                const SizedBox(width: 12),
                const Icon(Icons.search, color: Color(0xFF94A3B8), size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    onChanged: (val) => setState(() => _searchQuery = val),
                    style: const TextStyle(fontSize: 13, color: Color(0xFF0F172A)),
                    decoration: const InputDecoration(
                      hintText: 'Search reports...',
                      hintStyle: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                      border: InputBorder.none,
                      isDense: true,
                      contentPadding: EdgeInsets.zero,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 8),

        // Filter Icon Button
        Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: const Center(
            child: Icon(Icons.tune_rounded, color: Color(0xFF334155), size: 20),
          ),
        ),
      ],
    );
  }

  Widget _buildFilterPills() {
    final pills = [
      {'id': 'all', 'label': 'All', 'count': 5},
      {'id': 'pending', 'label': 'Awaiting review', 'count': 2},
      {'id': 'in_progress', 'label': 'In progress', 'count': 1},
      {'id': 'resolved', 'label': 'Resolved', 'count': 1},
      {'id': 'rejected', 'label': 'Rejected', 'count': 1},
    ];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: pills.map((p) {
          final isSelected = _activeFilter == p['id'];
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: InkWell(
              onTap: () => setState(() => _activeFilter = p['id'] as String),
              borderRadius: BorderRadius.circular(20),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6.5),
                decoration: BoxDecoration(
                  color: isSelected ? const Color(0xFFEA580C) : Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isSelected ? const Color(0xFFEA580C) : const Color(0xFFE2E8F0),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      p['label'] as String,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: isSelected ? Colors.white : const Color(0xFF334155),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                      decoration: BoxDecoration(
                        color: isSelected ? Colors.white.withOpacity(0.25) : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${p['count']}',
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.bold,
                          color: isSelected ? Colors.white : const Color(0xFF64748B),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildSubheaderRow() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        // Badge: Sample report history
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4.5),
          decoration: BoxDecoration(
            color: const Color(0xFFFFECE5),
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Text(
            'Sample report history',
            style: TextStyle(
              color: Color(0xFFEA580C),
              fontSize: 11,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),

        // Right side: October 2026 ⌵ | Newest first ⇅
        Row(
          children: [
            Row(
              children: [
                Text(
                  _selectedMonth,
                  style: const TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF334155),
                  ),
                ),
                const SizedBox(width: 2),
                const Icon(Icons.keyboard_arrow_down, size: 16, color: Color(0xFF64748B)),
              ],
            ),
            Container(
              height: 12,
              width: 1,
              color: const Color(0xFFCBD5E1),
              margin: const EdgeInsets.symmetric(horizontal: 8),
            ),
            GestureDetector(
              onTap: () => setState(() => _sortNewestFirst = !_sortNewestFirst),
              child: Row(
                children: [
                  Text(
                    _sortNewestFirst ? 'Newest first' : 'Oldest first',
                    style: const TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF334155),
                    ),
                  ),
                  const SizedBox(width: 2),
                  const Icon(Icons.swap_vert_rounded, size: 16, color: Color(0xFF64748B)),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildReportCard(Map<String, dynamic> report) {
    final status = report['status'] as String;
    final isRejected = status == 'rejected';
    final isPending = status == 'pending';
    final isInProgress = status == 'in_progress';
    final isResolved = status == 'resolved';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.015),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top Row: Thumbnail + Titles + Status + Attachments
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Photo Thumbnail
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Image.network(
                  report['imageUrl'] as String,
                  width: 72,
                  height: 72,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) => Container(
                    width: 72,
                    height: 72,
                    color: const Color(0xFFF1F5F9),
                    child: const Icon(Icons.broken_image, color: Colors.grey),
                  ),
                ),
              ),
              const SizedBox(width: 12),

              // Title, ID, Status & Location
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      report['title'] as String,
                      style: const TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                        height: 1.2,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),

                    Text(
                      report['id'] as String,
                      style: const TextStyle(
                        fontSize: 11,
                        color: Color(0xFF64748B),
                        fontFamily: 'monospace',
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 4),

                    // Status Pill
                    _buildStatusPill(status),
                    const SizedBox(height: 4),

                    // Location
                    Row(
                      children: [
                        const Icon(Icons.location_on_outlined, size: 13, color: Color(0xFF94A3B8)),
                        const SizedBox(width: 3),
                        Expanded(
                          child: Text(
                            report['location'] as String,
                            style: const TextStyle(
                              fontSize: 11,
                              color: Color(0xFF64748B),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Attachments & Stage
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.attach_file, size: 13, color: Color(0xFF64748B)),
                      const SizedBox(width: 2),
                      Text(
                        '${report['attachments']} ${report['attachments'] == 1 ? 'attachment' : 'attachments'}',
                        style: const TextStyle(
                          fontSize: 10.5,
                          color: Color(0xFF64748B),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                  if (report['stage'] != null) ...[
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        report['stage'] as String,
                        style: const TextStyle(
                          fontSize: 10,
                          color: Color(0xFF2563EB),
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Department Status Notice Banner
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6.5),
            decoration: BoxDecoration(
              color: isRejected
                  ? const Color(0xFFFFF1F2)
                  : isPending
                      ? const Color(0xFFFFFBEB)
                      : isInProgress
                          ? const Color(0xFFEFF6FF)
                          : const Color(0xFFF0FDF4),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.info,
                  size: 13,
                  color: isRejected
                      ? const Color(0xFFDC2626)
                      : isPending
                          ? const Color(0xFFB45309)
                          : isInProgress
                              ? const Color(0xFF2563EB)
                              : const Color(0xFF16A34A),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    report['notice'] as String,
                    style: TextStyle(
                      fontSize: 11,
                      color: isRejected
                          ? const Color(0xFF991B1B)
                          : isPending
                              ? const Color(0xFF92400E)
                              : isInProgress
                                  ? const Color(0xFF1E40AF)
                                  : const Color(0xFF166534),
                      fontWeight: FontWeight.w500,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // Action Buttons: View Map & View Details
          Row(
            children: [
              // View Map (Outline)
              Expanded(
                child: OutlinedButton(
                  onPressed: () => widget.onOpenMap?.call(report),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFFEA580C),
                    side: const BorderSide(color: Color(0xFFEA580C), width: 1.2),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 9),
                    minimumSize: const Size(0, 36),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: const [
                      Icon(Icons.map_outlined, size: 15, color: Color(0xFFEA580C)),
                      SizedBox(width: 4),
                      Text(
                        'View map',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFFEA580C),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),

              // View Details (Solid Orange)
              Expanded(
                child: ElevatedButton(
                  onPressed: () => widget.onOpenDetails?.call(report),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFEA580C),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 9),
                    minimumSize: const Size(0, 36),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: const [
                      Icon(Icons.article_outlined, size: 15, color: Colors.white),
                      SizedBox(width: 4),
                      Text(
                        'View details',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusPill(String status) {
    if (status == 'rejected') {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
        decoration: BoxDecoration(
          color: const Color(0xFFFEF2F2),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFFEE2E2)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: const [
            Icon(Icons.cancel, size: 12, color: Color(0xFFDC2626)),
            SizedBox(width: 3),
            Text(
              'Rejected',
              style: TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.bold,
                color: Color(0xFFDC2626),
              ),
            ),
          ],
        ),
      );
    }

    if (status == 'pending') {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
        decoration: BoxDecoration(
          color: const Color(0xFFFEF3C7),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFFDE68A)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: const [
            Icon(Icons.access_time_rounded, size: 12, color: Color(0xFFB45309)),
            SizedBox(width: 3),
            Text(
              'Awaiting review',
              style: TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.bold,
                color: Color(0xFFB45309),
              ),
            ),
          ],
        ),
      );
    }

    if (status == 'in_progress') {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
        decoration: BoxDecoration(
          color: const Color(0xFFEFF6FF),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFDBEAFE)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: const [
            Icon(Icons.settings, size: 12, color: Color(0xFF2563EB)),
            SizedBox(width: 3),
            Text(
              'In progress',
              style: TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.bold,
                color: Color(0xFF2563EB),
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
      decoration: BoxDecoration(
        color: const Color(0xFFECFDF5),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFD1FAE5)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: const [
          Icon(Icons.check_circle, size: 12, color: Color(0xFF16A34A)),
          SizedBox(width: 3),
          Text(
            'Resolved',
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.bold,
              color: Color(0xFF16A34A),
            ),
          ),
        ],
      ),
    );
  }
}
