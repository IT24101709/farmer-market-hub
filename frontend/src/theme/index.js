/**
 * Unified green theme for Farmers Market Hub.
 * Use: import theme from '../theme' (adjust path depth per file).
 */
const theme = {
  // Brand greens
  primary: '#15803d',
  primaryDark: '#14532d',
  primaryDarker: '#166534',
  header: '#166534',
  primaryLight: '#22c55e',
  primaryMuted: '#86efac',
  primarySoft: '#dcfce7',
  primaryBg: '#f0fdf4',
  primaryBgAlt: '#ecfdf5',
  primaryTint: '#bbf7d0',
  // Surfaces
  surface: '#ffffff',
  pageBg: '#f0fdf4',
  pageBgNeutral: '#f8fafc',
  border: '#bbf7d0',
  borderSubtle: '#e5e7eb',
  // Text
  text: '#14532d',
  textSecondary: '#374151',
  textMuted: '#64748b',
  // Actions
  accent: '#059669',
  link: '#15803d',
  // Semantic (keep red/amber for errors; buttons stay green)
  error: '#dc2626',
  errorBg: '#fee2e2',
  warning: '#ca8a04',
  warningBg: '#fef3c7',
  success: '#15803d',
  successBg: '#dcfce7',
  // Order / delivery status (green-first palette)
  statusPending: '#ca8a04',
  statusProcessing: '#0d9488',
  statusActive: '#047857',
  statusDone: '#15803d',
  statusNeutral: '#64748b',
  // Navigator ActivityIndicator
  spinner: '#15803d'
};

export default theme;
export { theme };
