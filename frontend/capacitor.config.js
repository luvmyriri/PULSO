const debug = process.env.PULSO_CAPACITOR_DEBUG === '1';

export const appId = 'ph.gov.caloocan.pulso';
export const appName = 'PULSO';
export const webDir = 'dist';
export const server = { androidScheme: 'https', cleartext: debug };
export const android = { allowMixedContent: debug, webContentsDebuggingEnabled: debug, zoomEnabled: true };
export const plugins = {
  SplashScreen: { launchAutoHide: false, showSpinner: false },
  SystemBars: { insetsHandling: 'native' },
};
