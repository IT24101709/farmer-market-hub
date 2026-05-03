import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Alert
} from 'react-native';

const PaymentReceiptScreen = ({ route, navigation }) => {
  const { orderId, totalAmount, paymentMethod, customerName } = route.params || {};

  const handlePrint = () => {
    if (Platform.OS === 'web') {
      window.print();
    } else {
      Alert.alert('Print Receipt', 'Printing receipt to connected printer...');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.receiptCard}>
        <View style={styles.header}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successText}>Payment Successful</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.receiptBody}>
          <Text style={styles.storeName}>Farmers Market Hub</Text>
          <Text style={styles.receiptTitle}>OFFICIAL RECEIPT</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>{new Date().toLocaleString()}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Order ID:</Text>
            <Text style={styles.value}>{orderId ? String(orderId).slice(-8).toUpperCase() : 'N/A'}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Customer:</Text>
            <Text style={styles.value}>{customerName || 'Guest'}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Method:</Text>
            <Text style={styles.value}>{paymentMethod || 'CARD'}</Text>
          </View>

          <View style={styles.dividerDashed} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL PAID</Text>
            <Text style={styles.totalValue}>LKR {Number(totalAmount || 0).toFixed(2)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.printBtn} onPress={handlePrint}>
          <Text style={styles.printBtnText}>🖨️ Print Receipt</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.homeBtn} 
          onPress={() => navigation.navigate('CustomerOrderDetail', { orderId })}
        >
          <Text style={styles.homeBtnText}>Track Order Status →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    padding: 20,
    justifyContent: 'center'
  },
  receiptCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 24
  },
  header: {
    alignItems: 'center',
    marginBottom: 16
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 8
  },
  successText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#16a34a'
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 16
  },
  dividerDashed: {
    height: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    borderStyle: 'dashed',
    marginVertical: 16
  },
  receiptBody: {
    alignItems: 'center'
  },
  storeName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4
  },
  receiptTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 2,
    marginBottom: 24
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12
  },
  label: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500'
  },
  value: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '700'
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginTop: 8
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a'
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#16a34a'
  },
  actionButtons: {
    gap: 12
  },
  printBtn: {
    backgroundColor: '#e2e8f0',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  printBtnText: {
    color: '#334155',
    fontSize: 16,
    fontWeight: '800'
  },
  homeBtn: {
    backgroundColor: '#15803d',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  homeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800'
  }
});

export default PaymentReceiptScreen;
