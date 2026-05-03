import React, { useCallback, useContext, useMemo, useState } from 'react';
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
  const [showModal, setShowModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [agents, setAgents] = useState([]);
  const [assigning, setAssigning] = useState(false);

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

  const filteredDeliveries = useMemo(() => {
    return deliveries;
  }, [deliveries]);

  const handleAssignPress = (delivery) => {
    setSelectedDelivery(delivery);
    loadAgents();
    setShowModal(true);
  };

  const [agentFilters, setAgentFilters] = useState({ minKg: 0, vehicleType: '', city: '' });

  const loadAgents = async () => {
    try {
      // Compute filters from delivery
      const totalWeight = selectedDelivery?.orderId?.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
      const addressCity = extractCity(selectedDelivery?.deliveryAddress || '');
      
      const filters = {
        minKg: Math.ceil(totalWeight),
        city: addressCity,
        // vehicleType auto or manual
      };

      console.log('Loading agents with filters:', filters);
      
      const res = await getDeliveryAgents(token, filters);
      setAgents(Array.isArray(res.data) ? res.data : []);
      setAgentFilters(filters);
    } catch (e) {
      console.error(e);
      setAgents([]);
    }
  };

  const extractCity = (address) => {
    if (!address) return '';
    const cities = ['Colombo', 'Kandy', 'Galle', 'Jaffna', 'Matara'];
    const upper = address.toUpperCase();
    for (let city of cities) {
      if (upper.includes(city.toUpperCase())) return city;
    }
    return '';
  };


  const handleAssignAgent = async (agentId) => {
    if (!selectedDelivery || !agentId) return;
    setAssigning(true);
    try {
      await assignAgent(selectedDelivery._id, agentId, token);
      setShowModal(false);
      setSelectedDelivery(null);
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setAssigning(false);
    }
  };

  const renderDelivery = ({ item }) => {
    const shortId = item._id ? String(item._id).slice(-8).toUpperCase() : '—';
    const orderShortId = item.orderId?._id ? String(item.orderId._id).slice(-8).toUpperCase() : '—';
    const agentName = item.agentId?.name || 'Unassigned';

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
          {item.deliveryAddress || 'No address'}
        </Text>

        <Text style={styles.agent}>Agent: {agentName}</Text>
        
        <Text style={styles.date}>{formatDate(item.createdAt)}</Text>

        {item.status === 'pending' && (
          <TouchableOpacity
            style={styles.assignBtn}
            onPress={() => handleAssignPress(item)}
          >
            <Text style={styles.assignBtnText}>Assign Agent</Text>
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
        data={filteredDeliveries}
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

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Delivery Agent</Text>
            
            {agents.length === 0 ? (
              <Text style={styles.noAgents}>No suitable agents found for this delivery</Text>
            ) : (
              agents.map((agent) => {
                const profile = agent.profileDetails || {};
                return (
                  <TouchableOpacity
                    key={agent._id}
                    style={styles.agentItem}
                    onPress={() => handleAssignAgent(agent._id)}
                    disabled={assigning}
                  >
                    <Text style={styles.agentName}>{agent.name}</Text>
                    <Text style={styles.agentEmail}>{agent.email}</Text>
                    {profile.vehicleType && (
                      <Text style={styles.agentDetail}>Vehicle: {profile.vehicleType}</Text>
                    )}
                    <Text style={styles.agentDetail}>Max: {profile.maxCapacityKg || 0}kg</Text>
                    {profile.serviceCities?.length > 0 && (
                      <Text style={styles.agentCities}>{profile.serviceCities.join(', ')}</Text>
                    )}
                  </TouchableOpacity>
                );
              })
            )}


            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff8f0' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterList: { paddingHorizontal: 12, paddingVertical: 8 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ffe0b2',
    marginRight: 8
  },
  filterChipActive: { backgroundColor: '#166534', borderColor: '#166534' },
  filterText: { color: '#757575', fontWeight: '600', fontSize: 13, textTransform: 'capitalize' },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: 12, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#ffe0b2'
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontWeight: '900', color: '#e65100', fontSize: 16 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
  statusText: { fontWeight: '800', fontSize: 12, textTransform: 'capitalize' },
  address: { marginTop: 8, color: '#424242', fontSize: 14 },
  agent: { marginTop: 6, color: '#757575', fontSize: 13 },
  date: { marginTop: 4, color: '#9e9e9e', fontSize: 12 },
  assignBtn: {
    marginTop: 12,
    backgroundColor: '#e8f5e9',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  assignBtnText: { color: '#2e7d32', fontWeight: '700' },
  noAgents: { textAlign: 'center', color: '#757575', padding: 20, fontStyle: 'italic' },
  empty: { textAlign: 'center', color: '#757575', marginTop: 40 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '70%'
  },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16, color: '#e65100' },
  agentItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  agentName: { fontWeight: '700', color: '#333' },
  agentEmail: { fontSize: 12, color: '#757575' },
  agentDetail: { fontSize: 12, color: '#424242', marginTop: 2 },
  agentCities: { fontSize: 11, color: '#666', marginTop: 2 },
  closeBtn: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center'
  },
  closeBtnText: { color: '#757575', fontWeight: '600' }
});


export default AdminDeliveriesScreen;
