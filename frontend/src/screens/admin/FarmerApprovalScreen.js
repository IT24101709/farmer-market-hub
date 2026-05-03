import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import getEnvVars from '../../config';

const FarmerApprovalScreen = ({ navigation }) => {
  const [pendingFarmers, setPendingFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const { token } = useContext(AuthContext);
  const API_URL = `${getEnvVars().apiUrl}/auth`;

  useEffect(() => {
    fetchPendingFarmers();
  }, []);

  const fetchPendingFarmers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/admin/pending-farmers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch pending farmers');
      }

      setPendingFarmers(data);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPendingFarmers();
    setRefreshing(false);
  };

  const handleApproveFarmer = async (farmerId) => {
    try {
      setProcessingId(farmerId);
      const response = await fetch(`${API_URL}/admin/approve-farmer/${farmerId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to approve farmer');
      }

      Alert.alert('Success', `Farmer ${data.farmer.name} has been approved!`);
      await fetchPendingFarmers();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectFarmer = async (farmerId) => {
    if (!rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection');
      return;
    }

    try {
      setProcessingId(farmerId);
      const response = await fetch(`${API_URL}/admin/reject-farmer/${farmerId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: rejectionReason })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reject farmer');
      }

      Alert.alert('Success', 'Farmer account has been rejected and deleted');
      setApprovalModalVisible(false);
      setRejectionReason('');
      setSelectedFarmer(null);
      await fetchPendingFarmers();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const renderFarmerItem = ({ item }) => (
    <View style={styles.farmerCard}>
      <View style={styles.farmerHeader}>
        <View style={styles.farmerInfo}>
          <Text style={styles.farmerName}>{item.name}</Text>
          <Text style={styles.farmerEmail}>{item.email}</Text>
        </View>
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingText}>PENDING</Text>
        </View>
      </View>

      <View style={styles.farmerDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Role:</Text>
          <Text style={styles.detailValue}>{item.role}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Registered:</Text>
          <Text style={styles.detailValue}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.approveBtn, processingId === item._id && styles.btnDisabled]}
          onPress={() => handleApproveFarmer(item._id)}
          disabled={processingId === item._id}
        >
          {processingId === item._id ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.approveBtnText}>✓ Approve</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.rejectBtn, processingId === item._id && styles.btnDisabled]}
          onPress={() => {
            setSelectedFarmer(item);
            setApprovalModalVisible(true);
          }}
          disabled={processingId === item._id}
        >
          <Text style={styles.rejectBtnText}>✕ Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#15803d" />
        <Text style={styles.loadingText}>Loading pending farmers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Farmer Approvals</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{pendingFarmers.length}</Text>
        </View>
      </View>

      {pendingFarmers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>✓</Text>
          <Text style={styles.emptyTitle}>All Clear!</Text>
          <Text style={styles.emptyText}>
            All farmer applications have been reviewed.
          </Text>
        </View>
      ) : (
        <FlatList
          data={pendingFarmers}
          renderItem={renderFarmerItem}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Rejection Modal */}
      <Modal
        visible={approvalModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setApprovalModalVisible(false);
          setRejectionReason('');
          setSelectedFarmer(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Application</Text>
            <Text style={styles.modalSubtitle}>
              {selectedFarmer?.name}
            </Text>

            <View style={styles.reasonBox}>
              <Text style={styles.reasonLabel}>Reason for rejection *</Text>
              <TextInput
                style={styles.reasonInput}
                placeholder="Enter reason (e.g., incomplete documents, suspicious activity)"
                value={rejectionReason}
                onChangeText={setRejectionReason}
                multiline
                numberOfLines={4}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setApprovalModalVisible(false);
                  setRejectionReason('');
                  setSelectedFarmer(null);
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.rejectConfirmBtn,
                  !rejectionReason.trim() && styles.btnDisabled
                ]}
                onPress={() =>
                  handleRejectFarmer(selectedFarmer?._id)
                }
                disabled={!rejectionReason.trim() || processingId === selectedFarmer?._id}
              >
                {processingId === selectedFarmer?._id ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.rejectConfirmBtnText}>Reject</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2d5016',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  badge: {
    backgroundColor: '#ff6b6b',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  farmerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
  },
  farmerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  farmerInfo: {
    flex: 1,
  },
  farmerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  farmerEmail: {
    fontSize: 13,
    color: '#666',
  },
  pendingBadge: {
    backgroundColor: '#fff3cd',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pendingText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#856404',
  },
  farmerDetails: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  approveBtn: {
    flex: 1,
    backgroundColor: '#15803d',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#ff6b6b',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  reasonBox: {
    marginBottom: 16,
  },
  reasonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    backgroundColor: '#fafafa',
    color: '#333',
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectConfirmBtn: {
    flex: 1,
    backgroundColor: '#ff6b6b',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectConfirmBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default FarmerApprovalScreen;
