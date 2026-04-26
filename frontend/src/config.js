// Centralized configuration for the frontend

// In production, this would be read from an environment variable
// e.g. process.env.EXPO_PUBLIC_API_URL or similar.
// For now, it defaults to localhost or your machine's IP for mobile testing.
const ENV = {
  dev: {
    // If testing on a physical device, change localhost to your computer's local IP address
    // example: 'http://192.168.1.5:5000/api'
    apiUrl: 'http://localhost:5000/api'
  },
  prod: {
    apiUrl: 'https://farmers-market-hub-api.onrender.com/api' // Example production URL
  }
};

const getEnvVars = (env = '') => {
  // Can use __DEV__ in React Native to check if running in development
  if (__DEV__) {
    return ENV.dev;
  }
  return ENV.prod;
};

export default getEnvVars;
