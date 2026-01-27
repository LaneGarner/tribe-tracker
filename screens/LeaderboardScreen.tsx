import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSelector, useDispatch } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { RootState, AppDispatch } from '../redux/store';
import { loadChallengesFromStorage } from '../redux/slices/challengesSlice';
import { loadParticipantsFromStorage } from '../redux/slices/participantsSlice';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList, Challenge } from '../types';
import { getChallengeStatus } from '../utils/dateUtils';
import Leaderboard from '../components/challenge/Leaderboard';

type LeaderboardNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Main'
>;

export default function LeaderboardScreen() {
  const navigation = useNavigation<LeaderboardNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const { user } = useAuth();

  const challenges = useSelector((state: RootState) => state.challenges.data);
  const participants = useSelector((state: RootState) => state.participants.data);

  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(
    null
  );
  const [refreshing, setRefreshing] = useState(false);

  // Filter active challenges
  const activeChallenges = challenges.filter(
    c => getChallengeStatus(c.startDate, c.endDate || c.startDate) === 'active'
  );

  // Set initial selected challenge
  useEffect(() => {
    if (activeChallenges.length > 0 && !selectedChallengeId) {
      setSelectedChallengeId(activeChallenges[0].id);
    }
  }, [activeChallenges, selectedChallengeId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      dispatch(loadChallengesFromStorage()),
      dispatch(loadParticipantsFromStorage()),
    ]);
    setRefreshing(false);
  };

  const selectedChallenge = challenges.find(c => c.id === selectedChallengeId);
  const challengeParticipants = participants.filter(
    p => p.challengeId === selectedChallengeId
  );

  const sortedParticipants = [...challengeParticipants].sort(
    (a, b) => b.totalPoints - a.totalPoints
  );
  const currentUserParticipant = sortedParticipants.find(
    p => p.userId === user?.id
  );
  const myRank = currentUserParticipant
    ? sortedParticipants.findIndex(p => p.userId === user?.id) + 1
    : null;
  const myPoints = currentUserParticipant?.totalPoints ?? 0;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Challenge selector tabs (only show if multiple challenges) */}
        {activeChallenges.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.challengeSelector}
            contentContainerStyle={styles.challengeSelectorContent}
          >
            {activeChallenges.map(challenge => (
              <TouchableOpacity
                key={challenge.id}
                style={[
                  styles.challengeTab,
                  {
                    backgroundColor:
                      selectedChallengeId === challenge.id
                        ? colors.primary
                        : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setSelectedChallengeId(challenge.id)}
              >
                <Text
                  style={[
                    styles.challengeTabText,
                    {
                      color:
                        selectedChallengeId === challenge.id
                          ? '#fff'
                          : colors.text,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {challenge.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Header with challenge name */}
        {activeChallenges.length > 0 ? (
          <>
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backLink}
                onPress={() => navigation.navigate('Main')}
              >
                <Ionicons name="chevron-back" size={20} color={colors.primary} />
                <Text style={[styles.backLinkText, { color: colors.primary }]}>
                  Back to Challenges
                </Text>
              </TouchableOpacity>

              <Text style={[styles.title, { color: colors.text }]}>
                {selectedChallenge
                  ? `${selectedChallenge.name} - ${selectedChallenge.durationDays} day Leaderboard`
                  : 'Leaderboard'}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Rankings for this challenge
              </Text>
            </View>

            {/* Stats summary - gradient card */}
            {selectedChallenge && (
              <LinearGradient
                colors={['#F472B6', '#A855F7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statsCard}
              >
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Participants</Text>
                  <Text style={styles.statValue}>
                    {challengeParticipants.length}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>My Rank</Text>
                  <Text style={styles.statValue}>
                    {myRank ? `#${myRank}` : '-'}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>My Points</Text>
                  <Text style={styles.statValue}>{myPoints}</Text>
                </View>
              </LinearGradient>
            )}

            {/* Leaderboard */}
            <Leaderboard
              participants={challengeParticipants}
              currentUserId={user?.id}
              onParticipantPress={participant =>
                navigation.navigate('ViewMember', { userId: participant.userId })
              }
            />
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={64} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Active Challenges
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Join or create a challenge to see the leaderboard.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
    paddingBottom: 24,
  },
  challengeSelector: {
    marginBottom: 8,
  },
  challengeSelectorContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  challengeTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  challengeTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backLinkText: {
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  statsCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});
