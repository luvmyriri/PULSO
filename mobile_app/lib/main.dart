import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:pulso_mobile/core/api/api_client.dart';
import 'package:pulso_mobile/core/providers/settings_provider.dart';
import 'package:pulso_mobile/l10n/app_localizations.dart';
import 'package:pulso_mobile/core/theme/app_theme.dart';
import 'package:pulso_mobile/features/landing/screens/landing_screen.dart';
import 'package:pulso_mobile/features/auth/screens/resident_login_screen.dart';
import 'package:pulso_mobile/features/auth/screens/register_screen.dart';
import 'package:pulso_mobile/features/agent/screens/agent_screen.dart';
import 'package:pulso_mobile/features/agent/agent_provider.dart';
import 'package:pulso_mobile/features/home/home_provider.dart';
import 'package:pulso_mobile/features/home/screens/home_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize SharedPreferences for token storage
  await ApiClient.init();
  
  final prefs = await SharedPreferences.getInstance();
  bool rememberMe = prefs.getBool('remember_me') ?? false;
  
  if (!rememberMe) {
    await ApiClient.clearTokens();
  }
  
  bool isLoggedIn = await ApiClient.hasToken();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => SettingsProvider()),
        ChangeNotifierProvider(create: (_) => AgentProvider()),
        ChangeNotifierProvider(create: (_) => HomeProvider(ApiClient())),
      ],
      child: PulsoApp(isLoggedIn: isLoggedIn),
    ),
  );
}

class PulsoApp extends StatelessWidget {
  final bool isLoggedIn;
  const PulsoApp({super.key, required this.isLoggedIn});

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
      supportedLocales: const [Locale('en'), Locale('tl')],
      initialRoute: '/login',
      routes: {
        '/': (context) => const LandingScreen(),
        '/login': (context) => const ResidentLoginScreen(),
        '/register': (context) => const RegisterScreen(),
        '/agent': (context) => const AgentScreen(),
        '/home': (context) => const HomeScreen(),
      },
    );
  }
}
