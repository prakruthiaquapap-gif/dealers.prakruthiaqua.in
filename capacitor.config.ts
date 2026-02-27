import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dealersprakruthiaqua.app',
  appName: 'Dealers Prakruthiaqua',
  webDir: 'out',
  server: {
    url: 'https://dealers.prakruthiaqua.in',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#ffffff",
      showSpinner: true,
      androidScaleType: "CENTER_CROP"
    }
  }
};

export default config;