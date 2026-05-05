import React, { useCallback, useContext, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { getAllDeliveries, assignAgent, getDeliveryAgents } from '../../services/deliveryService';

const VEHICLE_ICONS = {
  bike: '🏍️',
  van: '🚐',
  truck: '🚛',
  tempo: '🚚'
};

const statusColors = {
  pending: '#ca8a04',
  assigned: '#047857',
  'in-transit': '#15803d',
  delivered: '#15803d',
  cancelled: '#b91c1c'
};

const getStatusColor = (status) => statusColors[status] || '#64748b';

const formatDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '—';
  }
};

const STATUS_FILTERS = ['all', 'pending', 'assigned', 'in-transit', 'delivered', 'cancelled'];

const AdminDeliveriesScreen = ({ navigation }) => {
  const { token, logout } = useContext(AuthContext);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  // Assignment modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [agents, setAgents] = useState([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Success popup state
  const [showSuccess, setShowSuccess] = useState(false);
  const [assignedAgentName, setAssignedAgentName] = useState('');

  const load = async () => {
    try {
      if (!token) return;
      const res = await getAllDeliveries(token, { status: filter });
      setDeliveries(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      if (e?.status === 401) logout();
      setDeliveries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [token, filter])
  );

  const handleAssignPress = async (delivery) => {
    setSelectedDelivery(delivery);
    setShowModal(true);
    setAgentsLoading(true);
    try {
      // Load ALL 5 system agents — no filters, just show everyone
      const res = await getDeliveryAgents(token, {});
      setAgents(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setAgents([]);
    } finally {
      setAgentsLoading(false);
    }
  };

  const handleAssignAgent = async (agent) => {
    if (!selectedDelivery || !agent._id) return;
    setAssigning(true);
    try {
      await assignAgent(selectedDelivery._id, agent._id, token);
      setShowModal(false);
      setAssignedAgentName(agent.name);
      setShowSuccess(true);
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setAssigning(false);
      setSelectedDelivery(null);
    }
  };

  const renderDelivery = ({ item }) => {
    const shortId = item._id ? String(item._id).slice(-8).toUpperCase() : '—';
    const orderShortId = item.orderId?._id ? String(item.orderId._id).slice(-8).toUpperCase() : '—';
    const agentName = item.agentId?.name || 'Unassigned';
    const totalKg = item.orderId?.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('DeliveryDetail', { deliveryId: item._id })}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.orderId}>#{orderShortId}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}22` }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status || 'pending'}
            </Text>
          </View>
        </View>

        <Text style={styles.address} numberOfLines={2}>
          📍 {item.deliveryAddress || 'No address'}
        </Text>

        <View style={styles.cardMeta}>
          <Text style={styles.metaItem}>⚖️ {totalKg.toFixed(1)} kg</Text>
          <Text style={styles.metaItem}>👤 {agentName}</Text>
        </View>

        <Text style={styles.date}>{formatDate(item.createdAt)}</Text>

        {item.status === 'pending' && (
          <TouchableOpacity
            style={styles.assignBtn}
            onPress={() => handleAssignPress(item)}
          >
            <Text style={styles.assignBtnText}>🚗 Assign Agent</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderFilter = ({ item }) => (
    <TouchableOpacity
      style={[styles.filterChip, filter === item && styles.filterChipActive]}
      onPress={() => setFilter(item)}
    >
      <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>
        {item === 'all' ? 'All' : item}
      </Text>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#166534" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        horizontal
        data={STATUS_FILTERS}
        keyExtractor={(item) => item}
        renderItem={renderFilter}
        style={{ flexGrow: 0 }}
        contentContainerStyle={styles.filterList}
        showsHorizontalScrollIndicator={false}
      />

      <FlatList
        data={deliveries}
        keyExtractor={(item) => item._id}
        renderItem={renderDelivery}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No deliveries found</Text>
        }
      />

      {/* ── Agent Selection Modal ─────────────────────────── */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Delivery Agent</Text>
            <Text style={styles.modalSubtitle}>
              Tap an agent to assign them to this delivery
            </Text>

            {agentsLoading ? (
              <ActivityIndicator size="large" color="#166534" style={{ marginVertical: 24 }} />
            ) : agents.length === 0 ? (
              <Text style={styles.noAgents}>No agents available in the system.</Text>
            ) : (
              agents.map((agent) => {
                const profile = agent.profileDetails || {};
                const vehicleIcon = VEHICLE_ICONS[profile.vehicleType] || '🚗';
                return (
                  <TouchableOpacity
                    key={agent._id}
                    style={[styles.agentItem, assigning && styles.disabled]}
                    onPress={() => handleAssignAgent(agent)}
                    disabled={assigning}
                    activeOpacity={0.75}
                  >
                    <View style={styles.agentIconBox}>
                      <Text style={styles.agentIcon}>{vehicleIcon}</Text>
                    </View>
                    <View style={styles.agentInfo}>
                      <Text style={styles.agentName}>{agent.name}</Text>
                      <Text style={styles.agentDetail}>
                        {profile.vehicleType?.toUpperCase() || 'N/A'} · Max {profile.maxCapacityKg || 0} kg
                      </Text>
                      <Text style={styles.agentCities}>
                        📌 {profile.serviceCities?.join(', ') || 'All areas'}
                      </Text>
                    </View>
                    <Text style={styles.assignArrow}>›</Text>
                  </TouchableOpacity>
                );
              })
            )}

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => { setShowModal(false); setSelectedDelivery(null); }}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Success Popup ─────────────────────────────────── */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successBox}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successTitle}>Agent Assigned!</Text>
            <Text style={styles.successMsg}>
              <Text style={styles.successAgentName}>{assignedAgentName}</Text>
              {' '}has been successfully assigned to this delivery.
            </Text>
            <TouchableOpacity
              style={styles.successBtn}
              onPress={() => setShowSuccess(false)}
            >
              <Text style={styles.successBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterList: { paddingHorizontal: 12, paddingVertical: 10 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginRight: 8
  },
  filterChipActive: { backgroundColor: '#166534', borderColor: '#166534' },
  filterText: { color: '#64748b', fontWeight: '600', fontSize: 13, textTransform: 'capitalize' },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: 12, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#dcfce7',
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontWeight: '900', color: '#166534', fontSize: 16 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
  statusText: { fontWeight: '800', fontSize: 12, textTransform: 'capitalize' },
  address: { marginTop: 8, color: '#374151', fontSize: 14 },
  cardMeta: { flexDirection: 'row', marginTop: 6, gap: 16 },
  metaItem: { color: '#6b7280', fontSize: 13 },
  date: { marginTop: 4, color: '#9ca3af', fontSize: 12 },
  assignBtn: {
    marginTop: 12,
    backgroundColor: '#166534',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center'
  },
  assignBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 15 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxHeight: '80%'
  },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#166534', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: '#6b7280', marginBottom: 16 },

  // Agent items
  agentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dcfce7',
    backgroundColor: '#f0fdf4',
    marginBottom: 10
  },
  agentIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#bbf7d0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  agentIcon: { fontSize: 22 },
  agentInfo: { flex: 1 },
  agentName: { fontWeight: '800', color: '#111827', fontSize: 15 },
  agentDetail: { fontSize: 12, color: '#374151', marginTop: 2 },
  agentCities: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  assignArrow: { fontSize: 24, color: '#166534', fontWeight: '900' },
  disabled: { opacity: 0.5 },
  noAgents: { textAlign: 'center', color: '#9ca3af', padding: 24, fontStyle: 'italic' },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6'
  },
  cancelBtnText: { color: '#6b7280', fontWeight: '600', fontSize: 15 },

  // Success popup
  successBox: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    width: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10
  },
  successIcon: { fontSize: 52, marginBottom: 12 },
  successTitle: { fontSize: 22, fontWeight: '900', color: '#166534', marginBottom: 8 },
  successMsg: { fontSize: 15, color: '#374151', textAlign: 'center', lineHeight: 22 },
  successAgentName: { fontWeight: '800', color: '#166534' },
  successBtn: {
    marginTop: 20,
    backgroundColor: '#166534',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 12
  },
  successBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 }
});

export default AdminDeliveriesScreen;
