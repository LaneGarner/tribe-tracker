import React, { useContext, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSelector, useDispatch } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Trophy, ChevronLeft, ChevronRight } from 'lucide-react-native';

// Check if running in Expo Go vs a build
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Only import DraggableFlatList in builds (not Expo Go) to avoid Worklets issues
let DraggableFlatList: any = null;
let ScaleDecorator: any = null;
if (!isExpoGo) {
  try {
    const draggableModule = require('react-native-draggable-flatlist');
    DraggableFlatList = draggableModule.default;
    ScaleDecorator = draggableModule.ScaleDecorator;
  } catch (e) {
    // DraggableFlatList not available
  }
}
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { RootState, AppDispatch } from '../redux/store';
import { loadChallengesFromStorage, fetchChallengesFromServer } from '../redux/slices/challengesSlice';
import { loadParticipantsFromStorage, fetchParticipantsFromServer } from '../redux/slices/participantsSlice';
import { useAuth } from '../context/AuthContext';
import { isBackendConfigured } from '../config/api';
import { RootStackParamList, TabParamList, Challenge } from '../types';
import { getChallengeStatus } from '../utils/dateUtils';
import Leaderboard from '../components/challenge/Leaderboard';

const CHALLENGE_ORDER_KEY = 'tribe_leaderboard_challenge_order';

type LeaderboardNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Main'
>;

type LeaderboardRouteProp = RouteProp<TabParamList, 'Leaderboard'>;

