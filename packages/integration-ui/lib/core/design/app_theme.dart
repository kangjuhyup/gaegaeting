import 'package:flutter/material.dart';

abstract final class AppColors {
  static const primary = Color(0xFFB84A2A);
  static const brand = Color(0xFFF47C52);
  static const text = Color(0xFF242428);
  static const secondary = Color(0xFF68686F);
  static const muted = Color(0xFF76767D);
  static const subtle = Color(0xFFF5F5F6);
  static const divider = Color(0xFFE8E8EB);
  static const peach = Color(0xFFFAE9DE);
  static const success = Color(0xFF446D48);
  static const successBackground = Color(0xFFEDF6EB);
}

abstract final class AppText {
  static const heading = TextStyle(
    fontSize: 24,
    height: 32 / 24,
    fontWeight: FontWeight.w700,
  );
  static const title = TextStyle(
    fontSize: 20,
    height: 28 / 20,
    fontWeight: FontWeight.w700,
  );
  static const body = TextStyle(fontSize: 16, height: 24 / 16);
  static const small = TextStyle(fontSize: 14, height: 20 / 14);
  static const caption = TextStyle(fontSize: 12, height: 18 / 12);
}

ThemeData buildAppTheme() => ThemeData(
  useMaterial3: true,
  fontFamily: 'NotoSansKR',
  scaffoldBackgroundColor: Colors.white,
  colorScheme: ColorScheme.fromSeed(
    seedColor: AppColors.primary,
    primary: AppColors.primary,
    surface: Colors.white,
  ),
  textTheme: const TextTheme(
    bodyMedium: AppText.body,
    bodySmall: AppText.small,
  ).apply(bodyColor: AppColors.text, displayColor: AppColors.text),
  splashFactory: InkSparkle.splashFactory,
  inputDecorationTheme: InputDecorationTheme(
    filled: true,
    fillColor: AppColors.subtle,
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide.none,
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide.none,
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: AppColors.primary, width: 2),
    ),
  ),
);
