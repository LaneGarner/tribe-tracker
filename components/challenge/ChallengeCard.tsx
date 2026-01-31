import React, { useContext, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';
import { ThemeContext, getColors } from '../../theme/ThemeContext';
import { RootState } from '../../redux/store';
import { Challenge, ChallengeParticipant } from '../../types';
import {
  getChallengeStatus,
  getCurrentChallengeDay,
  getDaysRemaining,
} from '../../utils/dateUtils';
import { calculateActiveStreak } from '../../utils/streakUtils';

interface ChallengeCardProps {
  challenge: Challenge;
  participation?: ChallengeParticipant;
  allParticipants?: ChallengeParticipant[];
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Default gradient - cyan/teal blue
const DEFAULT_GRADIENT = ['#00B4DB', '#0083B0'];

export default function ChallengeCard({
  challenge,
  participation,
  allParticipants,
}: ChallengeCardProps) {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);

  // Get checkins for this participant to calculate active streak
  const selectCheckinDates = useMemo(
    () =>
      createSelector(
        [(state: RootState) => state.checkins.data],
        checkins =>
          checkins
            .filter(
              c =>
                c.challengeId === challenge.id &&
                c.userId === participation?.userId &&
                c.checkinDate >= challenge.startDate
            )
            .map(c => c.checkinDate)
      ),
    [challenge.id, challenge.startDate, participation?.userId]
  );

  const checkinDates = useSelector(selectCheckinDates);
  const activeStreak = calculateActiveStreak(checkinDates);

  // Calculate user's rank among all participants
  const userRank = useMemo(() => {
    if (!allParticipants || !participation) return null;
    const sorted = [...allParticipants].sort((a, b) => b.totalPoints - a.totalPoints);
    const index = sorted.findIndex(p => p.userId === participation.userId);
    return index >= 0 ? index + 1 : null;
  }, [allParticipants, participation]);

  const status = getChallengeStatus(
    challenge.startDate,
    challenge.endDate || challenge.startDate
  );
  const currentDay =
    status === 'active' ? getCurrentChallengeDay(challenge.startDate) : 0;
  const daysRemaining = getDaysRemaining(challenge.endDate || challenge.startDate);
  const progressPercent = Math.min((currentDay / challenge.durationDays) * 100, 100);

  return (
    <LinearGradient
      colors={DEFAULT_GRADIENT as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Header with title and streak badge */}
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={styles.name} numberOfLines={2}>
            {challenge.name}
          </Text>
          {status !== 'active' && (
            <Text style={styles.daysRemaining}>
              {status === 'upcoming' ? 'Starting soon' : 'Completed'}
            </Text>
          )}
          {status === 'active' && daysRemaining > 0 && (
            <Text style={styles.daysRemaining}>
              {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
            </Text>
          )}
        </View>
        {participation && (
          <View style={styles.badgeRow}>
            {userRank !== null && (
              <View style={styles.rankBadge}>
                <Ionicons name="trophy" size={16} color="#fff" />
                <Text style={styles.rankBadgeText}>
                  {getOrdinal(userRank)}{'\n'}place
                </Text>
              </View>
            )}
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={16} color="#fff" />
              <Text style={styles.streakBadgeText}>
                {activeStreak} day{'\n'}streak
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Stats row */}
      {participation && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>My Points</Text>
            <Text style={styles.statValue}>{participation.totalPoints}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Best Streak</Text>
            <Text style={styles.statValue}>{participation.longestStreak}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Days Active</Text>
            <Text style={styles.statValue}>{participation.daysParticipated}</Text>
          </View>
        </View>
      )}

      {/* Progress bar */}
      {status === 'active' && (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressPercent}>{Math.round(progressPercent)}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${progressPercent}%` },
              ]}
            />
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  titleSection: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  daysRemaining: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  rankBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 14,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  streakBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 14,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  progressSection: {
    marginTop: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#fff',
  },
});
