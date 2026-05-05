import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { getPublicProducts } from '../../services/publicService';
import { resolveStockImageUrl } from '../../config';

const HERO_FALLBACK =
  'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1400&q=80';

const previewImageUrl = (product) => resolveStockImageUrl(product);

const StatItem = ({ value, label }) => (
  <View style={styles.statItem}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const FeatureItem = ({ title, text }) => (
  <View style={styles.featureItem}>
    <Text style={styles.featureTitle}>{title}</Text>
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const StepItem = ({ number, title, text }) => (
  <View style={styles.stepItem}>
    <Text style={styles.stepNumber}>{number}</Text>
    <View style={styles.stepCopy}>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  </View>
);

const LandingScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await getPublicProducts();
        setProducts(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching public products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const heroImage = HERO_FALLBACK;

  const handleExplore = () => {
    navigation.navigate('Login');
  };

  const handleSearch = () => {
    navigation.navigate('Login', { search: searchQuery.trim() });
  };

  const renderProductPreview = () => {
    if (loading) {
      return <ActivityIndicator size="large" color="#15803d" style={styles.loader} />;
    }

    if (products.length === 0) {
      return (
        <View style={styles.emptyPanel}>
          <Text style={styles.emptyTitle}>Fresh listings are coming soon.</Text>
          <Text style={styles.emptyText}>Create an account to be ready when local farmers publish new stock.</Text>
        </View>
      );
    }

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productRow}>
        {products.slice(0, 8).map((product) => {
          const imageUrl = previewImageUrl(product);
          const title = product.name || product.vegetableName || 'Fresh produce';

          return (
            <TouchableOpacity
              key={product._id}
              style={styles.productCard}
              activeOpacity={0.86}
              onPress={handleExplore}
            >
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.productImage} />
              ) : (
                <View style={[styles.productImage, styles.imagePlaceholder]} />
              )}
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>{title}</Text>
                <Text style={styles.productPrice}>LKR {Number(product.pricePerKg || 0).toFixed(2)}/kg</Text>
                <Text style={styles.farmerName} numberOfLines={1}>
                  {product.farmerId?.name || 'Local farmer'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navbar}>
        <TouchableOpacity activeOpacity={0.8}>
          <Text style={styles.logoText}>Farmers Market Hub</Text>
        </TouchableOpacity>
        <View style={styles.navLinks}>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.navBtn}>
            <Text style={styles.navBtnText}>Log in</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.navBtnPrimary}>
            <Text style={styles.navBtnPrimaryText}>Create account</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <ImageBackground source={{ uri: heroImage }} style={styles.hero} imageStyle={styles.heroImage}>
          <View style={styles.heroOverlay}>
            <View style={styles.heroContent}>
              <Text style={styles.heroEyebrow}>Direct local produce marketplace</Text>
              <Text style={styles.heroTitle}>Farmers Market Hub</Text>
              <Text style={styles.heroSubtitle}>
                Buy fresh vegetables from nearby farmers, track stock availability, and manage orders in one simple marketplace.
              </Text>
              <View style={styles.heroActions}>
                <TouchableOpacity style={styles.primaryCta} onPress={() => navigation.navigate('Register')}>
                  <Text style={styles.primaryCtaText}>Get started</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryCta} onPress={handleExplore}>
                  <Text style={styles.secondaryCtaText}>Browse marketplace</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ImageBackground>

        <View style={styles.searchBand}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search vegetables, greens, roots, herbs..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsBand}>
          <StatItem value="Fresh" label="daily farmer listings" />
          <StatItem value="Local" label="verified sellers" />
          <StatItem value="Simple" label="orders and payments" />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Available Today</Text>
              <Text style={styles.sectionSubtitle}>A quick look at fresh stock currently visible to customers.</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.linkText}>View all</Text>
            </TouchableOpacity>
          </View>
          {renderProductPreview()}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Built for every role</Text>
          <View style={styles.featureGrid}>
            <FeatureItem
              title="Customers"
              text="Browse produce, place orders, pay securely, and follow delivery updates."
            />
            <FeatureItem
              title="Farmers"
              text="Publish stock, update quantity and prices, confirm orders, and monitor payments."
            />
            <FeatureItem
              title="Admins"
              text="Manage users, marketplace stock, orders, payments, reviews, deliveries, and reports."
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How it works</Text>
          <View style={styles.steps}>
            <StepItem number="01" title="Create an account" text="Register as a customer or farmer and sign in securely." />
            <StepItem number="02" title="List or browse stock" text="Farmers add fresh items while customers browse available produce." />
            <StepItem number="03" title="Confirm and deliver" text="Orders move through confirmation, payment, delivery, and review." />
          </View>
        </View>

        <View style={styles.ctaBand}>
          <Text style={styles.ctaTitle}>Start with the freshest listings in your area.</Text>
          <Text style={styles.ctaText}>Create an account to access marketplace prices, ordering, reviews, and delivery tracking.</Text>
          <TouchableOpacity style={styles.ctaButton} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.ctaButtonText}>Create free account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>Farmers Market Hub</Text>
          <Text style={styles.footerText}>Fresh produce, transparent stock, and simpler local trade.</Text>
          <Text style={styles.footerMeta}>2026 Farmers Market Hub. All rights reserved.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  navbar: {
    minHeight: 66,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    zIndex: 10
  },
  logoText: {
    color: '#14532d',
    fontSize: 18,
    fontWeight: '900'
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  navBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8
  },
  navBtnText: {
    color: '#334155',
    fontWeight: '800'
  },
  navBtnPrimary: {
    backgroundColor: '#166534',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8
  },
  navBtnPrimaryText: {
    color: '#ffffff',
    fontWeight: '900'
  },
  scrollContent: {
    paddingBottom: 40
  },
  hero: {
    minHeight: 430,
    justifyContent: 'flex-end'
  },
  heroImage: {
    resizeMode: 'cover'
  },
  heroOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20, 83, 45, 0.58)',
    paddingHorizontal: 22,
    paddingTop: 54,
    paddingBottom: 42
  },
  heroContent: {
    maxWidth: 760
  },
  heroEyebrow: {
    color: '#bbf7d0',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
    marginBottom: 10
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 44,
    lineHeight: 50,
    fontWeight: '900',
    marginBottom: 12
  },
  heroSubtitle: {
    color: '#ecfdf5',
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '700',
    maxWidth: 680
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 24
  },
  primaryCta: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 8
  },
  primaryCtaText: {
    color: '#14532d',
    fontWeight: '900',
    fontSize: 15
  },
  secondaryCta: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 8
  },
  secondaryCtaText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 15
  },
  searchBand: {
    marginHorizontal: 18,
    marginTop: -28,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dcfce7',
    padding: 8,
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3
  },
  searchInput: {
    flex: 1,
    minHeight: 46,
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 12
  },
  searchButton: {
    backgroundColor: '#166534',
    borderRadius: 8,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center'
  },
  searchButtonText: {
    color: '#ffffff',
    fontWeight: '900'
  },
  statsBand: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 22
  },
  statItem: {
    flex: 1,
    minWidth: 145,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 16
  },
  statValue: {
    color: '#166534',
    fontSize: 22,
    fontWeight: '900'
  },
  statLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4
  },
  section: {
    paddingHorizontal: 18,
    paddingTop: 30
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 14,
    marginBottom: 14
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900'
  },
  sectionSubtitle: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4
  },
  linkText: {
    color: '#15803d',
    fontWeight: '900'
  },
  loader: {
    marginVertical: 30
  },
  productRow: {
    paddingVertical: 4,
    paddingRight: 18
  },
  productCard: {
    width: 190,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  productImage: {
    width: '100%',
    height: 126,
    backgroundColor: '#e2e8f0'
  },
  imagePlaceholder: {
    backgroundColor: '#e2e8f0'
  },
  productInfo: {
    padding: 12
  },
  productName: {
    color: '#111827',
    fontWeight: '900',
    fontSize: 15
  },
  productPrice: {
    color: '#166534',
    fontWeight: '900',
    marginTop: 5
  },
  farmerName: {
    color: '#64748b',
    fontWeight: '700',
    fontSize: 12,
    marginTop: 4
  },
  emptyPanel: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 18
  },
  emptyTitle: {
    color: '#111827',
    fontWeight: '900',
    fontSize: 16
  },
  emptyText: {
    color: '#64748b',
    fontWeight: '700',
    marginTop: 6
  },
  featureGrid: {
    gap: 12,
    marginTop: 14
  },
  featureItem: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 16
  },
  featureTitle: {
    color: '#14532d',
    fontWeight: '900',
    fontSize: 17
  },
  featureText: {
    color: '#475569',
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 6
  },
  steps: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 8,
    marginTop: 14
  },
  stepItem: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  stepNumber: {
    width: 38,
    color: '#166534',
    fontWeight: '900',
    fontSize: 16
  },
  stepCopy: {
    flex: 1
  },
  stepTitle: {
    color: '#111827',
    fontWeight: '900'
  },
  stepText: {
    color: '#64748b',
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 4
  },
  ctaBand: {
    marginHorizontal: 18,
    marginTop: 34,
    backgroundColor: '#14532d',
    borderRadius: 8,
    padding: 22
  },
  ctaTitle: {
    color: '#ffffff',
    fontSize: 23,
    fontWeight: '900'
  },
  ctaText: {
    color: '#bbf7d0',
    fontWeight: '700',
    lineHeight: 22,
    marginTop: 8
  },
  ctaButton: {
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16
  },
  ctaButtonText: {
    color: '#14532d',
    fontWeight: '900'
  },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 34,
    paddingBottom: 10
  },
  footerBrand: {
    color: '#14532d',
    fontWeight: '900',
    fontSize: 18
  },
  footerText: {
    color: '#475569',
    fontWeight: '700',
    marginTop: 6
  },
  footerMeta: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 16
  }
});

export default LandingScreen;
