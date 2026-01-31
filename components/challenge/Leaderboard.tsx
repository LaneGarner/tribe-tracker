import React, { useContext, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Crown, Medal, Award, Trophy, Flame } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { ThemeContext, getColors } from '../../theme/ThemeContext';
import { RootState } from '../../redux/store';
import { ChallengeParticipant, HabitCheckin } from '../../types';
import { calculateActiveStreak } from '../../utils/streakUtils';

interface LeaderboardProps {
  participants: ChallengeParticipant[];
  currentUserId?: string;
  onParticipantPress?: (participant: ChallengeParticipant) => void;
  showPodium?: boolean;
  challengeId?: string;
  challengeStartDate?: string;
}

const PODIUM_COLORS = {
  first: {
    main: '#F7B928',
    gradient: ['#FACC15', '#CA8A04'] as [string, string],
    border: '#FACC15',
  },
  second: {
    main: '#9CA3AF',
    gradient: ['#D1D5DB', '#9CA3AF'] as [string, string],
    border: '#D1D5DB',
  },
  third: {
    main: '#F97316',
    gradient: ['#FB923C', '#EA580C'] as [string, string],
    border: '#FB923C',
  },
};

const AVATAR_GRADIENT = ['#60A5FA', '#A855F7'] as [string, string];

