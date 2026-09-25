import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:pulso_mobile/core/theme/app_theme.dart';
import 'package:pulso_mobile/features/advisories/advisories_provider.dart';
import 'package:pulso_mobile/core/api/api_client.dart';
import 'package:animate_do/animate_do.dart';

class AdvisoriesScreen extends StatefulWidget {
  const AdvisoriesScreen({super.key});

  @override
  State<AdvisoriesScreen> createState() => _AdvisoriesScreenState();
}

class _AdvisoriesScreenState extends State<AdvisoriesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AdvisoriesProvider>().fetchAdvisories();
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final provider = context.watch<AdvisoriesProvider>();

    return Scaffold(
      backgroundColor: isDark ? AppTheme.darkSlate : AppTheme.lightGray,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'ADVISORIES',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w900,
            letterSpacing: 2,
          ),
        ),
        centerTitle: true,
      ),
      body: provider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : provider.advisories.isEmpty
          ? _buildEmptyState()
          : RefreshIndicator(
              onRefresh: () => provider.fetchAdvisories(),
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: provider.advisories.length,
                itemBuilder: (context, index) {
                  final advisory = provider.advisories[index];
                  return FadeInUp(
                    delay: Duration(milliseconds: index * 50),
                    child: _buildAdvisoryCard(advisory, isDark),
                  );
                },
              ),
            ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.campaign_outlined, size: 80, color: Colors.grey[400]),
          const SizedBox(height: 16),
          Text(
            'No advisories available',
            style: TextStyle(fontSize: 18, color: Colors.grey[600]),
          ),
          const SizedBox(height: 8),
          Text(
            'Check back later for updates from the LGU',
            style: TextStyle(color: Colors.grey[500]),
          ),
        ],
      ),
    );
  }

  Widget _buildAdvisoryCard(Map<String, dynamic> advisory, bool isDark) {
    final type = advisory['type'] ?? 'info';
    final priority = advisory['priority'] ?? 'normal';

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkSlateLight : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: priority == 'high'
            ? Border.all(color: Colors.red.withValues(alpha: 0.5), width: 2)
            : null,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: _getTypeColor(type).withValues(alpha: 0.1),
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(16),
              ),
            ),
            child: Row(
              children: [
                Icon(_getTypeIcon(type), color: _getTypeColor(type), size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    advisory['title'] ?? 'Advisory',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: _getTypeColor(type),
                    ),
                  ),
                ),
                if (priority == 'high')
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.red,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      'URGENT',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  advisory['description'] ?? '',
                  style: const TextStyle(fontSize: 14),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Icon(Icons.business, size: 16, color: Colors.grey[500]),
                    const SizedBox(width: 4),
                    Text(
                      advisory['dept'] ?? 'LGU',
                      style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                    ),
                    const Spacer(),
                    Icon(Icons.access_time, size: 16, color: Colors.grey[500]),
                    const SizedBox(width: 4),
                    Text(
                      _formatTime(advisory['created_at']),
                      style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Color _getTypeColor(String type) {
    switch (type) {
      case 'warning':
        return Colors.orange;
      case 'alert':
        return Colors.red;
      case 'infrastructure':
        return Colors.blue;
      case 'success':
        return Colors.green;
      default:
        return AppTheme.primaryOrange;
    }
  }

  IconData _getTypeIcon(String type) {
    switch (type) {
      case 'warning':
        return Icons.warning_amber;
      case 'alert':
        return Icons.error_outline;
      case 'infrastructure':
        return Icons.construction;
      case 'success':
        return Icons.check_circle_outline;
      default:
        return Icons.campaign;
    }
  }

  String _formatTime(dynamic date) {
    if (date == null) return '';
    try {
      final d = DateTime.parse(date.toString());
      return '${d.day}/${d.month}/${d.year}';
    } catch (_) {
      return '';
    }
  }
}
