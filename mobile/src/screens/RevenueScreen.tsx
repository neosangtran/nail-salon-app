import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart } from 'react-native-chart-kit';
import type { RevenuePeriod } from '../hooks/useRevenue';
import { useRevenueSummary, useDailyRevenue } from '../hooks/useRevenue';
import KPICard from '../components/KPICard';
import LoadingView from '../components/LoadingView';
import { formatCurrency, getLast6MonthsRange, getCurrentMonthRange } from '../utils/format';

type PeriodOption = { label: string; value: RevenuePeriod };

const PERIOD_OPTIONS: PeriodOption[] = [
  { label: 'Today', value: 'today' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function RevenueScreen() {
  const [period, setPeriod] = useState<RevenuePeriod>('month');

  const { data: summary, isLoading } = useRevenueSummary(period);
  const { startDate, endDate } = getLast6MonthsRange();
  const { data: dailyData } = useDailyRevenue(startDate, endDate);

  // Build chart data from daily revenue - aggregate by month
  const chartData = buildMonthlyChartData(dailyData?.dailyRevenue ?? []);

  if (isLoading) return <LoadingView message="Loading revenue data..." />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Period Selector */}
        <View style={styles.periodContainer}>
          {PERIOD_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.periodChip, period === opt.value && styles.periodChipActive]}
              onPress={() => setPeriod(opt.value)}
            >
              <Text
                style={[
                  styles.periodChipText,
                  period === opt.value && styles.periodChipTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* KPI Cards */}
        <View style={styles.kpiRow}>
          <KPICard
            title="Total Revenue"
            value={formatCurrency(summary?.totalRevenue ?? 0)}
            icon="dollar-sign"
            iconColor="#059669"
            iconBg="#d1fae5"
          />
          <View style={{ width: 12 }} />
          <KPICard
            title="Services"
            value={formatCurrency(summary?.totalServices ?? summary?.serviceRevenue ?? 0)}
            icon="scissors"
            iconColor="#7c3aed"
            iconBg="#ede9fe"
          />
        </View>

        <View style={[styles.kpiRow, { marginTop: 12 }]}>
          <KPICard
            title="Tips"
            value={formatCurrency(summary?.totalTips ?? summary?.tips ?? 0)}
            icon="gift"
            iconColor="#f59e0b"
            iconBg="#fef3c7"
          />
          <View style={{ width: 12 }} />
          <KPICard
            title="Appointments"
            value={String(summary?.appointmentCount ?? 0)}
            icon="calendar"
            iconColor="#e11d48"
            iconBg="#fce7f3"
          />
        </View>

        {/* Bar Chart */}
        {chartData.labels.length > 0 ? (
          <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>Revenue Last 6 Months</Text>
            <View style={styles.chartContainer}>
              <BarChart
                data={{
                  labels: chartData.labels,
                  datasets: [{ data: chartData.values }],
                }}
                width={SCREEN_WIDTH - 32}
                height={220}
                yAxisLabel="$"
                yAxisSuffix=""
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(225, 29, 72, ${opacity})`,
                  labelColor: () => '#6b7280',
                  style: { borderRadius: 12 },
                  barPercentage: 0.6,
                  propsForBackgroundLines: {
                    strokeDasharray: '4',
                    stroke: '#f3f4f6',
                  },
                }}
                style={{ borderRadius: 12 }}
                showValuesOnTopOfBars={false}
                fromZero
              />
            </View>
          </View>
        ) : null}

        {/* Payment Breakdown */}
        {summary?.byPaymentMethod && Object.keys(summary.byPaymentMethod).length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Methods</Text>
            <View style={styles.infoCard}>
              {Object.entries(summary.byPaymentMethod).map(([method, amount]) => (
                <View key={method} style={styles.paymentRow}>
                  <Text style={styles.paymentMethod}>{method}</Text>
                  <Text style={styles.paymentAmount}>{formatCurrency(amount as number)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

interface DailyPoint {
  date: string;
  total: number;
}

function buildMonthlyChartData(dailyRevenue: DailyPoint[]): { labels: string[]; values: number[] } {
  const monthMap = new Map<string, number>();

  for (const point of dailyRevenue) {
    const d = new Date(point.date);
    const key = d.toLocaleDateString('en-US', { month: 'short' });
    monthMap.set(key, (monthMap.get(key) ?? 0) + point.total);
  }

  const labels = Array.from(monthMap.keys());
  const values = labels.map((l) => monthMap.get(l) ?? 0);

  return { labels, values };
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 32 },
  periodContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  periodChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  periodChipActive: { backgroundColor: '#e11d48', borderColor: '#e11d48' },
  periodChipText: { fontSize: 13, fontWeight: '500', color: '#6b7280' },
  periodChipTextActive: { color: '#ffffff' },
  kpiRow: { flexDirection: 'row' },
  chartSection: { marginTop: 20, marginBottom: 8 },
  chartTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  chartContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 10 },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  paymentMethod: { fontSize: 13, color: '#374151', fontWeight: '500' },
  paymentAmount: { fontSize: 13, color: '#059669', fontWeight: '600' },
});
