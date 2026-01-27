import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Crypto from 'expo-crypto';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { RootState, AppDispatch } from '../redux/store';
import { addParticipant } from '../redux/slices/participantsSlice';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList, ChallengeParticipant } from '../types';
import {
  formatDate,
  getChallengeStatus,
  getCurrentChallengeDay,
  getDaysBetween,
} from '../utils/dateUtils';
import Leaderboard from '../components/challenge/Leaderboard';

type ChallengeDetailRouteProp = RouteProp<RootStackParamList, 'ChallengeDetail'>;
type ChallengeDetailNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ChallengeDetail'
>;

export default function ChallengeDetailScreen() {
  const navigation = useNavigation<ChallengeDetailNavigationProp>();
  const route = useRoute<ChallengeDetailRouteProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const { user } = useAuth();

  const { challengeId } = route.params;

  const challenge = useSelector((state: RootState) =>
    state.challenges.data.find(c => c.id === challengeId)
  );

  const participants = useSelector((state: RootState) =>
    state.participants.data.filter(p => p.challengeId === challengeId)
  );

  const userParticipation = participants.find(p => p.userId === user?.id);
  const isJoined = Boolean(userParticipation);
  const [isJoining, setIsJoining] = useState(false);

  if (!challenge) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: colors.text }]}>
            Challenge not found
          </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.backLink, { color: colors.primary }]}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const status = getChallengeStatus(
    challenge.startDate,
    challenge.endDate || challenge.startDate
  );
  const currentDay = status === 'active' ? getCurrentChallengeDay(challenge.startDate) : 0;
  const totalDays = challenge.durationDays;

  const handleJoin = () => {
    if (isJoined || isJoining) return;

    setIsJoining(true);
    const participation: ChallengeParticipant = {
      id: Crypto.randomUUID(),
      challengeId: challenge.id,
      challengeName: challenge.name,
      userId: user?.id || 'anonymous',
      userName: user?.email?.split('@')[0] || 'Anonymous',
      userEmail: user?.email || '',
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      daysParticipated: 0,
      joinDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dispatch(addParticipant(participation));
    setIsJoining(false);
    Alert.alert('Joined!', `You've joined "${challenge.name}"`);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join my challenge "${challenge.name}" on Tribe Tracker! Use code: ${challenge.inviteCode}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surface }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.surface }]}
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.surface }]}
            onPress={() =>
              navigation.navigate('TaskAnalytics', { challengeId: challenge.id })
            }
          >
            <Ionicons name="stats-chart" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Challenge Info */}
        <View style={styles.challengeInfo}>
          <Text style={[styles.challengeName, { color: colors.text }]}>
            {challenge.name}
          </Text>

          {challenge.description && (
            <Text
              style={[styles.description, { color: colors.textSecondary }]}
            >
              {challenge.description}
            </Text>
          )}

          <View style={styles.metaRow}>
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
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {participants.length} participant{participants.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Progress */}
        {status === 'active' && (
          <View style={[styles.progressCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.progressTitle, { color: colors.text }]}>
              Progress
            </Text>
            <View style={styles.progressRow}>
              <Text style={[styles.progressDay, { color: colors.primary }]}>
                Day {currentDay}
              </Text>
              <Text style={[styles.progressTotal, { color: colors.textSecondary }]}>
                of {totalDays}
              </Text>
            </View>
            <View
              style={[styles.progressBar, { backgroundColor: colors.border }]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${(currentDay / totalDays) * 100}%`,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Dates */}
        <View style={[styles.datesCard, { backgroundColor: colors.surface }]}>
          <View style={styles.dateItem}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <View style={styles.dateInfo}>
              <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>
                Starts
              </Text>
              <Text style={[styles.dateValue, { color: colors.text }]}>
                {formatDate(challenge.startDate)}
              </Text>
            </View>
          </View>
          <View style={styles.dateDivider} />
          <View style={styles.dateItem}>
            <Ionicons name="flag-outline" size={20} color={colors.success} />
            <View style={styles.dateInfo}>
              <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>
                Ends
              </Text>
              <Text style={[styles.dateValue, { color: colors.text }]}>
                {formatDate(challenge.endDate || challenge.startDate)}
              </Text>
            </View>
          </View>
        </View>

        {/* Habits */}
        <View style={[styles.habitsCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.habitsTitle, { color: colors.text }]}>
            Daily Habits ({challenge.habits.length})
          </Text>
          {challenge.habits.map((habit, index) => (
            <View
              key={index}
              style={[styles.habitItem, { borderBottomColor: colors.border }]}
            >
              <View
                style={[styles.habitNumber, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.habitNumberText}>{index + 1}</Text>
              </View>
              <Text style={[styles.habitText, { color: colors.text }]}>
                {habit}
              </Text>
            </View>
          ))}
        </View>

        {/* Invite Code */}
        {challenge.inviteCode && (
          <View style={[styles.inviteCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.inviteLabel, { color: colors.textSecondary }]}>
              Invite Code
            </Text>
            <Text style={[styles.inviteCode, { color: colors.text }]}>
              {challenge.inviteCode}
            </Text>
            <TouchableOpacity
              style={[styles.shareButton, { backgroundColor: colors.primary }]}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={16} color="#fff" />
              <Text style={styles.shareButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Leaderboard */}
        <View style={styles.leaderboardSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Leaderboard
          </Text>
          <Leaderboard
            participants={participants}
            currentUserId={user?.id}
            onParticipantPress={participant =>
              navigation.navigate('ViewMember', { userId: participant.userId })
            }
            showPodium={false}
          />
        </View>
      </ScrollView>

      {/* Join Button */}
      {!isJoined && status !== 'completed' && (
        <View style={[styles.footer, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.joinButton, { backgroundColor: colors.primary, opacity: isJoining ? 0.7 : 1 }]}
            onPress={handleJoin}
            disabled={isJoining}
          >
            {isJoining ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.joinButtonText}>Join Challenge</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  challengeInfo: {
    marginBottom: 20,
  },
  challengeName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  metaText: {
    fontSize: 14,
  },
  progressCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  progressDay: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  progressTotal: {
    fontSize: 16,
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
  datesCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  dateItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  dateInfo: {},
  dateLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  habitsCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  habitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  habitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  habitNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  habitNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  habitText: {
    fontSize: 14,
    flex: 1,
  },
  inviteCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  inviteLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  inviteCode: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 12,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  leaderboardSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 34,
  },
  joinButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    fontSize: 16,
    marginBottom: 12,
  },
  backLink: {
    fontSize: 14,
    fontWeight: '500',
  },
});