export default function Leaderboard({
  participants,
  currentUserId,
  onParticipantPress,
  showPodium = true,
  challengeId,
  challengeStartDate,
}: LeaderboardProps) {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);

  // Get all checkins for this challenge to calculate active streaks
  const allCheckins = useSelector((state: RootState) => state.checkins.data);
  const checkins = useMemo(() => {
    if (!challengeId) return [];
    return allCheckins.filter(
      c => c.challengeId === challengeId &&
        (!challengeStartDate || c.checkinDate >= challengeStartDate)
    );
  }, [allCheckins, challengeId, challengeStartDate]);

  // Build a map of userId -> active streak
  const streaksByUserId = useMemo(() => {
    const map: Record<string, number> = {};
    participants.forEach(p => {
      const userCheckinDates = checkins
        .filter(c => c.userId === p.userId)
        .map(c => c.checkinDate);
      map[p.userId] = calculateActiveStreak(userCheckinDates);
    });
    return map;
  }, [participants, checkins]);

  const sortedParticipants = [...participants].sort(
    (a, b) => b.totalPoints - a.totalPoints
  );

  const top3 = sortedParticipants.slice(0, 3);
  const showPodiumSection = showPodium && top3.length >= 3;

  if (sortedParticipants.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Trophy size={48} color={colors.textTertiary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No participants yet
        </Text>
      </View>
    );
  }

  const renderPodiumColumn = (
    participant: ChallengeParticipant,
    rank: 1 | 2 | 3
  ) => {
    const podiumConfig = rank === 1
      ? PODIUM_COLORS.first
      : rank === 2
        ? PODIUM_COLORS.second
        : PODIUM_COLORS.third;

    // Sizes based on base44: 1st=80px, 2nd=64px, 3rd=56px
    const avatarSize = rank === 1 ? 80 : rank === 2 ? 64 : 56;
    const borderWidth = 4;
    const badgeSize = rank === 1 ? 40 : rank === 2 ? 34 : 28;
    const badgeOffset = rank === 1 ? -10 : -8;
    const iconSize = rank === 1 ? 22 : rank === 2 ? 18 : 16;

    // Bar heights - bottoms should align, so paddingTop + barHeight = 100 for all
    const barHeight = rank === 1 ? 100 : rank === 2 ? 65 : 50;
    // Subtle gradient - darker at top, lighter at bottom
    const barGradient = rank === 1
      ? ['#EAB308', '#FACC15'] as [string, string]
      : rank === 2
        ? ['#9CA3AF', '#D1D5DB'] as [string, string]
        : ['#EA580C', '#FB923C'] as [string, string];

    // Vertical offset calculated so bar bottoms align: paddingTop = 100 - barHeight
    // 1st: 0, 2nd: 35, 3rd: 50
    const paddingTop = rank === 1 ? 0 : rank === 2 ? 35 : 50;

    return (
      <TouchableOpacity
        key={participant.id}
        style={[styles.podiumColumn, { paddingTop }]}
        onPress={() => onParticipantPress?.(participant)}
        activeOpacity={0.7}
      >
        <View style={styles.podiumAvatarContainer}>
          <View
            style={[
              styles.podiumAvatarShadow,
              {
                width: avatarSize,
                height: avatarSize,
                borderRadius: avatarSize / 2,
                backgroundColor: podiumConfig.gradient[1],
              },
            ]}
          >
            {participant.userPhotoUrl ? (
              <Image
                source={{ uri: participant.userPhotoUrl }}
                style={[
                  styles.podiumAvatarImage,
                  {
                    width: avatarSize,
                    height: avatarSize,
                    borderRadius: avatarSize / 2,
                    borderWidth,
                    borderColor: podiumConfig.border,
                  },
                ]}
              />
            ) : (
              <LinearGradient
                colors={podiumConfig.gradient}
                style={[
                  styles.podiumAvatar,
                  {
                    width: avatarSize,
                    height: avatarSize,
                    borderRadius: avatarSize / 2,
                    borderWidth,
                    borderColor: podiumConfig.border,
                  },
                ]}
              >
                <Text style={[styles.podiumAvatarText, { fontSize: avatarSize * 0.4 }]}>
                  {participant.userName[0].toUpperCase()}
                </Text>
              </LinearGradient>
            )}
          </View>

          {/* Badge */}
          <View
            style={[
              styles.podiumBadgeShadow,
              {
                width: badgeSize,
                height: badgeSize,
                borderRadius: badgeSize / 2,
                top: badgeOffset,
                right: badgeOffset,
                backgroundColor: podiumConfig.gradient[1],
              },
            ]}
          >
            <LinearGradient
              colors={podiumConfig.gradient}
              style={[
                styles.podiumBadgeInner,
                {
                  width: badgeSize,
                  height: badgeSize,
                  borderRadius: badgeSize / 2,
                },
              ]}
            >
              {rank === 1 && <Crown size={iconSize} color="#fff" />}
              {rank === 2 && <Medal size={iconSize} color="#fff" />}
              {rank === 3 && <Award size={iconSize} color="#fff" />}
            </LinearGradient>
          </View>
        </View>

        <Text
          style={[styles.podiumName, { color: colors.text }]}
          numberOfLines={1}
        >
          {participant.userName.split(' ')[0]}
        </Text>
        <Text style={[styles.podiumPoints, { color: podiumConfig.main }]}>
          {participant.totalPoints}
        </Text>
        <Text style={[styles.podiumPointsLabel, { color: podiumConfig.main }]}>
          points
        </Text>

        {/* Bar directly under this column */}
        <LinearGradient
          colors={barGradient}
          style={[styles.podiumBar, { height: barHeight }]}
        />
      </TouchableOpacity>
    );
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <View style={[styles.rankMedalShadow, { backgroundColor: PODIUM_COLORS.first.gradient[1] }]}>
          <LinearGradient
            colors={PODIUM_COLORS.first.gradient}
            style={styles.rankMedalBadge}
          >
            <Crown size={20} color="#fff" />
          </LinearGradient>
        </View>
      );
    }
    if (rank === 2) {
      return (
        <View style={[styles.rankMedalShadow, { backgroundColor: PODIUM_COLORS.second.gradient[1] }]}>
          <LinearGradient
            colors={PODIUM_COLORS.second.gradient}
            style={styles.rankMedalBadge}
          >
            <Medal size={20} color="#fff" />
          </LinearGradient>
        </View>
      );
    }
    if (rank === 3) {
      return (
        <View style={[styles.rankMedalShadow, { backgroundColor: PODIUM_COLORS.third.gradient[1] }]}>
          <LinearGradient
            colors={PODIUM_COLORS.third.gradient}
            style={styles.rankMedalBadge}
          >
            <Award size={20} color="#fff" />
          </LinearGradient>
        </View>
      );
    }
    return (
      <View style={[styles.rankNumberCircle, { borderColor: colors.border, backgroundColor: colors.surface }]}>
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
            {renderPodiumColumn(top3[1], 2)}
            {renderPodiumColumn(top3[0], 1)}
            {renderPodiumColumn(top3[2], 3)}
          </View>
        </View>
      )}

      <View
        style={[styles.listContainer, { backgroundColor: colors.surface }]}
      >
        <View style={styles.listHeader}>
          <Trophy size={20} color={colors.primary} />
          <Text style={[styles.listHeaderText, { color: colors.text }]}>
            All Participants ({sortedParticipants.length})
          </Text>
        </View>

        {sortedParticipants.map((participant, index) => {
          const rank = index + 1;
          const isCurrentUser = participant.userId === currentUserId;
          const isTopThree = rank <= 3;

          const rowContent = (
            <>
              {getRankBadge(rank)}

              <View style={styles.avatarShadow}>
                {participant.userPhotoUrl ? (
                  <Image
                    source={{ uri: participant.userPhotoUrl }}
                    style={styles.avatar}
                  />
                ) : (
                  <LinearGradient
                    colors={AVATAR_GRADIENT}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatar}
                  >
                    <Text style={styles.avatarText}>
                      {participant.userName[0].toUpperCase()}
                    </Text>
                  </LinearGradient>
                )}
              </View>

              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <Text
                    style={[styles.name, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {participant.userName}
                  </Text>
                  {isCurrentUser && (
                    <View style={[
                      styles.youBadge,
                      {
                        backgroundColor: colorScheme === 'dark' ? '#064E3B' : '#D1FAE5',
                        borderColor: colorScheme === 'dark' ? '#065F46' : '#A7F3D0',
                      }
                    ]}>
                      <Text style={[styles.youBadgeText, { color: colorScheme === 'dark' ? '#34D399' : '#059669' }]}>You</Text>
                    </View>
                  )}
                </View>
                <View style={styles.statsRow}>
                  <Text
                    style={[styles.pointsText, { color: colors.textSecondary }]}
                  >
                    {participant.totalPoints} pts
                  </Text>
                  {(streaksByUserId[participant.userId] ?? participant.currentStreak) > 0 && (
                    <>
                      <Text
                        style={[styles.statDot, { color: colors.textTertiary }]}
                      >
                        ·
                      </Text>
                      <Flame size={14} color="#F97316" />
                      <Text
                        style={[
                          styles.streakValue,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {streaksByUserId[participant.userId] ?? participant.currentStreak} day streak
                      </Text>
                    </>
                  )}
                </View>
              </View>
            </>
          );

          if (isCurrentUser) {
            return (
              <TouchableOpacity
                key={participant.id}
                onPress={() => onParticipantPress?.(participant)}
                disabled={!onParticipantPress}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={colorScheme === 'dark' ? ['#064E3B', '#1E3A5F'] : ['#DCFCE7', '#DBEAFE']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.row, styles.rowCurrentUser]}
                >
                  {rowContent}
                </LinearGradient>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={participant.id}
              style={[
                styles.row,
                isTopThree && { backgroundColor: colorScheme === 'dark' ? colors.surfaceSecondary : '#FEFCE8' },
              ]}
              onPress={() => onParticipantPress?.(participant)}
              disabled={!onParticipantPress}
              activeOpacity={0.7}
            >
              {rowContent}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
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
    alignItems: 'flex-start',
  },
  podiumColumn: {
    alignItems: 'center',
    flex: 1,
  },
  podiumAvatarContainer: {
    position: 'relative',
  },
  podiumAvatarShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  podiumAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumAvatarImage: {
    backgroundColor: '#f0f0f0',
  },
  podiumAvatarText: {
    fontWeight: 'bold',
    color: '#fff',
  },
  podiumBadgeShadow: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  podiumBadgeInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumName: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  podiumPoints: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 2,
  },
  podiumPointsLabel: {
    fontSize: 12,
  },
  podiumBar: {
    width: '85%',
    marginTop: 8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
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
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 8,
  },
  rowCurrentUser: {
    borderWidth: 2,
    borderColor: '#4ADE80',
  },
  rankMedalShadow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  rankMedalBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankNumberCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginRight: 12,
  },
  rankNumberText: {
    fontSize: 14,
    fontWeight: '600',
  },
  avatarShadow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
    backgroundColor: '#A855F7',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
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
    fontWeight: '700',
  },
  youBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  youBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statDot: {
    marginHorizontal: 6,
    fontSize: 14,
  },
  streakValue: {
    fontSize: 14,
    marginLeft: 4,
  },
});
