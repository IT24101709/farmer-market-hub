import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  TextInput,
  Dimensions
} from 'react-native';
import { getPublicProducts } from '../../services/publicService';
import getEnvVars from '../../config';

const { width } = Dimensions.get('window');
const { apiUrl } = getEnvVars();
const API_BASE = apiUrl.replace('/api', '');

const previewImageUrl = (product) => {
  const path = product.imageUrl || product.image;
  if (!path) return null;
  return String(path).startsWith('http') ? path : `${API_BASE}${path}`;
};

const LandingScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await getPublicProducts();
        setProducts(data);
      } catch (error) {
        console.error('Error fetching public products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const renderProductPreview = () => {
    if (loading) {
      return <ActivityIndicator size="large" color="#4CAF50" style={{ marginVertical: 30 }} />;
    }

    if (products.length === 0) {
      return <Text style={styles.emptyText}>More fresh produce arriving soon!</Text>;
    }

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.productScroll}>
        {products.map((product) => {
          const imageUrl = previewImageUrl(product);
          const title = product.name || product.vegetableName || 'Fresh produce';

          return (
            <View key={product._id} style={styles.productCard}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.productImage} />
              ) : (
                <View style={[styles.productImage, { backgroundColor: '#E0E0E0' }]} />
              )}
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{title}</Text>
                <Text style={styles.productPrice}>LKR {product.pricePerKg}/kg</Text>
                <Text style={styles.farmerName}>By {product.farmerId?.name || 'Local Farmer'}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER NAVBAR */}
      <View style={styles.navbar}>
        <Text style={styles.logoText}>🌱 FM Hub</Text>
        <View style={styles.navLinks}>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.navBtn}>
            <Text style={styles.navBtnText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={[styles.navBtn, styles.navBtnPrimary]}>
            <Text style={styles.navBtnTextWhite}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
        
        {/* HERO SECTION */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Fresh from Farm to Your Table</Text>
          <Text style={styles.heroSubtitle}>Connecting local farmers directly with buyers for the freshest, most affordable produce.</Text>
          
          <View style={styles.searchContainer}>
            <TextInput 
              style={styles.searchInput} 
              placeholder="Search for fresh vegetables..." 
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity 
              style={styles.searchBtn} 
              onPress={() => navigation.navigate('Login')} // Prompt login for full search
            >
              <Text style={styles.searchBtnText}>Search</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FEATURE HIGHLIGHTS */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statIcon}>👨‍🌾</Text>
            <Text style={styles.statNumber}>500+</Text>
            <Text style={styles.statLabel}>Local Farmers</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statIcon}>🥬</Text>
            <Text style={styles.statNumber}>10k+</Text>
            <Text style={styles.statLabel}>Kg Traded</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statIcon}>✅</Text>
            <Text style={styles.statNumber}>100%</Text>
            <Text style={styles.statLabel}>Fresh Quality</Text>
          </View>
        </View>

        {/* PRODUCT PREVIEW */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Top Picks</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.viewAllText}>View All →</Text>
            </TouchableOpacity>
          </View>
          {renderProductPreview()}
        </View>

        {/* HOW IT WORKS */}
        <View style={[styles.sectionContainer, { backgroundColor: '#FFFFFF', paddingVertical: 30 }]}>
          <Text style={[styles.sectionTitle, { textAlign: 'center', marginBottom: 30 }]}>How It Works</Text>
          
          <View style={styles.stepsGrid}>
            <View style={styles.stepCard}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
              <Text style={styles.stepTitle}>Sign Up</Text>
              <Text style={styles.stepDesc}>Register as a farmer to list, or buyer to shop.</Text>
            </View>
            <View style={styles.stepCard}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
              <Text style={styles.stepTitle}>Browse & List</Text>
              <Text style={styles.stepDesc}>Farmers add fresh stock, buyers find deals.</Text>
            </View>
            <View style={styles.stepCard}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
              <Text style={styles.stepTitle}>Connect</Text>
              <Text style={styles.stepDesc}>Chat and agree on quality and pickup times.</Text>
            </View>
            <View style={styles.stepCard}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>4</Text></View>
              <Text style={styles.stepTitle}>Trade</Text>
              <Text style={styles.stepDesc}>Complete the transaction securely.</Text>
            </View>
          </View>
        </View>

        {/* CTA BANNER */}
        <View style={styles.ctaBanner}>
          <Text style={styles.ctaTitle}>Ready to start trading?</Text>
          <Text style={styles.ctaSubtitle}>Join our growing community today.</Text>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.ctaBtnText}>Create Free Account</Text>
          </TouchableOpacity>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.logoTextDark}>🌱 FM Hub</Text>
          <Text style={styles.footerText}>© 2026 Farmers Market Hub.</Text>
          <Text style={styles.footerText}>All rights reserved.</Text>
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    zIndex: 10,
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  logoTextDark: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navBtn: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  navBtnPrimary: {
    backgroundColor: '#4CAF50',
  },
  navBtnText: {
    color: '#333',
    fontWeight: '600',
  },
  navBtnTextWhite: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  heroSection: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 20,
    paddingVertical: 50,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1B5E20',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 42,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#388E3C',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 10,
    lineHeight: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    padding: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  searchBtn: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  searchBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: -30,
    marginBottom: 30,
  },
  statBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 15,
    width: '31%',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 5,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
    marginTop: 2,
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
  },
  viewAllText: {
    color: '#2196F3',
    fontWeight: 'bold',
    marginBottom: 3,
  },
  productScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    width: 200,
    marginRight: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    marginBottom: 10,
  },
  productImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#EEEEEE',
  },
  productInfo: {
    padding: 15,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  farmerName: {
    fontSize: 12,
    color: '#757575',
  },
  emptyText: {
    color: '#757575',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 20,
  },
  stepsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  stepCard: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepNumberText: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: 'bold',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 5,
    textAlign: 'center',
  },
  stepDesc: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
    lineHeight: 18,
  },
  ctaBanner: {
    backgroundColor: '#2E7D32',
    padding: 40,
    alignItems: 'center',
    marginHorizontal: 20,
    borderRadius: 20,
    marginTop: 20,
    marginBottom: 40,
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  ctaSubtitle: {
    fontSize: 14,
    color: '#E8F5E9',
    marginBottom: 20,
    textAlign: 'center',
  },
  ctaBtn: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    elevation: 3,
  },
  ctaBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  footer: {
    alignItems: 'center',
    padding: 30,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  footerText: {
    color: '#9E9E9E',
    fontSize: 12,
    marginTop: 4,
  }
});

export default LandingScreen;
