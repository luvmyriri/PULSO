import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_tl.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('tl'),
  ];

  /// No description provided for @appTitle.
  ///
  /// In en, this message translates to:
  /// **'PULSO'**
  String get appTitle;

  /// No description provided for @heroTitle.
  ///
  /// In en, this message translates to:
  /// **'Smart Infrastructure,\nSmarter City.'**
  String get heroTitle;

  /// No description provided for @heroSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Public Utility and Infrastructure Locator System for Engineering Operations. Integrated with real-time Geospatial Triage and AI-driven Predictive Maintenance.'**
  String get heroSubtitle;

  /// No description provided for @registerNow.
  ///
  /// In en, this message translates to:
  /// **'Register Now'**
  String get registerNow;

  /// No description provided for @documentation.
  ///
  /// In en, this message translates to:
  /// **'Documentation'**
  String get documentation;

  /// No description provided for @platformTitle.
  ///
  /// In en, this message translates to:
  /// **'Engineered for Efficiency'**
  String get platformTitle;

  /// No description provided for @platformSubtitle.
  ///
  /// In en, this message translates to:
  /// **'A unified dashboard designed specifically for the Engineering Office to monitor, anticipate, and respond to city-wide utility statuses.'**
  String get platformSubtitle;

  /// No description provided for @geoTriageTitle.
  ///
  /// In en, this message translates to:
  /// **'GEOSPATIAL TRIAGE'**
  String get geoTriageTitle;

  /// No description provided for @geoTriageDesc.
  ///
  /// In en, this message translates to:
  /// **'Instant identification and prioritization of critical infrastructure failures.'**
  String get geoTriageDesc;

  /// No description provided for @predictiveTitle.
  ///
  /// In en, this message translates to:
  /// **'PREDICTIVE MAINTENANCE'**
  String get predictiveTitle;

  /// No description provided for @predictiveDesc.
  ///
  /// In en, this message translates to:
  /// **'Leveraging historical data models to anticipate utility repairs BEFORE they occur.'**
  String get predictiveDesc;

  /// No description provided for @aiOptimizationTitle.
  ///
  /// In en, this message translates to:
  /// **'AI OPTIMIZATION'**
  String get aiOptimizationTitle;

  /// No description provided for @aiOptimizationDesc.
  ///
  /// In en, this message translates to:
  /// **'Powered by Gemini AI integrated into the city grid core for routine maintenance scheduling.'**
  String get aiOptimizationDesc;

  /// No description provided for @howItWorks.
  ///
  /// In en, this message translates to:
  /// **'HOW IT WORKS'**
  String get howItWorks;

  /// No description provided for @timelineTitle.
  ///
  /// In en, this message translates to:
  /// **'Report an Issue in\n5 Simple Steps.'**
  String get timelineTitle;

  /// No description provided for @timelineSubtitle.
  ///
  /// In en, this message translates to:
  /// **'PULSO streamlines the entire process from citizen report to verified resolution powered by AI triage and real-time dispatch.'**
  String get timelineSubtitle;

  /// No description provided for @step1Title.
  ///
  /// In en, this message translates to:
  /// **'Register & Verify'**
  String get step1Title;

  /// No description provided for @step1Desc.
  ///
  /// In en, this message translates to:
  /// **'Create your resident account and verify residency using a government-issued ID.'**
  String get step1Desc;

  /// No description provided for @step2Title.
  ///
  /// In en, this message translates to:
  /// **'Capture at the Scene'**
  String get step2Title;

  /// No description provided for @step2Desc.
  ///
  /// In en, this message translates to:
  /// **'Take a clear photo of the infrastructure hazard on-site. Your GPS coordinates are automatically tagged.'**
  String get step2Desc;

  /// No description provided for @step3Title.
  ///
  /// In en, this message translates to:
  /// **'AI Triage'**
  String get step3Title;

  /// No description provided for @step3Desc.
  ///
  /// In en, this message translates to:
  /// **'Gemini AI instantly analyzes your photo and description, categorizes the issue, and assigns urgency.'**
  String get step3Desc;

  /// No description provided for @step4Title.
  ///
  /// In en, this message translates to:
  /// **'Dispatcher Reviews'**
  String get step4Title;

  /// No description provided for @step4Desc.
  ///
  /// In en, this message translates to:
  /// **'A city engineering dispatcher reviews the AI-verified ticket and assigns the nearest qualified crew.'**
  String get step4Desc;

  /// No description provided for @step5Title.
  ///
  /// In en, this message translates to:
  /// **'Crew Resolves'**
  String get step5Title;

  /// No description provided for @step5Desc.
  ///
  /// In en, this message translates to:
  /// **'Field crews complete the repair and upload Proof of Repair photos. You get notified once resolved.'**
  String get step5Desc;

  /// No description provided for @solutionsTitle.
  ///
  /// In en, this message translates to:
  /// **'Targeted Responses for\nCritical Infrastructure.'**
  String get solutionsTitle;

  /// No description provided for @solutionsSubtitle.
  ///
  /// In en, this message translates to:
  /// **'PULSO categorizes reports automatically, routing specific hazards to specialized engineering teams instantly.'**
  String get solutionsSubtitle;

  /// No description provided for @roadsTitle.
  ///
  /// In en, this message translates to:
  /// **'Roads & Bridges'**
  String get roadsTitle;

  /// No description provided for @roadsDesc.
  ///
  /// In en, this message translates to:
  /// **'Pothole patching, sidewalk repairs, and structural monitoring.'**
  String get roadsDesc;

  /// No description provided for @waterTitle.
  ///
  /// In en, this message translates to:
  /// **'Water & Drainage'**
  String get waterTitle;

  /// No description provided for @waterDesc.
  ///
  /// In en, this message translates to:
  /// **'Cleaning of clogged canals, manhole maintenance, and flood control.'**
  String get waterDesc;

  /// No description provided for @lightingTitle.
  ///
  /// In en, this message translates to:
  /// **'Street Lighting'**
  String get lightingTitle;

  /// No description provided for @lightingDesc.
  ///
  /// In en, this message translates to:
  /// **'Installation and repair of streetlights and electrical wiring.'**
  String get lightingDesc;

  /// No description provided for @safetyTitle.
  ///
  /// In en, this message translates to:
  /// **'Public Safety'**
  String get safetyTitle;

  /// No description provided for @safetyDesc.
  ///
  /// In en, this message translates to:
  /// **'Building inspections, disaster debris clearing, and safety compliance.'**
  String get safetyDesc;

  /// No description provided for @facilitiesTitle.
  ///
  /// In en, this message translates to:
  /// **'Public Facilities'**
  String get facilitiesTitle;

  /// No description provided for @facilitiesDesc.
  ///
  /// In en, this message translates to:
  /// **'Maintenance of public schools, health centers, and city-owned buildings.'**
  String get facilitiesDesc;

  /// No description provided for @cityServicesBadge.
  ///
  /// In en, this message translates to:
  /// **'LGU CITY SERVICES'**
  String get cityServicesBadge;

  /// No description provided for @cityServicesTitle.
  ///
  /// In en, this message translates to:
  /// **'Access Caloocan City Online.'**
  String get cityServicesTitle;

  /// No description provided for @visitPortal.
  ///
  /// In en, this message translates to:
  /// **'Visit City Services Portal'**
  String get visitPortal;

  /// No description provided for @aboutBadge.
  ///
  /// In en, this message translates to:
  /// **'ABOUT CALOOCAN LGU'**
  String get aboutBadge;

  /// No description provided for @aboutTitle.
  ///
  /// In en, this message translates to:
  /// **'A Modern Governance\nInitiative.'**
  String get aboutTitle;

  /// No description provided for @aboutDesc.
  ///
  /// In en, this message translates to:
  /// **'The City Government of Caloocan launched the PULSO Project to bridge the gap between citizens and engineering operations. By crowdsourcing infrastructure data, we transform every smartphone into a vital city sensor.'**
  String get aboutDesc;

  /// No description provided for @systemAnalytics.
  ///
  /// In en, this message translates to:
  /// **'System Analytics'**
  String get systemAnalytics;

  /// No description provided for @metricResolved.
  ///
  /// In en, this message translates to:
  /// **'Hazard Reports Resolved'**
  String get metricResolved;

  /// No description provided for @metricDispatch.
  ///
  /// In en, this message translates to:
  /// **'Preventative Dispatch Rate'**
  String get metricDispatch;

  /// No description provided for @metricAdoption.
  ///
  /// In en, this message translates to:
  /// **'Resident Portal Adoption'**
  String get metricAdoption;

  /// No description provided for @themeMode.
  ///
  /// In en, this message translates to:
  /// **'Theme Mode'**
  String get themeMode;

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get language;

  /// No description provided for @login.
  ///
  /// In en, this message translates to:
  /// **'Login'**
  String get login;

  /// No description provided for @home.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get home;

  /// No description provided for @platform.
  ///
  /// In en, this message translates to:
  /// **'Platform'**
  String get platform;

  /// No description provided for @solutions.
  ///
  /// In en, this message translates to:
  /// **'Solutions'**
  String get solutions;

  /// No description provided for @aboutLgu.
  ///
  /// In en, this message translates to:
  /// **'About LGU'**
  String get aboutLgu;

  /// No description provided for @welcomeBack.
  ///
  /// In en, this message translates to:
  /// **'Welcome Back'**
  String get welcomeBack;

  /// No description provided for @signInSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Sign in to your PULSO account'**
  String get signInSubtitle;

  /// No description provided for @emailOrMobile.
  ///
  /// In en, this message translates to:
  /// **'EMAIL OR MOBILE'**
  String get emailOrMobile;

  /// No description provided for @enterIdentifier.
  ///
  /// In en, this message translates to:
  /// **'Enter your identifier'**
  String get enterIdentifier;

  /// No description provided for @passwordLabel.
  ///
  /// In en, this message translates to:
  /// **'PASSWORD'**
  String get passwordLabel;

  /// No description provided for @signInButton.
  ///
  /// In en, this message translates to:
  /// **'SIGN IN'**
  String get signInButton;

  /// No description provided for @noAccount.
  ///
  /// In en, this message translates to:
  /// **'Don\'t have an account? '**
  String get noAccount;

  /// No description provided for @signUpLink.
  ///
  /// In en, this message translates to:
  /// **'Sign Up'**
  String get signUpLink;

  /// No description provided for @createAccount.
  ///
  /// In en, this message translates to:
  /// **'Create Account'**
  String get createAccount;

  /// No description provided for @registerSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Join PULSO and start reporting issues'**
  String get registerSubtitle;

  /// No description provided for @fullName.
  ///
  /// In en, this message translates to:
  /// **'FULL NAME'**
  String get fullName;

  /// No description provided for @enterFullName.
  ///
  /// In en, this message translates to:
  /// **'Enter your full name'**
  String get enterFullName;

  /// No description provided for @emailAddress.
  ///
  /// In en, this message translates to:
  /// **'EMAIL ADDRESS'**
  String get emailAddress;

  /// No description provided for @enterEmail.
  ///
  /// In en, this message translates to:
  /// **'Enter your email'**
  String get enterEmail;

  /// No description provided for @mobileNumber.
  ///
  /// In en, this message translates to:
  /// **'MOBILE NUMBER'**
  String get mobileNumber;

  /// No description provided for @enterMobile.
  ///
  /// In en, this message translates to:
  /// **'Enter your mobile number'**
  String get enterMobile;

  /// No description provided for @signUpButton.
  ///
  /// In en, this message translates to:
  /// **'CREATE ACCOUNT'**
  String get signUpButton;

  /// No description provided for @alreadyHaveAccount.
  ///
  /// In en, this message translates to:
  /// **'Already have an account? '**
  String get alreadyHaveAccount;

  /// No description provided for @loginLink.
  ///
  /// In en, this message translates to:
  /// **'Login'**
  String get loginLink;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'tl'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'tl':
      return AppLocalizationsTl();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
