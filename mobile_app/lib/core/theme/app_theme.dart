import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static const Color primaryOrange = Color(0xFFFF6600);
  static const Color primaryLight = Color(0xFFFFA366);
  static const Color primaryDark = Color(0xFFCC5200);
  
  static const Color darkSlate = Color(0xFF0F172A);
  static const Color darkSlateLight = Color(0xFF1E293B);
  
  static const Color lightGray = Color(0xFFF8FAFC);
  
  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    primaryColor: primaryOrange,
    scaffoldBackgroundColor: const Color(0xFFF8FAFC),
    textTheme: GoogleFonts.outfitTextTheme(),
    colorScheme: ColorScheme.fromSeed(
      seedColor: primaryOrange,
      brightness: Brightness.light,
      primary: primaryOrange,
      onPrimary: Colors.white,
      secondary: primaryLight,
      surface: Colors.white,
      onSurface: const Color(0xFF0F172A),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.transparent,
      elevation: 0,
      iconTheme: IconThemeData(color: Color(0xFF0F172A)),
    ),
  );

  static ThemeData darkTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    primaryColor: primaryOrange,
    scaffoldBackgroundColor: const Color(0xFF020617),
    textTheme: GoogleFonts.outfitTextTheme(ThemeData.dark().textTheme),
    colorScheme: ColorScheme.fromSeed(
      seedColor: primaryOrange,
      brightness: Brightness.dark,
      primary: primaryOrange,
      onPrimary: Colors.white,
      secondary: primaryDark,
      surface: const Color(0xFF0F172A),
      onSurface: Colors.white,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.transparent,
      elevation: 0,
      iconTheme: IconThemeData(color: Colors.white),
    ),
  );

  static ButtonStyle orangeButtonStyle = ElevatedButton.styleFrom(
    backgroundColor: primaryOrange,
    foregroundColor: Colors.white,
    padding: const EdgeInsets.symmetric(vertical: 20),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
    elevation: 8,
    shadowColor: primaryOrange.withOpacity(0.3),
  );
}
