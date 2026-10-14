import 'package:pulso_mobile/widgets/pulso_icon.dart';
/// map_screen.dart
/// PULSO Mobile — Live Incident Map
///
/// Features:
///  • Google Maps with a custom dark style matching PULSO's brand
///  • Live device location marker (blue dot) via geolocator
///  • All citizen reports as color-coded markers fetched from the backend
///  • InfoWindow popup on marker tap showing ticket ID, category & status
///  • Floating "My Location" FAB that pans to the user's position
///  • Filter chip row to toggle Pending / Dispatched / Resolved layers

import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:pulso_mobile/core/theme/app_theme.dart';
import 'package:pulso_mobile/core/services/location_service.dart';
import 'package:pulso_mobile/core/api/api_client.dart';
import 'package:provider/provider.dart';

class MapScreen extends StatefulWidget {
  final String? token;
  const MapScreen({super.key, this.token});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  GoogleMapController? _mapController;
  Position? _userPosition;

  /// Centre of North Caloocan (fallback when GPS unavailable)
  static const LatLng _caloocanCenter = LatLng(14.7566, 121.0450);

  List<Map<String, dynamic>> _reports = [];
  bool _loadingReports = true;
  String? _error;

  // Filter state
  final Set<String> _activeFilters = {'pending', 'dispatched', 'resolved'};

  // Selected marker info-window data
  Map<String, dynamic>? _selectedReport;

  late final LocationService _locationService;

  // Dark map style matching the dispatcher dashboard
  static const String _mapStyle = '''
  [
    {"elementType":"geometry","stylers":[{"color":"#0f1724"}]},
    {"elementType":"labels.text.fill","stylers":[{"color":"#4f6175"}]},
    {"elementType":"labels.text.stroke","stylers":[{"color":"#0f1724"}]},
    {"featureType":"administrative","elementType":"geometry.stroke","stylers":[{"color":"#1e2d40"}]},
    {"featureType":"road","elementType":"geometry","stylers":[{"color":"#1a2438"}]},
    {"featureType":"road","elementType":"geometry.stroke","stylers":[{"color":"#0f1724"}]},
    {"featureType":"road.highway","elementType":"geometry","stylers":[{"color":"#243150"}]},
    {"featureType":"water","elementType":"geometry","stylers":[{"color":"#060d18"}]},
    {"featureType":"poi","stylers":[{"visibility":"off"}]},
    {"featureType":"transit","stylers":[{"visibility":"off"}]}
  ]
  ''';

  @override
  void initState() {
    super.initState();
    final api = context.read<ApiClient>();
    _locationService = LocationService(api);
    _initLocation();
    _fetchReports();
  }

  Future<void> _initLocation() async {
    try {
      final pos = await _locationService.getCurrentPosition();
      if (mounted) {
        setState(() => _userPosition = pos);
        _mapController?.animateCamera(
          CameraUpdate.newLatLngZoom(LatLng(pos.latitude, pos.longitude), 15),
        );
      }
    } catch (e) {
      // No GPS — stay at Caloocan fallback center
      debugPrint('PULSO Maps: GPS error: $e');
    }
  }

  Future<void> _fetchReports() async {
    if (widget.token == null) {
      // For demonstration / until auth is integrated, load mock reports:
      await Future.delayed(const Duration(milliseconds: 800));
      setState(() {
        _reports = [
          {
            'id': 101,
            'ticket_id': 'RPT-1001',
            'category': 'Roads / Bridges',
            'ai_category': 'Infrastructure Issue',
            'status': 'dispatched',
            'location_lat': 14.7600,
            'location_lng': 121.0400,
            'location_string': 'Camarin Road, Caloocan North',
            'ai_summary': 'Deep pothole reported endangering motorists.',
            'ai_urgency': 'High',
          },
          {
            'id': 102,
            'ticket_id': 'RPT-1002',
            'category': 'Electrical / Power',
            'ai_category': 'Utility Hazard',
            'status': 'resolved',
            'location_lat': 14.7520,
            'location_lng': 121.0500,
            'location_string': 'Bagong Silang, Caloocan North',
            'ai_summary': 'Live wire on the ground resolved by crew.',
            'ai_urgency': 'Critical',
          },
          {
            'id': 103,
            'ticket_id': 'RPT-1003',
            'category': 'Garbage / Sanitation',
            'ai_category': 'Sanitation',
            'status': 'pending',
            'location_lat': 14.7570,
            'location_lng': 121.0450,
            'location_string': 'Deparo Road, Caloocan North',
            'ai_summary': 'Uncollected garbage blocking sidewalk.',
            'ai_urgency': 'Low',
          },
        ];
        _loadingReports = false;
      });
      return;
    }
    try {
      final response = await context.read<ApiClient>().get(
            '/api/reports',
            token: widget.token,
          );
      final data = (response.data as List).cast<Map<String, dynamic>>();
      setState(() {
        _reports = data;
        _loadingReports = false;
      });
    } catch (e) {
      setState(() {
        _loadingReports = false;
        _error = 'Could not load reports: $e';
      });
    }
  }

