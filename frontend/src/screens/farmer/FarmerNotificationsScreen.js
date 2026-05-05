import React, { useContext, useCallback } from 'react';
import {
  ImageBackground,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { NotificationContext } from '../../context/NotificationContext';
import FarmerNavBar from '../../components/FarmerNavBar';

const FARM_IMAGE = {
  uri: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1800&q=80'
};

const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('en-GB');
};

const FarmerNotificationsScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const { notifications, refreshNotifications, markAsRead, markAllAsRead, unreadCount } =
    useContext(NotificationContext);

  useFocusEffect(
    useCallback(() => {
      refreshNotifications();
    }, [refreshNotifications])
  );

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground source={FARM_IMAGE} style={styles.background} resizeMode="cover">
        <View style={styles.backdrop}>
          <FarmerNavBar navigation={navigation} currentScreen="FarmerNotifications" />

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={false} onRefresh={refreshNotifications} />}
          >
            <View style={styles.heroPanel}>
              <View style={styles.heroCopy}>
                <View style={styles.heroTitleRow}>
                  <Text style={styles.greeting}>Notifications</Text>
                  {unreadCount > 0 && (
                    <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
                      <Text style={styles.markAllText}>Mark All as Read</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.subtitle}>Updates on your stock, orders, and system alerts.</Text>
              </View>
            </View>

            <View style={styles.notificationsContainer}>
              {(!notifications || notifications.length === 0) ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>You have no notifications at the moment.</Text>
                </View>
              ) : (
                notifications.map((item) => (
                  <View key={item._id} style={[styles.notificationCard, !item.read && styles.unreadCard]}>
                    <View style={styles.notificationHeader}>
                      <Text style={[styles.notificationTitle, !item.read && styles.unreadText]}>{item.title}</Text>
                      <Text style={styles.notificationDate}>{formatDate(item.createdAt)}</Text>
                    </View>
                    <Text style={styles.notificationBody}>{item.body}</Text>
                    
                    {!item.read && (
                      <TouchableOpacity 
                        style={styles.markReadButton} 
                        onPress={() => markAsRead(item._id)}
                      >
                        <Text style={styles.markReadButtonText}>Mark as read</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </View>

          </ScrollView>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

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
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 30,
    paddingBottom: 40,
    alignItems: 'center'
  },
  heroPanel: {
    width: '100%',
    maxWidth: 1000,
    padding: 18,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24
  },
  heroCopy: {
    flex: 1,
  },
  heroTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 16
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
  markAllButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 5
  },
  markAllText: {
    color: '#ffffff',
    fontWeight: '900'
  },
  notificationsContainer: {
    width: '100%',
    maxWidth: 1000,
    gap: 16
  },
  emptyCard: {
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 16,
    color: '#4b5563',
    fontWeight: '600'
  },
  notificationCard: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    borderLeftWidth: 6,
    borderColor: '#9ca3af',
  },
  unreadCard: {
    borderColor: '#3b82f6',
    backgroundColor: '#ffffff',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  notificationTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginRight: 12
  },
  unreadText: {
    fontWeight: '900',
    color: '#111827'
  },
  notificationDate: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600'
  },
  notificationBody: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22
  },
  markReadButton: {
    alignSelf: 'flex-start',
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe'
  },
  markReadButtonText: {
    color: '#2563eb',
    fontWeight: '700',
    fontSize: 13
  }
});

export default FarmerNotificationsScreen;
