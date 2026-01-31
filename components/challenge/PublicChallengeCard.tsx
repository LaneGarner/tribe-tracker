import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Challenge } from '../../types';
import {
  getChallengeStatus,
  getDaysRemaining,
  getCurrentChallengeDay,
} from '../../utils/dateUtils';

interface PublicChallengeCardProps {
  challenge: Challenge;
  onPress: () => void;
  gradientColors?: [string, string];
}

// Gradient palette for variety
const CARD_GRADIENTS: [string, string][] = [
  ['#00B4DB', '#0083B0'], // cyan/teal
  ['#667EEA', '#764BA2'], // purple/violet
  ['#F093FB', '#F5576C'], // pink/rose
  ['#4FACFE', '#00F2FE'], // light blue
  ['#43E97B', '#38F9D7'], // green/teal
  ['#FA709A', '#FEE140'], // pink/yellow
  ['#A18CD1', '#FBC2EB'], // lavender/pink
  ['#FF9A9E', '#FECFEF'], // coral/pink
];

export function getGradientForIndex(index: number): [string, string] {
  return CARD_GRADIENTS[index % CARD_GRADIENTS.length];
}

export default function PublicChallengeCard({
  challenge,
  onPress,
  gradientColors,
}: PublicChallengeCardProps) {
  const status = getChallengeStatus(
    challenge.startDate,
    challenge.endDate || challenge.startDate
  );
  const currentDay =
    status === 'active' ? getCurrentChallengeDay(challenge.startDate) : 0;
  const daysRemaining = getDaysRemaining(challenge.endDate || challenge.startDate);
  const progressPercent = Math.min((currentDay / challenge.durationDays) * 100, 100);

  const colors = gradientColors || CARD_GRADIENTS[0];

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        {/* Header with title */}
        <View style={styles.header}>
          <View style={styles.titleSection}>
            <Text style={styles.name} numberOfLines={2}>
              {challenge.name}
            </Text>
            {challenge.creatorName && (
              <Text style={styles.creator}>
                by {challenge.creatorName}
              </Text>
            )}
          </View>
          <View style={styles.chevronContainer}>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={styles.statText}>{challenge.durationDays} days</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="checkbox-outline" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={styles.statText}>{challenge.habits.length} habits</Text>
          </View>
          {challenge.participantCount !== undefined && challenge.participantCount > 0 && (
            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.statText}>{challenge.participantCount}</Text>
            </View>
          )}
        </View>

        {/* Status badge */}
        <View style={styles.statusRow}>
          {status === 'active' && (
            <>
              <View style={styles.statusBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.statusText}>Active</Text>
              </View>
              {daysRemaining > 0 && (
                <Text style={styles.daysRemaining}>
                  {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left
                </Text>
              )}
            </>
          )}
          {status === 'upcoming' && (
            <View style={styles.statusBadge}>
              <Ionicons name="time-outline" size={12} color="#fff" />
              <Text style={styles.statusText}>Starting soon</Text>
            </View>
          )}
          {status === 'completed' && (
            <View style={styles.statusBadge}>
              <Ionicons name="checkmark-circle-outline" size={12} color="#fff" />
              <Text style={styles.statusText}>Completed</Text>
            </View>
          )}
        </View>

        {/* Progress bar for active challenges */}
        {status === 'active' && (
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${progressPercent}%` },
              ]}
            />
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleSection: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  creator: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  chevronContainer: {
    paddingTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  daysRemaining: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
    marginTop: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#fff',
  },
});