  // ─── Marker Helpers ───────────────────────────────────────────────────────

  Color _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'resolved':
        return const Color(0xFF22c55e); // green
      case 'dispatched':
        return const Color(0xFFf97316); // orange
      case 'pending_approval':
      case 'approved_internal':
        return const Color(0xFF3b82f6); // blue
      default:
        return const Color(0xFFef4444); // red
    }
  }

  BitmapDescriptor _markerIcon(String status) {
    final h = HSLColor.fromColor(_statusColor(status)).hue;
    return BitmapDescriptor.defaultMarkerWithHue(h);
  }

  Set<Marker> get _markers {
    final markers = <Marker>{};

    // Device location blue dot
    if (_userPosition != null) {
      markers.add(Marker(
        markerId: const MarkerId('_me'),
        position: LatLng(_userPosition!.latitude, _userPosition!.longitude),
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
        infoWindow: const InfoWindow(title: 'My Location'),
        zIndex: 99,
      ));
    }

    // Report markers
    for (final r in _reports) {
      final lat = r['location_lat'] as double?;
      final lng = r['location_lng'] as double?;
      if (lat == null || lng == null) continue;

      final status = (r['status'] as String? ?? 'pending').toLowerCase();
      if (!_activeFilters.contains(_normalizeStatus(status))) continue;

      markers.add(Marker(
        markerId: MarkerId('r_${r['id']}'),
        position: LatLng(lat, lng),
        icon: _markerIcon(status),
        onTap: () => setState(() => _selectedReport = r),
      ));
    }

    return markers;
  }

  String _normalizeStatus(String s) {
    if (s == 'resolved') return 'resolved';
    if (s == 'dispatched') return 'dispatched';
    return 'pending';
  }

  // ─── UI ───────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0f1724),
      body: Stack(
        children: [
          // ── Map ──────────────────────────────────────────────────────────
          GoogleMap(
            initialCameraPosition: CameraPosition(
              target: _userPosition != null
                  ? LatLng(_userPosition!.latitude, _userPosition!.longitude)
                  : _caloocanCenter,
              zoom: 14.5,
            ),
            onMapCreated: (ctrl) {
              _mapController = ctrl;
              ctrl.setMapStyle(_mapStyle);
            },
            markers: _markers,
            myLocationEnabled: true,
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
            mapToolbarEnabled: false,
            onTap: (_) => setState(() => _selectedReport = null),
          ),

          // ── Top header bar ───────────────────────────────────────────────
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              bottom: false,
              child: Column(
                children: [
                  // Title bar
                  Container(
                    margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0f1724).withOpacity(0.92),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white.withOpacity(0.08)),
                    ),
                    child: Row(
                      children: [
                        const PulsoIcon(Icons.map_rounded, color: AppTheme.primaryOrange, size: 22),
                        const SizedBox(width: 10),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Live Incident Map',
                              style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 15),
                            ),
                            Text(
                              '${_reports.length} reports in North Caloocan',
                              style: const TextStyle(color: Colors.white54, fontSize: 11),
                            ),
                          ],
                        ),
                        const Spacer(),
                        if (_loadingReports)
                          const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: AppTheme.primaryOrange,
                            ),
                          ),
                      ],
                    ),
                  ).animate().fadeIn().slideY(begin: -0.3),

                  // Filter chips
                  Container(
                    margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0f1724).withOpacity(0.88),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white.withOpacity(0.06)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        _FilterChip(
                          label: 'Pending',
                          color: const Color(0xFFef4444),
                          active: _activeFilters.contains('pending'),
                          onTap: () => _toggleFilter('pending'),
                        ),
                        const SizedBox(width: 8),
                        _FilterChip(
                          label: 'Dispatched',
                          color: const Color(0xFFf97316),
                          active: _activeFilters.contains('dispatched'),
                          onTap: () => _toggleFilter('dispatched'),
                        ),
                        const SizedBox(width: 8),
                        _FilterChip(
                          label: 'Resolved',
                          color: const Color(0xFF22c55e),
                          active: _activeFilters.contains('resolved'),
                          onTap: () => _toggleFilter('resolved'),
                        ),
                      ],
                    ),
                  ).animate().fadeIn(delay: 150.ms),
                ],
              ),
            ),
          ),

          // ── Error banner ──────────────────────────────────────────────────
          if (_error != null)
            Positioned(
              bottom: 120,
              left: 16,
              right: 16,
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.shade900,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  _error!,
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                  textAlign: TextAlign.center,
                ),
              ),
            ),

          // ── Selected report popup ─────────────────────────────────────────
          if (_selectedReport != null)
            Positioned(
              bottom: 120,
              left: 16,
              right: 16,
              child: _ReportPopup(
                report: _selectedReport!,
                onClose: () => setState(() => _selectedReport = null),
              ).animate().fadeIn().slideY(begin: 0.4),
            ),

          // ── My Location FAB ───────────────────────────────────────────────
          Positioned(
            bottom: 110,
            right: 16,
            child: _LocationFab(onTap: _goToMyLocation),
          ),
        ],
      ),
    );
  }

  void _toggleFilter(String f) {
    setState(() {
      if (_activeFilters.contains(f)) {
        _activeFilters.remove(f);
      } else {
        _activeFilters.add(f);
      }
    });
  }

  void _goToMyLocation() async {
    if (_userPosition != null) {
      _mapController?.animateCamera(
        CameraUpdate.newLatLngZoom(
          LatLng(_userPosition!.latitude, _userPosition!.longitude),
          16,
        ),
      );
    } else {
      await _initLocation();
    }
  }

  @override
  void dispose() {
    _mapController?.dispose();
    super.dispose();
  }
}

