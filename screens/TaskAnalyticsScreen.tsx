import React, { useContext, useMemo, useState } from 'react';
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
import { useAuth } from '../context/AuthContext';
import { RootState } from '../redux/store';
import { RootStackParamList } from '../types';
import SegmentedControl from '../components/SegmentedControl';
import {
  formatDate,
  getCurrentChallengeDay,
  getChallengeStatus,
  getDateRange,
  addDays,
  getToday,
  subtractDays,
} from '../utils/dateUtils';

type TaskAnalyticsRouteProp = RouteProp<RootStackParamList, 'TaskAnalytics'>;

const { width } = Dimensions.get('window');

const MIN_BAR_WIDTH = 16;
const CHART_GAP = 2;
const AXIS_LABEL_WIDTH = 60;

type StatsScope = 'mine' | 'all';

export default function TaskAnalyticsScreen() {
  const route = useRoute<TaskAnalyticsRouteProp>();
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const { user } = useAuth();

  const { challengeId } = route.params;

  const challenge = useSelector((state: RootState) =>
    state.challenges.data.find(c => c.id === challengeId)
  );

  const participantsData = useSelector((state: RootState) => state.participants.data);
  const checkinsData = useSelector((state: RootState) => state.checkins.data);

  const allParticipants = useMemo(
    () => participantsData.filter(p => p.challengeId === challengeId),
    [participantsData, challengeId]
  );

  const allCheckins = useMemo(
    () => checkinsData.filter(c => c.challengeId === challengeId),
    [checkinsData, challengeId]
  );

  const myParticipant = useMemo(
    () => (user ? allParticipants.find(p => p.userId === user.id) : undefined),
    [allParticipants, user]
  );
  const isParticipant = !!myParticipant;

  const [scope, setScope] = useState<StatsScope>(isParticipant ? 'mine' : 'all');

  const participants = useMemo(
    () => (scope === 'mine' && myParticipant ? [myParticipant] : allParticipants),
    [scope, myParticipant, allParticipants]
  );

  const checkins = useMemo(
    () =>
      scope === 'mine' && user
        ? allCheckins.filter(c => c.userId === user.id)
        : allCheckins,
    [scope, user, allCheckins]
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
  const activeDayRate =
    totalPossibleCheckins > 0
      ? Math.round((totalCheckins / totalPossibleCheckins) * 100)
      : 0;

  const totalHabitsCompleted = checkins.reduce(
    (sum, c) => sum + (c.habitsCompleted?.filter(Boolean).length ?? 0),
    0
  );
  const totalPossibleHabits =
    participants.length * currentDay * challenge.habits.length;
  const habitRate =
    totalPossibleHabits > 0
      ? Math.round((totalHabitsCompleted / totalPossibleHabits) * 100)
      : 0;

  const totalPointsEarned = checkins.reduce(
    (sum, c) => sum + c.pointsEarned,
    0
  );
  const perfectDays = checkins.filter(c => c.allHabitsCompleted).length;

  // Drop-off: participants who checked in within the last 3 days
  const activeNowCount = useMemo(() => {
    const cutoff = subtractDays(getToday(), 2);
    const latestByUser = new Map<string, string>();
    for (const c of allCheckins) {
      const prev = latestByUser.get(c.userId);
      if (!prev || c.checkinDate > prev) latestByUser.set(c.userId, c.checkinDate);
    }
    return allParticipants.filter(p => {
      const latest = latestByUser.get(p.userId);
      return latest != null && latest >= cutoff;
    }).length;
  }, [allParticipants, allCheckins]);

  // User's rank among all participants (by total points)
  const myRank = useMemo(() => {
    if (!myParticipant) return null;
    const sorted = [...allParticipants].sort(
      (a, b) => b.totalPoints - a.totalPoints
    );
    const idx = sorted.findIndex(p => p.userId === myParticipant.userId);
    return idx >= 0 ? idx + 1 : null;
  }, [allParticipants, myParticipant]);

  // Progress over time — daily completion rate across all participants
  const dailyProgress = useMemo(() => {
    const endDay = Math.max(1, currentDay);
    const rangeEnd = addDays(challenge.startDate, endDay - 1);
    const days = getDateRange(challenge.startDate, rangeEnd);
    const habitsPerParticipant = challenge.habits.length;
    const possiblePerDay = Math.max(participants.length * habitsPerParticipant, 1);

    return days.map((date, idx) => {
      const dayCheckins = checkins.filter(c => c.checkinDate === date);
      const completed = dayCheckins.reduce(
        (sum, c) => sum + (c.habitsCompleted?.filter(Boolean).length ?? 0),
        0
      );
      const rate = participants.length > 0 ? completed / possiblePerDay : 0;
      return { date, day: idx + 1, rate, completed };
    });
  }, [challenge.startDate, challenge.habits.length, currentDay, participants.length, checkins]);

  const hasProgressData = dailyProgress.some(d => d.completed > 0);
  const avgRate =
    dailyProgress.length > 0
      ? dailyProgress.reduce((sum, d) => sum + d.rate, 0) / dailyProgress.length
      : 0;
  const bestDay = dailyProgress.reduce(
    (best, d) => (d.rate > best.rate ? d : best),
    dailyProgress[0] ?? { day: 0, rate: 0, date: '', completed: 0 }
  );

  // Tick labels: first, last, and ~two evenly spaced in between (max 4 labels)
  const tickIndices = useMemo(() => {
    const n = dailyProgress.length;
    if (n === 0) return [];
    if (n === 1) return [0];
    if (n <= 4) return dailyProgress.map((_, i) => i);
    return [0, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1];
  }, [dailyProgress]);

  // Habit completion breakdown — sorted easiest → hardest
  const habitStats = useMemo(() => {
    const stats = challenge.habits.map((habit, index) => {
      const completions = checkins.filter(
        c => c.habitsCompleted[index] === true
      ).length;
      const rate =
        totalCheckins > 0 ? Math.round((completions / totalCheckins) * 100) : 0;
      return { habit, completions, rate };
    });
    return [...stats].sort((a, b) => b.rate - a.rate);
  }, [challenge.habits, checkins, totalCheckins]);

  const showHabitExtremes =
    habitStats.length >= 2 && habitStats[0].rate !== habitStats[habitStats.length - 1].rate;

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

        {isParticipant && (
          <View style={styles.scopeToggle}>
            <SegmentedControl<StatsScope>
              options={[
                { value: 'mine', label: 'My Stats' },
                { value: 'all', label: 'All Stats' },
              ]}
              value={scope}
              onValueChange={setScope}
              accessibilityLabel="Stats scope"
            />
          </View>
        )}

        {/* Overview stats */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text
              style={[styles.statValue, { color: colors.primary }]}
              adjustsFontSizeToFit
              numberOfLines={1}
              minimumFontScale={0.7}
            >
              {habitRate}%
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Habit Rate
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text
              style={[styles.statValue, { color: colors.success }]}
              adjustsFontSizeToFit
              numberOfLines={1}
              minimumFontScale={0.7}
            >
              {activeDayRate}%
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Active Days
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text
              style={[styles.statValue, { color: colors.warning }]}
              adjustsFontSizeToFit
              numberOfLines={1}
              minimumFontScale={0.7}
            >
              {perfectDays}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Perfect Days
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text
              style={[styles.statValue, { color: colors.text }]}
              adjustsFontSizeToFit
              numberOfLines={1}
              minimumFontScale={0.7}
            >
              {totalPointsEarned}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Points Earned
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text
              style={[styles.statValue, { color: colors.text }]}
              adjustsFontSizeToFit
              numberOfLines={1}
              minimumFontScale={0.7}
            >
              {scope === 'mine' && myParticipant
                ? myParticipant.currentStreak
                : allParticipants.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {scope === 'mine' ? 'Current Streak' : 'Participants'}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text
              style={[styles.statValue, { color: colors.text }]}
              adjustsFontSizeToFit
              numberOfLines={1}
              minimumFontScale={0.7}
            >
              {scope === 'mine'
                ? myRank != null
                  ? `#${myRank}/${allParticipants.length}`
                  : '—'
                : `${activeNowCount}/${allParticipants.length}`}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {scope === 'mine' ? 'Your Rank' : 'Active Now'}
            </Text>
          </View>
        </View>

        {/* Habit breakdown */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Habit Completion
          </Text>
          {habitStats.map((stat, index) => {
            const tag = showHabitExtremes
              ? index === 0
                ? 'Easiest'
                : index === habitStats.length - 1
                  ? 'Hardest'
                  : null
              : null;
            return (
            <View
              key={index}
              style={[styles.habitRow, { backgroundColor: colors.surface }]}
            >
              <View style={styles.habitInfo}>
                <View style={styles.habitNameRow}>
                  <Text
                    style={[styles.habitName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {stat.habit}
                  </Text>
                  {tag && (
                    <View
                      style={[
                        styles.habitPill,
                        { backgroundColor: colors.primary + '22' },
                      ]}
                    >
                      <Text
                        style={[styles.habitPillText, { color: colors.primary }]}
                      >
                        {tag}
                      </Text>
                    </View>
                  )}
                </View>
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
            );
          })}
        </View>

        {/* Progress over time */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Progress Over Time
          </Text>
          {hasProgressData ? (
            <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
              <View style={styles.chartSummaryRow}>
                <View style={styles.chartSummaryItem}>
                  <Text
                    style={[
                      styles.chartSummaryLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Avg daily
                  </Text>
                  <Text
                    style={[styles.chartSummaryValue, { color: colors.text }]}
                  >
                    {Math.round(avgRate * 100)}%
                  </Text>
                </View>
                <View style={styles.chartSummaryItem}>
                  <Text
                    style={[
                      styles.chartSummaryLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Best day
                  </Text>
                  <Text
                    style={[styles.chartSummaryValue, { color: colors.text }]}
                  >
                    Day {bestDay.day} · {Math.round(bestDay.rate * 100)}%
                  </Text>
                </View>
              </View>

              <ChartBody
                dailyProgress={dailyProgress}
                tickIndices={tickIndices}
                bestDay={bestDay}
                colors={colors}
              />
            </View>
          ) : (
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
                No activity yet — check-ins will appear here.
              </Text>
            </View>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

interface ChartBodyProps {
  dailyProgress: { date: string; day: number; rate: number; completed: number }[];
  tickIndices: number[];
  bestDay: { date: string; day: number; rate: number; completed: number };
  colors: ReturnType<typeof getColors>;
}

function ChartBody({ dailyProgress, tickIndices, bestDay, colors }: ChartBodyProps) {
  const [availableWidth, setAvailableWidth] = useState(0);
  const n = dailyProgress.length;
  const stride = n > 0 ? Math.max(MIN_BAR_WIDTH + CHART_GAP, availableWidth / n) : 0;
  const barWidth = Math.max(MIN_BAR_WIDTH, stride - CHART_GAP);
  const contentWidth = n * stride;
  const scrollable = contentWidth > availableWidth + 0.5;

  return (
    <View
      onLayout={e => setAvailableWidth(e.nativeEvent.layout.width)}
      style={{ width: '100%' }}
    >
      {availableWidth > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={scrollable}
          scrollEnabled={scrollable}
        >
          <View style={{ width: contentWidth }}>
            <View style={styles.chartArea}>
              {dailyProgress.map((d, idx) => {
                const heightPct = Math.max(d.rate * 100, d.rate > 0 ? 4 : 0);
                return (
                  <View
                    key={d.date}
                    style={[
                      styles.chartBarColumn,
                      { width: barWidth, marginRight: idx === n - 1 ? 0 : CHART_GAP },
                    ]}
                  >
                    <View style={styles.chartBarTrack}>
                      <View
                        style={[
                          styles.chartBar,
                          {
                            height: `${heightPct}%`,
                            backgroundColor:
                              idx === bestDay.day - 1 ? colors.success : colors.primary,
                            opacity: d.rate > 0 ? 1 : 0.15,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={[styles.chartAxisRow, { width: contentWidth }]}>
              {tickIndices.map(idx => (
                <Text
                  key={idx}
                  numberOfLines={1}
                  style={[
                    styles.chartAxisLabel,
                    {
                      color: colors.textTertiary,
                      left: idx * stride + stride / 2 - AXIS_LABEL_WIDTH / 2,
                      width: AXIS_LABEL_WIDTH,
                    },
                  ]}
                >
                  {formatDate(dailyProgress[idx].date, 'MMM D')}
                </Text>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : (
        <View style={{ height: 120 + 24 }} />
      )}
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
    marginBottom: 20,
  },
  scopeToggle: {
    marginBottom: 16,
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
    fontSize: 26,
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
  habitNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  habitName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  habitPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  habitPillText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
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
    textAlign: 'center',
  },
  chartCard: {
    padding: 16,
    borderRadius: 12,
  },
  chartSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  chartSummaryItem: {
    flex: 1,
  },
  chartSummaryLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  chartSummaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
  },
  chartBarColumn: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  chartBarTrack: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  chartBar: {
    width: '100%',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    minHeight: 2,
  },
  chartAxisRow: {
    position: 'relative',
    height: 16,
    marginTop: 6,
  },
  chartAxisLabel: {
    position: 'absolute',
    fontSize: 11,
    textAlign: 'center',
  },
  notFound: {
    flex: 1,
    textAlign: 'center',
    marginTop: 100,
  },
});
