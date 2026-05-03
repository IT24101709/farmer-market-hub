import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../theme';

/**
 * Global app footer — keep copy short; styles work on web, iOS, and Android.
 */
const AppFooter = () => {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, Platform.OS === 'web' ? 8 : 6);

  return (
    <View
      style={[
        styles.bar,
        { paddingBottom: bottom, paddingTop: 12 }
      ]}
      accessibilityRole={Platform.OS === 'web' ? 'contentinfo' : undefined}
    >
      <Text style={styles.brand}>Farmers Market Hub</Text>
      <Text style={styles.tagline}>Fresh produce · Local farmers · Fair prices</Text>
      <Text style={styles.legal}>
        © {new Date().getFullYear()} Farmers Market Hub. All rights reserved.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(22, 101, 52, 0.28)',
    backgroundColor: theme.primaryBgAlt,
    paddingHorizontal: 16,
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? {
          boxSizing: 'border-box',
          width: '100%'
        }
      : {})
  },
  brand: {
    color: theme.primaryDark,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3
  },
  tagline: {
    marginTop: 4,
    color: theme.primaryDarker,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center'
  },
  legal: {
    marginTop: 8,
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center'
  }
});

export default AppFooter;
