import 'package:flutter/material.dart';

class AppTheme {
  // Colors
  static const Color NishiPurple = Color(0xFF6C63FF);
  static const Color ghostWhite = Color(0xFFF8F9FA);
  static const Color shadowBlack = Color(0xFF1A1A2E);
  static const Color deepShadow = Color(0xFF16213E);
  static const Color vanishGray = Color(0xFF9E9E9E);
  static const Color ambientGreen = Color(0xFF4CAF50);
  static const Color trapRed = Color(0xFFFF5252);
  static const Color dropBlue = Color(0xFF2196F3);
  static const Color universeOrange = Color(0xFFFF9800);

  // Dark Theme
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      primaryColor: NishiPurple,
      scaffoldBackgroundColor: shadowBlack,
      colorScheme: const ColorScheme.dark(
        primary: NishiPurple,
        secondary: ambientGreen,
        surface: deepShadow,
        error: trapRed,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: deepShadow,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: ghostWhite,
          fontSize: 20,
          fontWeight: FontWeight.bold,
        ),
      ),
      cardTheme: CardTheme(
        color: deepShadow,
        elevation: 4,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: NishiPurple,
          foregroundColor: ghostWhite,
          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: deepShadow,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: NishiPurple, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      ),
      textTheme: const TextTheme(
        headlineLarge: TextStyle(
          color: ghostWhite,
          fontSize: 32,
          fontWeight: FontWeight.bold,
        ),
        headlineMedium: TextStyle(
          color: ghostWhite,
          fontSize: 24,
          fontWeight: FontWeight.bold,
        ),
        bodyLarge: TextStyle(
          color: ghostWhite,
          fontSize: 16,
        ),
        bodyMedium: TextStyle(
          color: vanishGray,
          fontSize: 14,
        ),
      ),
    );
  }
}
