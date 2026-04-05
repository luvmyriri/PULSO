import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:pulso_mobile/core/theme/app_theme.dart';

class PulsoBranding extends StatelessWidget {
  final double scale;
  final Color? textColor;
  final String? subtitle;
  
  const PulsoBranding({
    super.key, 
    this.scale = 1.0, 
    this.textColor,
    this.subtitle
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final brandOrange = AppTheme.primaryOrange;
    final displayTextColor = textColor ?? (isDark ? Colors.white : const Color(0xFF0F172A));
    
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Stack(
          clipBehavior: Clip.none,
          children: [
            // Engineering Logo
            Container(
              width: 44 * scale,
              height: 44 * scale,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white, // Ensure white background for logos
                border: Border.all(
                  color: isDark ? Colors.white54 : Colors.black.withOpacity(0.08), 
                  width: 1.5 * scale
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(isDark ? 0.4 : 0.05), 
                    blurRadius: 10 * scale, 
                    offset: Offset(0, 4 * scale)
                  )
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(100),
                child: Image.asset('assets/images/engineering-logo.jpg', fit: BoxFit.cover),
              ),
            ),
            // Pulso Logo (Overlapping)
            Positioned(
              left: 28 * scale,
              child: Container(
                width: 44 * scale,
                height: 44 * scale,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white, // Ensure white background for logos
                  border: Border.all(
                    color: isDark ? Colors.white54 : Colors.black.withOpacity(0.08), 
                    width: 1.5 * scale
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(isDark ? 0.4 : 0.05), 
                      blurRadius: 10 * scale, 
                      offset: Offset(0, 4 * scale)
                    )
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(100),
                  child: Image.asset('assets/images/pulso-logo.png', fit: BoxFit.cover),
                ),
              ),
            ),
          ],
        ),
        SizedBox(width: 28 * scale),
        Flexible(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'PULSO',
                style: GoogleFonts.outfit(
                  fontSize: 24 * scale,
                  fontWeight: FontWeight.w900,
                  color: displayTextColor,
                  letterSpacing: -0.5,
                ),
              ),
              Text(
                subtitle ?? 'CITY ENGINEERING',
                style: GoogleFonts.outfit(
                  fontSize: 9 * scale,
                  fontWeight: FontWeight.w900,
                  color: brandOrange,
                  letterSpacing: 1.2,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