// ─── Small Widgets ─────────────────────────────────────────────────────────────

class _FilterChip extends StatelessWidget {
  final String label;
  final Color color;
  final bool active;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    required this.color,
    required this.active,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: active ? color.withOpacity(0.2) : Colors.white.withOpacity(0.05),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: active ? color.withOpacity(0.5) : Colors.white.withOpacity(0.1),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 7,
              height: 7,
              decoration: BoxDecoration(
                color: active ? color : Colors.white24,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 5),
            Text(
              label,
              style: TextStyle(
                color: active ? color : Colors.white38,
                fontSize: 11,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LocationFab extends StatelessWidget {
  final VoidCallback onTap;
  const _LocationFab({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          color: const Color(0xFF0f1724),
          shape: BoxShape.circle,
          border: Border.all(color: AppTheme.primaryOrange.withOpacity(0.6)),
          boxShadow: [
            BoxShadow(
              color: AppTheme.primaryOrange.withOpacity(0.3),
              blurRadius: 12,
            ),
          ],
        ),
        child: const PulsoIcon(Icons.my_location_rounded,
            color: AppTheme.primaryOrange, size: 22),
      ),
    );
  }
}

class _ReportPopup extends StatelessWidget {
  final Map<String, dynamic> report;
  final VoidCallback onClose;

  const _ReportPopup({required this.report, required this.onClose});

  Color _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'resolved':
        return const Color(0xFF22c55e);
      case 'dispatched':
        return const Color(0xFFf97316);
      default:
        return const Color(0xFFef4444);
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = report['status'] as String? ?? 'pending';
    final color = _statusColor(status);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF141e2e),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.3)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.4),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: color.withOpacity(0.4)),
                ),
                child: Text(
                  status.toUpperCase().replaceAll('_', ' '),
                  style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                report['ticket_id'] as String? ?? 'RPT-???',
                style: const TextStyle(
                    color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
              ),
              const Spacer(),
              GestureDetector(
                onTap: onClose,
                child: const PulsoIcon(Icons.close, color: Colors.white38, size: 18),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            report['ai_category'] as String? ??
                report['category'] as String? ??
                'Uncategorized',
            style: const TextStyle(
                color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
          ),
          if (report['ai_summary'] != null) ...[
            const SizedBox(height: 4),
            Text(
              '"${report['ai_summary']}"',
              style: const TextStyle(
                  color: Colors.white60, fontSize: 12, fontStyle: FontStyle.italic),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          const SizedBox(height: 8),
          Row(
            children: [
              const PulsoIcon(Icons.location_on_rounded, color: Colors.white38, size: 13),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  report['location_string'] as String? ?? 'No address',
                  style: const TextStyle(color: Colors.white54, fontSize: 11),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          if (report['ai_urgency'] != null) ...[
            const SizedBox(height: 6),
            Row(
              children: [
                const PulsoIcon(Icons.auto_awesome, color: Colors.indigoAccent, size: 12),
                const SizedBox(width: 4),
                Text(
                  'AI Urgency: ${report['ai_urgency']}',
                  style: const TextStyle(
                      color: Colors.indigoAccent,
                      fontSize: 11,
                      fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
