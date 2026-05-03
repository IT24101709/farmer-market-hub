import React, { useCallback, useContext, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { getDashboardInsights, getStockStats } from '../../services/farmerService';

const NAV_ITEMS = [
  { label: 'Dashboard', screen: 'FarmerDashboard' },
  { label: 'Add Stock', screen: 'AddStock' },
  { label: 'View Stock', screen: 'StockList' },
  { label: 'Orders', screen: 'MyOrders' },
  { label: 'Reviews', screen: 'Reviews' },
  { label: 'Alerts', screen: 'Notifications' },
  { label: 'Profile', screen: 'FarmerProfile' }
];

const FARM_IMAGE = {
  uri: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1800&q=80'
};

const formatCurrency = (value = 0) => `Rs. ${Number(value || 0).toFixed(2)}`;

const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-GB');
};

const FarmerDashboardScreen = ({ navigation }) => {
  const { user, token, logout } = useContext(AuthContext);
  const { width } = useWindowDimensions();
  const [insights, setInsights] = useState(null);
  const [stockStats, setStockStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const isWide = width >= 900;
  const statCardWidth = isWide ? '18%' : width >= 620 ? '31%' : '100%';
  const priceCardWidth = isWide ? '18.5%' : width >= 620 ? '31%' : '100%';

  const fetchData = async () => {
    try {
      if (!token) {
        setLoadError('Please sign in to view your dashboard.');
        setInsights(null);
        setStockStats(null);
        return;
      }

      setLoadError(null);

      const [insightsData, statsData] = await Promise.all([
        getDashboardInsights(token),
        getStockStats(token)
      ]);

      setInsights(insightsData);
      setStockStats(statsData || insightsData?.stockStats);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      const msg =
        error && typeof error.message === 'string'
          ? error.message
          : 'Could not load dashboard. Check your connection and API URL (EXPO_PUBLIC_API_URL on device).';
      setLoadError(msg);
      setInsights(null);
      setStockStats(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [token])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleNavigation = (item) => {
    if (item.screen !== 'FarmerDashboard') {
      if (item.screen === 'Reviews') {
        navigation.navigate('Reviews', {
          farmerId: user?._id || user?.id,
          farmerName: user?.name || 'My Farm'
        });
        return;
      }
      navigation.navigate(item.screen);
    }
  };

  const severityMix = useMemo(() => {
    const mix = insights?.severityMix || {};
    const critical = mix.critical || 0;
    const warning = mix.warning || 0;
    const none = mix.none || 0;
    const total = Math.max(critical + warning + none, 1);

    return [
      { label: 'CRITICAL', count: critical, color: '#ef4444', width: `${(critical / total) * 100}%` },
      { label: 'WARNING', count: warning, color: '#f59e0b', width: `${(warning / total) * 100}%` },
      { label: 'NONE', count: none, color: '#64748b', width: `${(none / total) * 100}%` }
    ].filter(item => item.count > 0 || item.label !== 'WARNING');
  }, [insights]);

  const priceOverview = insights?.priceOverview || [];
  const riskyItems = insights?.riskyItems || [];

  const spoilageTrackedCount = useMemo(() => {
    const s = insights?.spoilageSummary;
    if (!s) return 0;
    return (s.low || 0) + (s.medium || 0) + (s.high || 0) + (s.critical || 0);
  }, [insights]);

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>Loading farmer management...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground source={FARM_IMAGE} style={styles.background} resizeMode="cover">
        <View style={styles.backdrop}>
          <View style={styles.navBar}>
            <View style={styles.brandPill}>
              <Text style={styles.brandIcon}>🌱</Text>
              <Text style={styles.brandText}>Stock Manager</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navTabs}>
              {NAV_ITEMS.map((item) => {
                const active = item.screen === 'FarmerDashboard';
                return (
                  <TouchableOpacity
                    key={item.label}
                    style={[styles.navTab, active && styles.navTabActive]}
                    onPress={() => handleNavigation(item)}
                  >
                    <Text style={[styles.navTabText, active && styles.navTabTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            <View style={styles.heroPanel}>
              <View style={styles.heroCopy}>
                <View style={styles.heroTitleRow}>
                  <Text style={styles.greeting}>Welcome back, {user?.name || 'Farmer'}</Text>
                  <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                    <Text style={styles.logoutText}>Logout</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.subtitle}>Live stock, spoilage, and wastage overview from the backend</Text>
                {loadError ? (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorBannerText}>{loadError}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.profilePill}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(user?.name || 'F').charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.profileText}>Farmer</Text>
              </View>
            </View>

            <View style={styles.sectionHeadingWrap}>
              <Text style={styles.sectionHeading}>Quick overview</Text>
              <Text style={styles.sectionHeadingHint}>Totals, availability, and spoilage exposure</Text>
            </View>

            <View style={styles.statsGrid}>
              <StatCard width={statCardWidth} tone="#22c55e" icon="📦" label="Total Stocks" value={stockStats?.totalStocks || 0} subtext="VEGETABLE TYPES" />
              <StatCard width={statCardWidth} tone="#059669" icon="⚖" label="Total Quantity" value={`${stockStats?.totalQuantity || 0} kg`} subtext="AVAILABLE" />
              <StatCard width={statCardWidth} tone="#10b981" icon="✓" label="Available Items" value={stockStats?.availableItems || 0} subtext="IN STOCK" />
              <StatCard width={statCardWidth} tone="#ef4444" icon="⛔" label="Out of Stock" value={stockStats?.outOfStock || 0} subtext="EMPTY ITEMS" />
              <StatCard width={statCardWidth} tone="#f97316" icon="⚠" label="Low Stock" value={stockStats?.lowStockItems || 0} subtext="ITEMS" />
              <StatCard width={statCardWidth} tone="#eab308" icon="🔥" label="Critical Spoilage" value={stockStats?.criticalSpoilage || 0} subtext="URGENT ACTION REQUIRED" />
              <StatCard width={statCardWidth} tone="#ef4444" icon="Rs" label="Financial Wastage" value={formatCurrency(stockStats?.financialWastage)} subtext="POTENTIAL LOSS" />
            </View>

            <View style={styles.sectionHeadingWrap}>
              <Text style={styles.sectionHeading}>Financial trend and risk</Text>
              <Text style={styles.sectionHeadingHint}>Spoilage severity mix across all stock lines</Text>
            </View>

            <View style={[styles.analyticsRow, !isWide && styles.analyticsRowStacked]}>
              <View style={[styles.analyticsCard, !isWide && styles.fullWidthCard]}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>Financial trend</Text>
                    <Text style={styles.sectionSubtitle}>Critical vs warning vs healthy stock lines</Text>
                  </View>
                  <Text style={styles.countPill}>{spoilageTrackedCount || priceOverview.length} items</Text>
                </View>

                {severityMix.map(item => (
                  <View key={item.label} style={styles.trendLine}>
                    <Text style={styles.trendLabel}>{item.label}</Text>
                    <View style={styles.trendBarTrack}>
                      <View style={[styles.trendBarFill, { width: item.width, backgroundColor: item.color }]} />
                    </View>
                    <Text style={styles.trendCount}>{item.count}</Text>
                  </View>
                ))}
              </View>

              <View style={[styles.analyticsCard, !isWide && styles.fullWidthCard]}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>Top risky items</Text>
                    <Text style={styles.sectionSubtitle}>Highest potential losses from spoilage and urgency</Text>
                  </View>
                  <Text style={styles.countPill}>Top 5</Text>
                </View>

                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeadText, styles.nameColumn]}>VEGETABLE</Text>
                  <Text style={styles.tableHeadText}>SEVERITY</Text>
                  <Text style={styles.tableHeadText}>WASTAGE</Text>
                  <Text style={styles.tableHeadText}>LOSS</Text>
                </View>

                {riskyItems.length === 0 ? (
                  <Text style={styles.emptyText}>No risky items right now.</Text>
                ) : riskyItems.map((item) => {
                  const sev = String(item.severity || item.spoilageRiskLevel || 'none').toLowerCase();
                  const sevStyle =
                    sev === 'critical'
                      ? { backgroundColor: '#fee2e2', color: '#991b1b' }
                      : sev === 'high'
                        ? { backgroundColor: '#ffedd5', color: '#c2410c' }
                        : sev === 'medium'
                          ? { backgroundColor: '#fef9c3', color: '#a16207' }
                          : { backgroundColor: '#f1f5f9', color: '#475569' };
                  const daysLabel =
                    item.daysLeft === undefined || item.daysLeft === null
                      ? ''
                      : item.daysLeft < 0
                        ? 'Expired'
                        : `${item.daysLeft} days left`;
                  return (
                    <View key={item._id} style={styles.riskyRow}>
                      <View style={styles.nameColumn}>
                        <Text style={styles.riskyName}>{item.name}</Text>
                        {daysLabel ? <Text style={styles.daysLeft}>{daysLabel}</Text> : null}
                      </View>
                      <Text style={[styles.severityBadge, sevStyle]}>{sev.toUpperCase()}</Text>
                      <Text style={styles.riskyValue}>{Number(item.wastage || 0).toFixed(1)} kg</Text>
                      <Text style={styles.riskyValue}>{formatCurrency(item.loss)}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.sectionHeadingWrap}>
              <Text style={styles.sectionHeading}>Vegetable price overview</Text>
              <Text style={styles.sectionHeadingHint}>Latest prices and listing dates</Text>
            </View>

            <View style={styles.priceSection}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Price overview</Text>
                  <Text style={styles.sectionSubtitle}>Latest stock prices and added dates from the backend</Text>
                </View>
                <Text style={styles.countPill}>{priceOverview.length} items</Text>
              </View>

              <View style={styles.priceGrid}>
                {priceOverview.length === 0 ? (
                  <Text style={styles.emptyText}>No stock prices available yet.</Text>
                ) : priceOverview.map(item => (
                  <View key={item._id} style={[styles.priceCard, { width: priceCardWidth }]}>
                    <Text style={styles.priceName}>{item.name}</Text>
                    <Text style={styles.priceQuantity}>{item.quantity} kg</Text>
                    <Text style={styles.priceLabel}>Added:</Text>
                    <View style={styles.priceBottom}>
                      <Text style={styles.priceDate}>{formatDate(item.addedDate)}</Text>
                      <Text style={styles.priceValue}>Rs.{'\n'}{Number(item.price || 0).toFixed(2)}/kg</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.footer}>
              <View style={styles.footerCol}>
                <Text style={styles.footerTitle}>Farmers Market Hub</Text>
                <Text style={styles.footerText}>
                  Connect local growers with customers. List fresh vegetables, track orders, and manage stock from one place.
                </Text>
              </View>
              <View style={styles.footerCol}>
                <Text style={styles.footerTitle}>Quick links</Text>
                <Text style={styles.footerText}>Dashboard · Add stock · View stock · Orders · Profile</Text>
              </View>
              <View style={styles.footerCol}>
                <Text style={styles.footerTitle}>Support</Text>
                <Text style={styles.footerText}>Hours: Mon–Sat 8:00–18:00 (LK)</Text>
                <Text style={styles.footerText}>Email: support@farmersmarkethub.lk</Text>
                <Text style={styles.footerMuted}>© {new Date().getFullYear()} Farmers Market Hub</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

const StatCard = ({ icon, label, value, subtext, tone, width }) => (
  <View style={[styles.statCard, { width, borderColor: tone }]}>
    <View style={[styles.iconTile, { backgroundColor: `${tone}18` }]}>
      <Text style={[styles.iconText, { color: tone }]}>{icon}</Text>
    </View>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, { color: tone }]}>{value}</Text>
    <Text style={styles.statSubtext}>{subtext}</Text>
    <View style={styles.cardWatermark} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f3d2e'
  },
  background: {
    flex: 1
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 28, 20, 0.48)'
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eef7f0'
  },
  loadingText: {
    marginTop: 10,
    color: '#166534',
    fontWeight: '700'
  },
  errorBanner: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(254, 226, 226, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.35)',
    maxWidth: '100%'
  },
  errorBannerText: {
    color: '#7f1d1d',
    fontWeight: '700',
    fontSize: 14
  },
  sectionHeadingWrap: {
    width: '100%',
    maxWidth: 1300,
    marginTop: 28,
    marginBottom: 8,
    paddingHorizontal: 2
  },
  sectionHeading: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900'
  },
  sectionHeadingHint: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.88)',
    fontWeight: '600',
    fontSize: 14
  },
  navBar: {
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(129, 211, 166, 0.92)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.58)'
  },
  brandIcon: {
    color: '#15803d',
    fontWeight: '900',
    fontSize: 11
  },
  brandText: {
    color: '#13713a',
    fontSize: 18,
    fontWeight: '900'
  },
  navTabs: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8
  },
  navTab: {
    minWidth: 96,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center'
  },
  navTabActive: {
    backgroundColor: '#ffffff'
  },
  navTabText: {
    color: 'rgba(255, 255, 255, 0.92)',
    fontWeight: '800'
  },
  navTabTextActive: {
    color: '#15803d'
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 30,
    paddingBottom: 0,
    alignItems: 'center'
  },
  heroPanel: {
    width: '100%',
    maxWidth: 1300,
    padding: 18,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  heroCopy: {
    flex: 1,
    paddingRight: 12
  },
  heroTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12
  },
  greeting: {
    color: '#ffffff',
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '900'
  },
  subtitle: {
    marginTop: 6,
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800'
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 5
  },
  logoutText: {
    color: '#ffffff',
    fontWeight: '900'
  },
  profilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)'
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: '900'
  },
  profileText: {
    color: '#ffffff',
    fontWeight: '900'
  },
  statsGrid: {
    width: '100%',
    maxWidth: 1300,
    marginTop: 34,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24
  },
  statCard: {
    minHeight: 160,
    borderRadius: 8,
    borderTopWidth: 4,
    backgroundColor: '#ffffff',
    padding: 18,
    overflow: 'hidden'
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  iconText: {
    fontSize: 14,
    fontWeight: '900'
  },
  statLabel: {
    color: '#374151',
    fontSize: 18,
    fontWeight: '900'
  },
  statValue: {
    marginTop: 4,
    fontSize: 25,
    fontWeight: '900'
  },
  statSubtext: {
    marginTop: 6,
    color: '#7c837f',
    fontWeight: '800'
  },
  cardWatermark: {
    position: 'absolute',
    right: -18,
    bottom: -18,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(22, 163, 74, 0.06)'
  },
  analyticsRow: {
    width: '100%',
    maxWidth: 1300,
    marginTop: 34,
    flexDirection: 'row',
    gap: 28
  },
  analyticsRowStacked: {
    flexDirection: 'column'
  },
  analyticsCard: {
    flex: 1,
    minHeight: 420,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    padding: 22
  },
  fullWidthCard: {
    width: '100%'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 22
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900'
  },
  sectionSubtitle: {
    marginTop: 6,
    color: '#6b7280',
    fontWeight: '600'
  },
  countPill: {
    color: '#166534',
    fontWeight: '900',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#eef2f7'
  },
  trendLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 22
  },
  trendLabel: {
    width: 86,
    color: '#374151',
    fontWeight: '900',
    fontSize: 12
  },
  trendBarTrack: {
    flex: 1,
    height: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden'
  },
  trendBarFill: {
    minWidth: 4,
    height: '100%',
    borderRadius: 8
  },
  trendCount: {
    width: 24,
    color: '#374151',
    fontWeight: '900'
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  tableHeadText: {
    flex: 1,
    color: '#4b5563',
    fontSize: 11,
    fontWeight: '900'
  },
  nameColumn: {
    flex: 1.4
  },
  riskyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#edf0f2'
  },
  riskyName: {
    color: '#1f2937',
    fontWeight: '900'
  },
  daysLeft: {
    marginTop: 8,
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '600'
  },
  severityBadge: {
    flex: 1,
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center'
  },
  riskyValue: {
    flex: 1,
    color: '#1f2937',
    fontWeight: '700'
  },
  emptyText: {
    color: '#64748b',
    fontWeight: '700',
    paddingVertical: 14
  },
  priceSection: {
    width: '100%',
    maxWidth: 1300,
    marginTop: 34,
    borderRadius: 0,
    backgroundColor: '#ffffff',
    padding: 22
  },
  priceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14
  },
  priceCard: {
    minHeight: 150,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#84cc16',
    backgroundColor: '#f2faef',
    padding: 16
  },
  priceName: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: '900'
  },
  priceQuantity: {
    marginTop: 18,
    color: '#4b5563',
    fontWeight: '700'
  },
  priceLabel: {
    marginTop: 14,
    color: '#7c837f',
    fontWeight: '700'
  },
  priceBottom: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 10
  },
  priceDate: {
    color: '#64748b',
    fontWeight: '700'
  },
  priceValue: {
    color: '#3f6212',
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'right'
  },
  footer: {
    width: '100%',
    marginTop: 70,
    paddingHorizontal: 22,
    paddingVertical: 32,
    backgroundColor: '#15803d',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    justifyContent: 'space-between'
  },
  footerCol: {
    minWidth: 200,
    maxWidth: 320,
    flexGrow: 1
  },
  footerTitle: {
    color: '#ecfccb',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 10
  },
  footerText: {
    color: '#ffffff',
    fontWeight: '600',
    lineHeight: 22,
    opacity: 0.95
  },
  footerMuted: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
    fontSize: 13
  }
});

export default FarmerDashboardScreen;
