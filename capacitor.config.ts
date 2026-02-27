import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.prashanthischool.app',
  appName: 'Prashanthi School',
  webDir: 'out',
  server: {
    url: 'https://prashanthi-school-6kow.vercel.app/login',
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