import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { RootState } from '../redux/store';
import { RootStackParamList } from '../types';
import { formatDate, getCurrentChallengeDay, getChallengeStatus } from '../utils/dateUtils';

type TaskAnalyticsRouteProp = RouteProp<RootStackParamList, 'TaskAnalytics'>;

const { width } = Dimensions.get('window');

export default function TaskAnalyticsScreen() {
  const route = useRoute<TaskAnalyticsRouteProp>();
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);

  const { challengeId } = route.params;

  const challenge = useSelector((state: RootState) =>
    state.challenges.data.find(c => c.id === challengeId)
  );

  const participants = useSelector((state: RootState) =>
    state.participants.data.filter(p => p.challengeId === challengeId)
  );

  const checkins = useSelector((state: RootState) =>
    state.checkins.data.filter(c => c.challengeId === challengeId)
  );

  if (!challenge) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFound, { color: colors.text }]}>
          Challenge not found
        </Text>
      </View>
    );
  }

  const status = getChallengeStatus(
    challenge.startDate,
    challenge.endDate || challenge.startDate
  );
  const currentDay =
    status === 'active' ? getCurrentChallengeDay(challenge.startDate) : challenge.durationDays;

  // Calculate stats
  const totalCheckins = checkins.length;
  const totalPossibleCheckins = participants.length * currentDay;
  const completionRate =
    totalPossibleCheckins > 0
      ? Math.round((totalCheckins / totalPossibleCheckins) * 100)
      : 0;

  const totalPointsEarned = checkins.reduce(
    (sum, c) => sum + c.pointsEarned,
    0
  );
  const perfectDays = checkins.filter(c => c.allHabitsCompleted).length;

  // Habit completion breakdown
  const habitStats = challenge.habits.map((habit, index) => {
    const completions = checkins.filter(
      c => c.habitsCompleted[index] === true
    ).length;
    const rate =
      totalCheckins > 0 ? Math.round((completions / totalCheckins) * 100) : 0;
    return { habit, completions, rate };
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Challenge info */}
        <Text style={[styles.challengeName, { color: colors.text }]}>
          {challenge.name}
        </Text>
        <Text style={[styles.dateRange, { color: colors.textSecondary }]}>
          {formatDate(challenge.startDate)} -{' '}
          {formatDate(challenge.endDate || challenge.startDate)}
        </Text>

        {/* Overview stats */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {completionRate}%
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Completion Rate
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {totalPointsEarned}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Points Earned
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statValue, { color: colors.warning }]}>
              {perfectDays}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Perfect Days
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {participants.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Participants
            </Text>
          </View>
        </View>

        {/* Habit breakdown */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Habit Completion
          </Text>
          {habitStats.map((stat, index) => (
            <View
              key={index}
              style={[styles.habitRow, { backgroundColor: colors.surface }]}
            >
              <View style={styles.habitInfo}>
                <Text
                  style={[styles.habitName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {stat.habit}
                </Text>
                <Text
                  style={[styles.habitMeta, { color: colors.textSecondary }]}
                >
                  {stat.completions} completions
                </Text>
              </View>
              <View style={styles.habitProgress}>
                <View
                  style={[
                    styles.progressBar,
                    { backgroundColor: colors.border },
                  ]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: colors.primary,
                        width: `${stat.rate}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.habitRate, { color: colors.primary }]}>
                  {stat.rate}%
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Progress over time - placeholder */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Progress Over Time
          </Text>
          <View
            style={[styles.chartPlaceholder, { backgroundColor: colors.surface }]}
          >
            <Ionicons
              name="bar-chart-outline"
              size={48}
              color={colors.textTertiary}
            />
            <Text
              style={[styles.chartPlaceholderText, { color: colors.textSecondary }]}
            >
              Chart visualization coming soon
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  challengeName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dateRange: {
    fontSize: 14,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '47%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  habitRow: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  habitInfo: {
    marginBottom: 8,
  },
  habitName: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  habitMeta: {
    fontSize: 12,
  },
  habitProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  habitRate: {
    fontSize: 14,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  chartPlaceholder: {
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartPlaceholderText: {
    marginTop: 12,
    fontSize: 14,
  },
  notFound: {
    flex: 1,
    textAlign: 'center',
    marginTop: 100,
  },
});
