import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeContext, getColors } from '../../theme/ThemeContext';
import { ChallengeParticipant } from '../../types';

interface LeaderboardProps {
  participants: ChallengeParticipant[];
  currentUserId?: string;
  onParticipantPress?: (participant: ChallengeParticipant) => void;
  showPodium?: boolean;
}

const PODIUM_COLORS = {
  first: '#F7B928',
  second: '#9CA3AF',
  third: '#F97316',
};

const AVATAR_GRADIENT = ['#818CF8', '#6366F1'] as [string, string];

export default function Leaderboard({
  participants,
  currentUserId,
  onParticipantPress,
  showPodium = true,
}: LeaderboardProps) {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);

  const sortedParticipants = [...participants].sort(
    (a, b) => b.totalPoints - a.totalPoints
  );

  const top3 = sortedParticipants.slice(0, 3);
  const showPodiumSection = showPodium && top3.length >= 3;

  if (sortedParticipants.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="podium-outline" size={48} color={colors.textTertiary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No participants yet
        </Text>
      </View>
    );
  }

  const renderPodiumAvatar = (
    participant: ChallengeParticipant,
    rank: 1 | 2 | 3
  ) => {
    const podiumColor =
      rank === 1
        ? PODIUM_COLORS.first
        : rank === 2
          ? PODIUM_COLORS.second
          : PODIUM_COLORS.third;
    const isFirst = rank === 1;
    const avatarSize = isFirst ? 80 : 64;

    return (
      <TouchableOpacity
        key={participant.id}
        style={[styles.podiumItem, isFirst && styles.podiumItemFirst]}
        onPress={() => onParticipantPress?.(participant)}
        activeOpacity={0.7}
      >
        <View style={styles.podiumAvatarContainer}>
          {/* Crown on top for 1st place */}
          {rank === 1 && (
            <View style={styles.crownContainer}>
              <Text style={styles.crownEmoji}>👑</Text>
            </View>
          )}

          {participant.userPhotoUrl ? (
            <Image
              source={{ uri: participant.userPhotoUrl }}
              style={[
                styles.podiumAvatar,
                {
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: avatarSize / 2,
                },
              ]}
            />
          ) : (
            <View
              style={[
                styles.podiumAvatar,
                {
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: avatarSize / 2,
                  backgroundColor: podiumColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.podiumAvatarText,
                  { fontSize: isFirst ? 32 : 24 },
                ]}
              >
                {participant.userName[0].toUpperCase()}
              </Text>
            </View>
          )}

          {/* Ribbon badge for 2nd and 3rd */}
          {rank !== 1 && (
            <View style={[styles.podiumBadge, { backgroundColor: podiumColor }]}>
              <Ionicons name="ribbon" size={12} color="#fff" />
            </View>
          )}
        </View>

        <Text
          style={[styles.podiumName, { color: colors.text }]}
          numberOfLines={1}
        >
          {participant.userName.split(' ')[0]}
        </Text>
        <Text style={[styles.podiumPoints, { color: podiumColor }]}>
          {participant.totalPoints}
        </Text>
        <Text style={[styles.podiumPointsLabel, { color: podiumColor }]}>
          points
        </Text>
      </TouchableOpacity>
    );
  };

  const renderPodiumBars = () => {
    if (top3.length < 3) return null;
    return (
      <View style={styles.podiumBars}>
        <View style={[styles.podiumBar, styles.podiumBarSecond]} />
        <View style={[styles.podiumBar, styles.podiumBarFirst]} />
        <View style={[styles.podiumBar, styles.podiumBarThird]} />
      </View>
    );
  };

  const getRankBadge = (rank: number) => {
    if (rank <= 3) {
      const badgeColor =
        rank === 1
          ? PODIUM_COLORS.first
          : rank === 2
            ? PODIUM_COLORS.second
            : PODIUM_COLORS.third;
      return (
        <View style={[styles.rankMedalBadge, { backgroundColor: badgeColor }]}>
          {rank === 1 ? (
            <Ionicons name="trophy" size={16} color="#fff" />
          ) : (
            <Ionicons name="ribbon" size={14} color="#fff" />
          )}
        </View>
      );
    }
    return (
      <View style={[styles.rankNumberCircle, { borderColor: colors.border }]}>
        <Text style={[styles.rankNumberText, { color: colors.textSecondary }]}>
          {rank}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {showPodiumSection && (
        <View style={styles.podiumSection}>
          <View style={styles.podiumRow}>
            {renderPodiumAvatar(top3[1], 2)}
            {renderPodiumAvatar(top3[0], 1)}
            {renderPodiumAvatar(top3[2], 3)}
          </View>
          {renderPodiumBars()}
        </View>
      )}

      <View
        style={[styles.listContainer, { backgroundColor: colors.surface }]}
      >
        <View style={styles.listHeader}>
          <Ionicons name="trophy-outline" size={20} color={colors.primary} />
          <Text style={[styles.listHeaderText, { color: colors.text }]}>
            All Participants ({sortedParticipants.length})
          </Text>
        </View>

        {sortedParticipants.map((participant, index) => {
          const rank = index + 1;
          const isCurrentUser = participant.userId === currentUserId;

          return (
            <TouchableOpacity
              key={participant.id}
              style={[
                styles.row,
                isCurrentUser && styles.rowCurrentUser,
              ]}
              onPress={() => onParticipantPress?.(participant)}
              disabled={!onParticipantPress}
              activeOpacity={0.7}
            >
              {getRankBadge(rank)}

              {participant.userPhotoUrl ? (
                <Image
                  source={{ uri: participant.userPhotoUrl }}
                  style={styles.avatar}
                />
              ) : (
                <LinearGradient colors={AVATAR_GRADIENT} style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {participant.userName[0].toUpperCase()}
                  </Text>
                </LinearGradient>
              )}

              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <Text
                    style={[styles.name, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {participant.userName}
                  </Text>
                  {isCurrentUser && (
                    <View style={styles.youBadge}>
                      <Text style={styles.youBadgeText}>You</Text>
                    </View>
                  )}
                </View>
                <View style={styles.statsRow}>
                  <Text
                    style={[styles.pointsText, { color: colors.textSecondary }]}
                  >
                    {participant.totalPoints} pts
                  </Text>
                  {participant.currentStreak > 0 && (
                    <>
                      <Text
                        style={[styles.statDot, { color: colors.textTertiary }]}
                      >
                        ·
                      </Text>
                      <Text style={styles.streakEmoji}>🔥</Text>
                      <Text
                        style={[
                          styles.streakValue,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {participant.currentStreak} day streak
                      </Text>
                    </>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    marginHorizontal: 20,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
  },
  podiumSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  podiumRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  podiumItem: {
    alignItems: 'center',
    flex: 1,
    paddingTop: 30,
  },
  podiumItemFirst: {
    paddingTop: 0,
  },
  podiumAvatarContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  crownContainer: {
    marginBottom: -8,
    zIndex: 1,
  },
  crownEmoji: {
    fontSize: 24,
  },
  podiumAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumAvatarText: {
    fontWeight: '600',
    color: '#fff',
  },
  podiumBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumName: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  podiumPoints: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 2,
  },
  podiumPointsLabel: {
    fontSize: 12,
  },
  podiumBars: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginTop: 16,
  },
  podiumBar: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 6,
  },
  podiumBarFirst: {
    height: 90,
    backgroundColor: PODIUM_COLORS.first,
  },
  podiumBarSecond: {
    height: 60,
    backgroundColor: PODIUM_COLORS.second,
  },
  podiumBarThird: {
    height: 45,
    backgroundColor: PODIUM_COLORS.third,
  },
  listContainer: {
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 16,
    overflow: 'hidden',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  listHeaderText: {
    fontSize: 16,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 4,
  },
  rowCurrentUser: {
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  rankMedalBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rankNumberCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginRight: 10,
    backgroundColor: '#F9FAFB',
  },
  rankNumberText: {
    fontSize: 14,
    fontWeight: '600',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  youBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  youBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  pointsText: {
    fontSize: 14,
  },
  statDot: {
    marginHorizontal: 6,
    fontSize: 14,
  },
  streakEmoji: {
    fontSize: 12,
  },
  streakValue: {
    fontSize: 14,
    marginLeft: 2,
  },
});
