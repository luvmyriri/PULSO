const debug = process.env.PULSO_CAPACITOR_DEBUG === '1';

export const appId = 'ph.gov.caloocan.pulso';
export const appName = 'PULSO';
export const webDir = 'dist';
export const server = { androidScheme: 'https', cleartext: debug };
export const android = { allowMixedContent: debug, webContentsDebuggingEnabled: debug, zoomEnabled: true };
export const plugins = {
  PulsoAppUpdate: { serverUrl: process.env.VITE_API_BASE_URL || '' },
  SplashScreen: {
    launchAutoHide: false,
    launchFadeOutDuration: 0,
    androidSplashResourceName: 'pulso_launch_icon',
    backgroundColor: '#F7F9FC',
    showSpinner: false,
  },
  // PulsoAppearance owns insets: the landing draws under the system bars while
  // forms and other routes retain native padding, including keyboard handling.
  SystemBars: { insetsHandling: 'disable' },
};
