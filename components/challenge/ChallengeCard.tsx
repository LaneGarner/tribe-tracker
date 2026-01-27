import React, { useContext } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext, getColors } from '../../theme/ThemeContext';
import { Challenge, ChallengeParticipant } from '../../types';
import {
  getChallengeStatus,
  getCurrentChallengeDay,
  formatDate,
} from '../../utils/dateUtils';

interface ChallengeCardProps {
  challenge: Challenge;
  participation?: ChallengeParticipant;
}

export default function ChallengeCard({
  challenge,
  participation,
}: ChallengeCardProps) {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);

  const status = getChallengeStatus(
    challenge.startDate,
    challenge.endDate || challenge.startDate
  );
  const currentDay =
    status === 'active' ? getCurrentChallengeDay(challenge.startDate) : 0;
  const progressPercent = (currentDay / challenge.durationDays) * 100;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {challenge.name}
          </Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  status === 'active'
                    ? colors.success
                    : status === 'upcoming'
                      ? colors.warning
                      : colors.textTertiary,
              },
            ]}
          >
            <Text style={styles.statusText}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
      </View>

      {/* Progress */}
      {status === 'active' && (
        <View style={styles.progressSection}>
          <View style={styles.progressInfo}>
            <Text style={[styles.dayText, { color: colors.primary }]}>
              Day {currentDay}
            </Text>
            <Text style={[styles.totalText, { color: colors.textSecondary }]}>
              of {challenge.durationDays}
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.primary,
                  width: `${Math.min(progressPercent, 100)}%`,
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* Stats */}
      {participation && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="star" size={16} color={colors.warning} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {participation.totalPoints}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              points
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="flame" size={16} color={colors.error} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {participation.currentStreak}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              streak
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="calendar" size={16} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {participation.daysParticipated}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              days
            </Text>
          </View>
        </View>
      )}

      {/* Meta */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons
            name="people-outline"
            size={14}
            color={colors.textSecondary}
          />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {challenge.participantCount} participant
            {challenge.participantCount !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons
            name="checkbox-outline"
            size={14}
            color={colors.textSecondary}
          />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {challenge.habits.length} habit{challenge.habits.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 20,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  progressSection: {
    marginBottom: 12,
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  dayText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  totalText: {
    fontSize: 14,
    marginLeft: 4,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
});