export default function LeaderboardScreen() {
  const navigation = useNavigation<LeaderboardNavigationProp>();
  const route = useRoute<LeaderboardRouteProp>();
  const initialChallengeId = route.params?.challengeId;
  const dispatch = useDispatch<AppDispatch>();
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const { user, session } = useAuth();

  const challenges = useSelector((state: RootState) => state.challenges.data);
  const participants = useSelector((state: RootState) => state.participants.data);

  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(
    null
  );
  const [refreshing, setRefreshing] = useState(false);
  const [challengeOrder, setChallengeOrder] = useState<string[]>([]);

  // Filter active challenges
  const activeChallenges = challenges.filter(
    c => getChallengeStatus(c.startDate, c.endDate || c.startDate) === 'active'
  );

  // Sort active challenges by saved order
  const orderedChallenges = [...activeChallenges].sort((a, b) => {
    const indexA = challengeOrder.indexOf(a.id);
    const indexB = challengeOrder.indexOf(b.id);
    // If not in order array, put at end
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  // Load challenge order from AsyncStorage
  useEffect(() => {
    const loadOrder = async () => {
      try {
        const savedOrder = await AsyncStorage.getItem(CHALLENGE_ORDER_KEY);
        if (savedOrder) {
          setChallengeOrder(JSON.parse(savedOrder));
        }
      } catch (error) {
        console.error('Failed to load challenge order:', error);
      }
    };
    loadOrder();
  }, []);

  // Save challenge order to AsyncStorage
  const saveOrder = useCallback(async (newOrder: string[]) => {
    try {
      await AsyncStorage.setItem(CHALLENGE_ORDER_KEY, JSON.stringify(newOrder));
      setChallengeOrder(newOrder);
    } catch (error) {
      console.error('Failed to save challenge order:', error);
    }
  }, []);

  // Move challenge left in order
  const moveChallengeLeft = useCallback((challengeId: string) => {
    const currentOrder = orderedChallenges.map(c => c.id);
    const index = currentOrder.indexOf(challengeId);
    if (index > 0) {
      const newOrder = [...currentOrder];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      saveOrder(newOrder);
    }
  }, [orderedChallenges, saveOrder]);

  // Move challenge right in order
  const moveChallengeRight = useCallback((challengeId: string) => {
    const currentOrder = orderedChallenges.map(c => c.id);
    const index = currentOrder.indexOf(challengeId);
    if (index < currentOrder.length - 1) {
      const newOrder = [...currentOrder];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      saveOrder(newOrder);
    }
  }, [orderedChallenges, saveOrder]);

  // Set initial selected challenge - prioritize route param if provided
  useEffect(() => {
    if (initialChallengeId) {
      const match = orderedChallenges.find(c => c.id === initialChallengeId);
      if (match) {
        setSelectedChallengeId(initialChallengeId);
        return;
      }
    }
    if (orderedChallenges.length > 0 && !selectedChallengeId) {
      setSelectedChallengeId(orderedChallenges[0].id);
    }
  }, [orderedChallenges, selectedChallengeId, initialChallengeId]);

  const onRefresh = async () => {
    setRefreshing(true);
    // Load from storage first for instant feedback
    await Promise.all([
      dispatch(loadChallengesFromStorage()),
      dispatch(loadParticipantsFromStorage()),
    ]);
    // Then fetch fresh data from server
    if (session?.access_token && isBackendConfigured()) {
      await Promise.all([
        dispatch(fetchChallengesFromServer(session.access_token)),
        dispatch(fetchParticipantsFromServer(session.access_token)),
      ]);
    }
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Challenge selector tabs (only show if multiple challenges) */}
        {orderedChallenges.length > 1 && (
          <>
            <Text style={[styles.selectorTitle, { color: colors.text }]}>
              Active Challenges
            </Text>
            <Text style={[styles.selectorLabel, { color: colors.textSecondary }]}>
              {isExpoGo || !DraggableFlatList
                ? 'Use arrows to reorder'
                : 'Hold and drag to reorder'}
            </Text>
            {isExpoGo || !DraggableFlatList ? (
              // Expo Go: arrows inside tabs for reordering
              <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.challengeSelector}
              contentContainerStyle={styles.challengeSelectorContent}
            >
              {orderedChallenges.map((challenge, index) => {
                const isSelected = selectedChallengeId === challenge.id;
                const isFirst = index === 0;
                const isLast = index === orderedChallenges.length - 1;
                const arrowColor = isSelected ? 'rgba(255,255,255,0.7)' : colors.textSecondary;
                const disabledColor = isSelected ? 'rgba(255,255,255,0.25)' : colors.border;

                return (
                  <View
                    key={challenge.id}
                    style={[
                      styles.challengeTab,
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: isSelected
                          ? colors.primary
                          : colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => !isFirst && moveChallengeLeft(challenge.id)}
                      disabled={isFirst}
                      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    >
                      <ChevronLeft
                        size={14}
                        color={isFirst ? disabledColor : arrowColor}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setSelectedChallengeId(challenge.id)}
                      style={styles.tabTextContainer}
                    >
                      <Text
                        style={[
                          styles.challengeTabText,
                          {
                            color: isSelected ? '#fff' : colors.text,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {challenge.name}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => !isLast && moveChallengeRight(challenge.id)}
                      disabled={isLast}
                      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    >
                      <ChevronRight
                        size={14}
                        color={isLast ? disabledColor : arrowColor}
                      />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            // Production build: draggable with long press
            <View style={styles.challengeSelector}>
              <DraggableFlatList
                horizontal
                data={orderedChallenges}
                keyExtractor={item => item.id}
                onDragEnd={({ data }) => saveOrder(data.map(c => c.id))}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.challengeSelectorContent}
                renderItem={({ item: challenge, drag, isActive }: any) => {
                  const isSelected = selectedChallengeId === challenge.id;
                  const content = (
                    <TouchableOpacity
                      onLongPress={drag}
                      delayLongPress={150}
                      disabled={isActive}
                      style={[
                        styles.challengeTab,
                        {
                          backgroundColor: isSelected
                            ? colors.primary
                            : colors.surface,
                          borderColor: colors.border,
                          opacity: isActive ? 0.9 : 1,
                        },
                      ]}
                      onPress={() => setSelectedChallengeId(challenge.id)}
                    >
                      <Text
                        style={[
                          styles.challengeTabText,
                          {
                            color: isSelected ? '#fff' : colors.text,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {challenge.name}
                      </Text>
                    </TouchableOpacity>
                  );
                  return ScaleDecorator ? <ScaleDecorator>{content}</ScaleDecorator> : content;
                }}
              />
            </View>
            )}
          </>
        )}

        {/* Challenge info */}
        {orderedChallenges.length > 0 ? (
          <>
            {selectedChallenge && (
              <View style={styles.selectedChallengeHeader}>
                <Text style={[styles.selectedChallengeTitle, { color: colors.text }]}>
                  {selectedChallenge.name}
                </Text>
                <Text style={[styles.selectedChallengeDuration, { color: colors.textSecondary }]}>
                  {selectedChallenge.durationDays} day challenge
                </Text>
              </View>
            )}

            {/* Stats summary - gradient card */}
            {selectedChallenge && (
              <View style={styles.statsCardShadow}>
                <LinearGradient
                  colors={['#A855F7', '#EC4899']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
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
              </View>
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
            <Trophy size={64} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Active Challenges
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Join or create a challenge to see the leaderboard.
            </Text>
          </View>
        )}
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
    paddingBottom: 24,
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 2,
  },
  selectorLabel: {
    fontSize: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  challengeSelector: {
    marginBottom: 8,
  },
  challengeSelectorContent: {
    paddingHorizontal: 16,
    gap: 4,
  },
  challengeTab: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 2,
    gap: 2,
  },
  tabTextContainer: {
    paddingHorizontal: 4,
  },
  challengeTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedChallengeHeader: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
  },
  selectedChallengeTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  selectedChallengeDuration: {
    fontSize: 14,
    marginTop: 2,
  },
  statsCardShadow: {
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
    backgroundColor: '#A855F7',
  },
  statsCard: {
    flexDirection: 'row',
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 26,
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
