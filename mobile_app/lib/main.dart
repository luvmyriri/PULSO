import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';
import 'package:pulso_mobile/core/providers/settings_provider.dart';
import 'package:pulso_mobile/l10n/app_localizations.dart';
import 'package:pulso_mobile/core/theme/app_theme.dart';
import 'package:pulso_mobile/features/landing/screens/landing_screen.dart';
import 'package:pulso_mobile/features/auth/screens/login_screen.dart';
import 'package:pulso_mobile/features/auth/screens/register_screen.dart';

void main() {
  runApp(
    ChangeNotifierProvider(
      create: (_) => SettingsProvider(),
      child: const PulsoApp(),
    ),
  );
}

class PulsoApp extends StatelessWidget {
  const PulsoApp({super.key});

  @override
  Widget build(BuildContext context) {
    final settings = context.watch<SettingsProvider>();

    return MaterialApp(
      title: 'PULSO Mobile',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: settings.themeMode,
      locale: settings.locale,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('en'),
        Locale('tl'),
      ],
      initialRoute: '/',
      routes: {
        '/': (context) => const LandingScreen(),
        '/login': (context) => const LoginScreen(),
        '/register': (context) => const RegisterScreen(),
      },
    );
  }
}
