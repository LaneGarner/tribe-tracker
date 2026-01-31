import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
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
import { Trophy } from 'lucide-react-native';

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
import ChallengeChip from '../components/challenge/ChallengeChip';
import SwipeableView, { SwipeableViewRef } from '../components/ui/SwipeableView';
import { TAB_BAR_HEIGHT } from '../navigation/TabNavigator';

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
  const challengeSwipeRef = useRef<SwipeableViewRef>(null);
  const pillsScrollRef = useRef<ScrollView | any>(null);
  const pillPositions = useRef<Record<string, { x: number; width: number }>>({});

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

  // Challenge carousel boundary detection
  const currentChallengeIndex = orderedChallenges.findIndex(c => c.id === selectedChallengeId);
  const canSwipeNextChallenge = currentChallengeIndex < orderedChallenges.length - 1;
  const canSwipePrevChallenge = currentChallengeIndex > 0;

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

  // Scroll chip into view when swiping between challenges
  const scrollPillIntoView = useCallback((challengeId: string, index: number) => {
    if (!pillsScrollRef.current) return;

    // For DraggableFlatList (production builds), use scrollToIndex
    if (pillsScrollRef.current.scrollToIndex) {
      pillsScrollRef.current.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5 // Center the item
      });
    } else if (pillsScrollRef.current.scrollTo) {
      // For ScrollView (Expo Go), use pixel-based scrolling
      const pos = pillPositions.current[challengeId];
      if (pos) {
        const offset = Math.max(0, pos.x - 100);
        pillsScrollRef.current.scrollTo({ x: offset, animated: true });
      }
    }
  }, []);

  // Challenge swipe handlers
  const handleChallengeSwipeLeft = useCallback(() => {
    if (canSwipeNextChallenge) {
      const nextIndex = currentChallengeIndex + 1;
      const nextChallenge = orderedChallenges[nextIndex];
      setSelectedChallengeId(nextChallenge.id);
      scrollPillIntoView(nextChallenge.id, nextIndex);
    }
  }, [canSwipeNextChallenge, currentChallengeIndex, orderedChallenges, scrollPillIntoView]);

  const handleChallengeSwipeRight = useCallback(() => {
    if (canSwipePrevChallenge) {
      const prevIndex = currentChallengeIndex - 1;
      const prevChallenge = orderedChallenges[prevIndex];
      setSelectedChallengeId(prevChallenge.id);
      scrollPillIntoView(prevChallenge.id, prevIndex);
    }
  }, [canSwipePrevChallenge, currentChallengeIndex, orderedChallenges, scrollPillIntoView]);

  // Set initial selected challenge - prioritize route param if provided
  useEffect(() => {
    if (initialChallengeId) {
      const index = orderedChallenges.findIndex(c => c.id === initialChallengeId);
      if (index !== -1) {
        setSelectedChallengeId(initialChallengeId);
        // Scroll chip into view after a brief delay to ensure layout is ready
        setTimeout(() => scrollPillIntoView(initialChallengeId, index), 100);
        return;
      }
    }
    if (orderedChallenges.length > 0 && !selectedChallengeId) {
      setSelectedChallengeId(orderedChallenges[0].id);
    }
  }, [orderedChallenges, selectedChallengeId, initialChallengeId, scrollPillIntoView]);

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
              // Expo Go: arrows inside chips for reordering
              <ScrollView
                ref={pillsScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.challengeSelector}
                contentContainerStyle={styles.challengeSelectorContent}
              >
                {orderedChallenges.map((challenge, index) => (
                  <ChallengeChip
                    key={challenge.id}
                    name={challenge.name}
                    isSelected={selectedChallengeId === challenge.id}
                    onPress={() => {
                      setSelectedChallengeId(challenge.id);
                      scrollPillIntoView(challenge.id, index);
                    }}
                    onLayout={(e) => {
                      pillPositions.current[challenge.id] = {
                        x: e.nativeEvent.layout.x,
                        width: e.nativeEvent.layout.width,
                      };
                    }}
                    showArrows
                    onMoveLeft={() => moveChallengeLeft(challenge.id)}
                    onMoveRight={() => moveChallengeRight(challenge.id)}
                    isFirst={index === 0}
                    isLast={index === orderedChallenges.length - 1}
                  />
                ))}
              </ScrollView>
            ) : (
            // Production build: draggable with long press
              <View style={styles.challengeSelector}>
                <DraggableFlatList
                  ref={pillsScrollRef}
                  horizontal
                  data={orderedChallenges}
                  keyExtractor={(item: Challenge) => item.id}
                  onDragEnd={({ data }: { data: Challenge[] }) => saveOrder(data.map(c => c.id))}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.challengeSelectorContent}
                  renderItem={({ item: challenge, drag, isActive, getIndex }: any) => {
                    const isSelected = selectedChallengeId === challenge.id;
                    const content = (
                      <ChallengeChip
                        name={challenge.name}
                        isSelected={isSelected}
                        onPress={() => {
                          setSelectedChallengeId(challenge.id);
                          scrollPillIntoView(challenge.id, getIndex() ?? 0);
                        }}
                        onLongPress={drag}
                        disabled={isActive}
                        onLayout={(e) => {
                          pillPositions.current[challenge.id] = {
                            x: e.nativeEvent.layout.x,
                            width: e.nativeEvent.layout.width,
                          };
                        }}
                      />
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
          <SwipeableView
            ref={challengeSwipeRef}
            onSwipeLeft={handleChallengeSwipeLeft}
            onSwipeRight={handleChallengeSwipeRight}
            canSwipeLeft={canSwipeNextChallenge}
            canSwipeRight={canSwipePrevChallenge}
          >
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
              challengeId={selectedChallenge?.id}
              challengeStartDate={selectedChallenge?.startDate}
            />
          </SwipeableView>
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
    paddingBottom: TAB_BAR_HEIGHT,
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
