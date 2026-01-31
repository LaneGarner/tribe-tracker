import React, { useContext, useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Animated,
  PanResponder,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import dayjs from 'dayjs';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';

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
import { loadCheckinsFromStorage, fetchCheckinsFromServer } from '../redux/slices/checkinsSlice';
import { loadParticipantsFromStorage, fetchParticipantsFromServer } from '../redux/slices/participantsSlice';
import { useAuth } from '../context/AuthContext';
import { isBackendConfigured } from '../config/api';
import { RootStackParamList, TabParamList, Challenge, HabitCheckin } from '../types';
import { getToday, formatDate, getChallengeStatus, isToday, addDays, subtractDays } from '../utils/dateUtils';
import ChallengeCard from '../components/challenge/ChallengeCard';
import ChallengeCardSkeleton from '../components/challenge/ChallengeCardSkeleton';
import ChallengeChip from '../components/challenge/ChallengeChip';
import HabitChecklist from '../components/challenge/HabitChecklist';
import DateCarousel from '../components/ui/DateCarousel';
import SwipeableView, { SwipeableViewRef } from '../components/ui/SwipeableView';
import Skeleton from '../components/ui/Skeleton';
import ActivityCalendar, { CHALLENGE_COLORS } from '../components/ui/ActivityCalendar';

const CHALLENGE_ORDER_KEY = 'tribe_home_challenge_order';

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const { user, session } = useAuth();
  const insets = useSafeAreaInsets();

  const challenges = useSelector((state: RootState) => state.challenges.data);
  const checkins = useSelector((state: RootState) => state.checkins.data);
  const participants = useSelector((state: RootState) => state.participants.data);
  const challengesLoading = useSelector((state: RootState) => state.challenges.loading);
  const participantsLoading = useSelector((state: RootState) => state.participants.loading);

  // Show skeleton until both challenges and participants have loaded
  const isInitialLoad = (challengesLoading || participantsLoading) && participants.length === 0;

  const [refreshing, setRefreshing] = useState(false);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(
    null
  );
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [displayMonth, setDisplayMonth] = useState(() =>
    dayjs(getToday()).format('YYYY-MM')
  );
  const [challengeOrder, setChallengeOrder] = useState<string[]>([]);
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);
  const [helpButtonPosition, setHelpButtonPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const helpButtonRef = useRef<View>(null);
  const scrollOffsetRef = useRef(0);
  const carouselLayoutYRef = useRef(0);

  // Ref for swipeable animations
  const swipeableRef = useRef<SwipeableViewRef>(null);
  const calendarSwipeRef = useRef<SwipeableViewRef>(null);
  const challengeSwipeRef = useRef<SwipeableViewRef>(null);
  const pillsScrollRef = useRef<ScrollView | any>(null);
  const pillPositions = useRef<Record<string, { x: number; width: number }>>({});

  // Points badge swipe state
  const [badgeHidden, setBadgeHidden] = useState(false);
  const badgeHiddenRef = useRef(badgeHidden);
  const badgeTranslateX = useRef(new Animated.Value(0)).current;
  const BADGE_WIDTH = 70;
  const HIDDEN_OFFSET = BADGE_WIDTH + 10; // How far off-screen when hidden

  // Keep ref in sync with state
  useEffect(() => {
    badgeHiddenRef.current = badgeHidden;
  }, [badgeHidden]);

  // Pan responder for badge swipe
  const badgePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture horizontal swipes
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        const isHidden = badgeHiddenRef.current;
        // Only allow dragging right (positive dx) when visible, or left when hidden
        if (!isHidden && gestureState.dx > 0) {
          badgeTranslateX.setValue(gestureState.dx);
        } else if (isHidden && gestureState.dx < 0) {
          badgeTranslateX.setValue(HIDDEN_OFFSET + gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const isHidden = badgeHiddenRef.current;
        if (!isHidden) {
          // If swiped right more than 30px, hide it
          if (gestureState.dx > 30) {
            setBadgeHidden(true);
            Animated.spring(badgeTranslateX, {
              toValue: HIDDEN_OFFSET,
              useNativeDriver: true,
              friction: 8,
            }).start();
          } else {
            // Snap back
            Animated.spring(badgeTranslateX, {
              toValue: 0,
              useNativeDriver: true,
              friction: 8,
            }).start();
          }
        } else {
          // If swiped left more than 30px, show it
          if (gestureState.dx < -30) {
            Animated.spring(badgeTranslateX, {
              toValue: 0,
              useNativeDriver: true,
              friction: 8,
            }).start(() => setBadgeHidden(false));
          } else {
            // Snap back to hidden
            Animated.spring(badgeTranslateX, {
              toValue: HIDDEN_OFFSET,
              useNativeDriver: true,
              friction: 8,
            }).start();
          }
        }
      },
    })
  ).current;

  // Handle tap on indicator to show badge
  const showBadge = useCallback(() => {
    setBadgeHidden(false);
    Animated.spring(badgeTranslateX, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [badgeTranslateX]);

  // Interpolate opacity - badge fades out as it slides, indicator fades in
  const badgeOpacity = badgeTranslateX.interpolate({
    inputRange: [0, HIDDEN_OFFSET],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const indicatorOpacity = badgeTranslateX.interpolate({
    inputRange: [0, HIDDEN_OFFSET * 0.5, HIDDEN_OFFSET],
    outputRange: [0, 0.3, 1],
    extrapolate: 'clamp',
  });

  // Scroll animation - separate values for native (transform/opacity) and JS (layout) animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollYLayout = useRef(new Animated.Value(0)).current;

  // Text fades out over first 40px of scroll
  const textOpacity = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Logo scales from 1 to 0.6 over first 80px of scroll
  const logoScale = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0.6],
    extrapolate: 'clamp',
  });

  // Header height shrinks as logo shrinks (uses JS driver since height can't use native)
  const headerHeight = scrollYLayout.interpolate({
    inputRange: [0, 80],
    outputRange: [72, 30],
    extrapolate: 'clamp',
  });


  // Load data on mount
  useEffect(() => {
    dispatch(loadChallengesFromStorage());
    dispatch(loadCheckinsFromStorage());
    dispatch(loadParticipantsFromStorage());
  }, [dispatch]);

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

  // Get challenge IDs the user has joined
  const userChallengeIds = new Set(
    participants.filter(p => p.userId === user?.id).map(p => p.challengeId)
  );

  // Filter to only show active challenges the user has joined
  const activeChallenges = challenges.filter(
    c =>
      userChallengeIds.has(c.id) &&
      getChallengeStatus(c.startDate, c.endDate || c.startDate) === 'active'
  );

  // Sort active challenges by saved order
  const orderedChallenges = [...activeChallenges].sort((a, b) => {
    const indexA = challengeOrder.indexOf(a.id);
    const indexB = challengeOrder.indexOf(b.id);
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

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

  // Set initial selected challenge - only from user's joined challenges
  useEffect(() => {
    if (orderedChallenges.length > 0 && !selectedChallengeId) {
      setSelectedChallengeId(orderedChallenges[0].id);
    } else if (orderedChallenges.length > 0 && selectedChallengeId && !userChallengeIds.has(selectedChallengeId)) {
      // Reset if selected challenge is no longer in user's list
      setSelectedChallengeId(orderedChallenges[0].id);
    }
  }, [orderedChallenges, selectedChallengeId, userChallengeIds]);

  const onRefresh = async () => {
    setRefreshing(true);
    // First load from storage for instant feedback
    await Promise.all([
      dispatch(loadChallengesFromStorage()),
      dispatch(loadCheckinsFromStorage()),
      dispatch(loadParticipantsFromStorage()),
    ]);
    // Then fetch fresh data from server if authenticated
    if (user && session?.access_token && isBackendConfigured()) {
      await Promise.all([
        dispatch(fetchChallengesFromServer(session.access_token)),
        dispatch(fetchCheckinsFromServer(session.access_token)),
        dispatch(fetchParticipantsFromServer(session.access_token)),
      ]);
    }
    setRefreshing(false);
  };

  const selectedChallenge = challenges.find(c => c.id === selectedChallengeId);

  // Get checkin for selected date and challenge
  const dateCheckin = checkins.find(
    c =>
      c.challengeId === selectedChallengeId &&
      c.userId === user?.id &&
      c.checkinDate === selectedDate
  );

  // Get the minimum date (challenge start date) for the date carousel
  const minDateForCarousel = selectedChallenge?.startDate;

  // Swipe handlers for date navigation
  const today = getToday();
  // Normalize dates to YYYY-MM-DD for consistent comparison
  const selectedNormalized = dayjs(selectedDate).format('YYYY-MM-DD');
  const minNormalized = minDateForCarousel ? dayjs(minDateForCarousel).format('YYYY-MM-DD') : null;
  const canSwipeForward = selectedNormalized < today;
  const canSwipeBack = !minNormalized || selectedNormalized > minNormalized;

  const handleSwipeLeft = () => {
    // Swipe left = go forward in time (next day)
    if (canSwipeForward) {
      setSelectedDate(addDays(selectedDate, 1));
    }
  };

  const handleSwipeRight = () => {
    // Swipe right = go back in time (previous day)
    if (canSwipeBack) {
      setSelectedDate(subtractDays(selectedDate, 1));
    }
  };

  // Arrow button handlers - trigger animation via ref
  const handleArrowPrevious = () => {
    swipeableRef.current?.animateRight();
  };

  const handleArrowNext = () => {
    swipeableRef.current?.animateLeft();
  };

  // Get user's participation in selected challenge
  const userParticipation = participants.find(
    p => p.challengeId === selectedChallengeId && p.userId === user?.id
  );

  // Generate challenge colors for calendar
  const challengeColors = useMemo(() => {
    const colorMap: Record<string, string> = {};
    activeChallenges.forEach((challenge, index) => {
      colorMap[challenge.id] = CHALLENGE_COLORS[index % CHALLENGE_COLORS.length];
    });
    return colorMap;
  }, [activeChallenges]);

  // Calculate month range from active challenges
  const { minMonth, maxMonth } = useMemo(() => {
    if (activeChallenges.length === 0) return { minMonth: null, maxMonth: null };

    const earliest = activeChallenges.reduce((min, c) =>
      c.startDate < min ? c.startDate : min, activeChallenges[0].startDate);

    const latest = activeChallenges.reduce((max, c) => {
      const end = c.endDate || today;
      return end > max ? end : max;
    }, today);

    return {
      minMonth: dayjs(earliest).format('YYYY-MM'),
      maxMonth: dayjs(latest).format('YYYY-MM'),
    };
  }, [activeChallenges, today]);

  // Calendar month swipe handlers
  const handleCalendarSwipeLeft = () => {
    // Next month
    const next = dayjs(displayMonth + '-01').add(1, 'month').format('YYYY-MM');
    if (!maxMonth || next <= maxMonth) {
      setDisplayMonth(next);
    }
  };

  const handleCalendarSwipeRight = () => {
    // Previous month
    const prev = dayjs(displayMonth + '-01').subtract(1, 'month').format('YYYY-MM');
    if (!minMonth || prev >= minMonth) {
      setDisplayMonth(prev);
    }
  };

  // Handle date selection - sync month display if needed
  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    const dateMonth = dayjs(date).format('YYYY-MM');
    if (dateMonth !== displayMonth) {
      setDisplayMonth(dateMonth);
    }
  };

  // Challenge carousel handlers
  const currentChallengeIndex = orderedChallenges.findIndex(c => c.id === selectedChallengeId);
  const canSwipeNextChallenge = currentChallengeIndex < orderedChallenges.length - 1;
  const canSwipePrevChallenge = currentChallengeIndex > 0;

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

  const handleChallengeSwipeLeft = useCallback(() => {
    // Swipe left = go to next challenge
    if (canSwipeNextChallenge) {
      const nextIndex = currentChallengeIndex + 1;
      const nextChallenge = orderedChallenges[nextIndex];
      setSelectedChallengeId(nextChallenge.id);
      scrollPillIntoView(nextChallenge.id, nextIndex);
    }
  }, [canSwipeNextChallenge, currentChallengeIndex, orderedChallenges, scrollPillIntoView]);

  const handleChallengeSwipeRight = useCallback(() => {
    // Swipe right = go to previous challenge
    if (canSwipePrevChallenge) {
      const prevIndex = currentChallengeIndex - 1;
      const prevChallenge = orderedChallenges[prevIndex];
      setSelectedChallengeId(prevChallenge.id);
      scrollPillIntoView(prevChallenge.id, prevIndex);
    }
  }, [canSwipePrevChallenge, currentChallengeIndex, orderedChallenges, scrollPillIntoView]);

  // Get user's checkins for the calendar
  const userCheckins = useMemo(() => {
    return checkins.filter(c => c.userId === user?.id);
  }, [checkins, user?.id]);

  // Calculate today's points for the floating badge
  const todayPoints = useMemo(() => {
    const todayDate = getToday();
    let completed = 0;
    let total = 0;

    activeChallenges.forEach(challenge => {
      const habitCount = challenge.habits?.length || 0;
      total += habitCount;

      const todayCheckin = checkins.find(
        c => c.challengeId === challenge.id &&
             c.userId === user?.id &&
             c.checkinDate === todayDate
      );

      if (todayCheckin) {
        completed += todayCheckin.habitsCompleted.filter(h => h).length;
      }
    });

    return { completed, total };
  }, [activeChallenges, checkins, user?.id]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* Sticky logo header */}
      <Animated.View style={[styles.stickyHeader, { backgroundColor: colors.background, height: headerHeight }]}>
        <Animated.Image
          source={require('../assets/images/TT-logo.png')}
          style={[styles.logo, { transform: [{ scale: logoScale }] }]}
          // resizeMode="contain"
        />
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onScroll={(event: any) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          scrollOffsetRef.current = offsetY;
          // Update both animated values - scrollY uses native driver, scrollYLayout uses JS
          scrollY.setValue(offsetY);
          scrollYLayout.setValue(offsetY);
        }}
        scrollEventThrottle={16}
        stickyHeaderIndices={orderedChallenges.length > 1 ? [2] : undefined}
      >
        {/* TribeTracker text - scrolls away and fades */}
        <Animated.Text style={[styles.logoText, { color: colors.text, opacity: textOpacity }]}>
          TribeTracker
        </Animated.Text>
        <Animated.Text style={[styles.logoSubtitle, { color: colors.textSecondary, opacity: textOpacity }]}>
          Build your streak today.
        </Animated.Text>

        {/* Challenge selector - sticks to top when scrolling */}
        {orderedChallenges.length > 1 && (
          <View
            style={[styles.stickyCarouselContainer, { backgroundColor: colors.background }]}
            onLayout={(event) => {
              carouselLayoutYRef.current = event.nativeEvent.layout.y;
            }}
          >
            <View style={styles.selectorHeader}>
              <View ref={helpButtonRef}>
                <TouchableOpacity
                  onPress={() => {
                    if (showHelpTooltip) {
                      setShowHelpTooltip(false);
                    } else {
                      helpButtonRef.current?.measureInWindow((buttonX, buttonY, buttonWidth, buttonHeight) => {
                        // When sticky, measureInWindow can return incorrect Y values
                        // Use a minimum Y based on where the sticky header actually appears
                        const isSticky = scrollOffsetRef.current > carouselLayoutYRef.current;
                        // When sticky: safe area + collapsed header height (30)
                        const minStickyY = insets.top + 30;
                        const correctedY = isSticky ? Math.max(buttonY, minStickyY) : buttonY;
                        setHelpButtonPosition({ x: buttonX, y: correctedY, width: buttonWidth, height: buttonHeight });
                        setShowHelpTooltip(true);
                      });
                    }
                  }}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={styles.helpButton}
                  accessibilityLabel="Help"
                  accessibilityRole="button"
                >
                  <Ionicons name="help-circle-outline" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.selectorTitle, { color: colors.text }]}>
                Challenges
              </Text>
            </View>
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
          </View>
        )}

        {/* Selected challenge card */}
        {isInitialLoad ? (
          <>
            <ChallengeCardSkeleton />
            <View style={styles.section}>
              <Skeleton width={120} height={18} style={{ marginBottom: 12 }} />
              <View style={[styles.habitSkeletonContainer, { backgroundColor: colors.surface }]}>
                <Skeleton width="70%" height={16} style={{ marginBottom: 12 }} />
                <Skeleton width="60%" height={16} style={{ marginBottom: 12 }} />
                <Skeleton width="50%" height={16} />
              </View>
            </View>
          </>
        ) : selectedChallenge ? (
          <>
            <SwipeableView
              ref={challengeSwipeRef}
              onSwipeLeft={handleChallengeSwipeLeft}
              onSwipeRight={handleChallengeSwipeRight}
              canSwipeLeft={canSwipeNextChallenge}
              canSwipeRight={canSwipePrevChallenge}
            >
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('ChallengeDetail', {
                    challengeId: selectedChallenge.id,
                  })
                }
                activeOpacity={0.9}
              >
                <ChallengeCard
                  challenge={selectedChallenge}
                  participation={userParticipation}
                />
              </TouchableOpacity>

              {/* Leaderboard Link */}
              <TouchableOpacity
                style={styles.leaderboardLink}
                onPress={() => navigation.navigate('Leaderboard', { challengeId: selectedChallengeId || undefined })}
              >
                <Ionicons name="trophy-outline" size={16} color={colors.primary} />
                <Text style={[styles.leaderboardLinkText, { color: colors.primary }]}>
                  View Leaderboard
                </Text>
                <Ionicons name="chevron-forward" size={14} color={colors.primary} />
              </TouchableOpacity>
            </SwipeableView>

            {/* Swipeable date section */}
            <View style={styles.dateSection}>
              {/* Habits header and date - fixed above swipeable content */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {isToday(selectedDate) ? "Today's Habits" : 'Habits'}
                </Text>
                <View style={styles.dateRow}>
                  <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                    {formatDate(selectedDate, 'dddd, MMMM D')}
                  </Text>
                  {!isToday(selectedDate) && (
                    <View style={[styles.pastDayBadge, { borderColor: colors.primary }]}>
                      <Text style={[styles.pastDayBadgeText, { color: colors.primary }]}>
                        Editing Past Day
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <SwipeableView
                ref={swipeableRef}
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
                canSwipeLeft={canSwipeForward}
                canSwipeRight={canSwipeBack}
              >
              {/* Date carousel */}
              <DateCarousel
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                minDate={minDateForCarousel}
                onPrevious={handleArrowPrevious}
                onNext={handleArrowNext}
              />

              {/* Habits checklist */}
              <View style={styles.habitListSection}>
                <HabitChecklist
                  challenge={selectedChallenge}
                  checkin={dateCheckin}
                  date={selectedDate}
                />
              </View>
              </SwipeableView>
            </View>

            {/* Activity Calendar */}
            <View style={styles.calendarSection}>
              <Text style={[styles.sectionTitle, styles.calendarSectionTitle, { color: colors.text }]}>
                Calendar
              </Text>
              <SwipeableView
                ref={calendarSwipeRef}
                onSwipeLeft={handleCalendarSwipeLeft}
                onSwipeRight={handleCalendarSwipeRight}
                canSwipeLeft={!maxMonth || dayjs(displayMonth + '-01').add(1, 'month').format('YYYY-MM') <= maxMonth}
                canSwipeRight={!minMonth || dayjs(displayMonth + '-01').subtract(1, 'month').format('YYYY-MM') >= minMonth}
              >
                <ActivityCalendar
                  challenges={activeChallenges}
                  checkins={userCheckins}
                  selectedDate={selectedDate}
                  onDateSelect={handleDateSelect}
                  challengeColors={challengeColors}
                  displayMonth={displayMonth}
                  onMonthChange={setDisplayMonth}
                  minMonth={minMonth ?? undefined}
                  maxMonth={maxMonth ?? undefined}
                  onPrevious={() => calendarSwipeRef.current?.animateRight()}
                  onNext={() => calendarSwipeRef.current?.animateLeft()}
                />
              </SwipeableView>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons
              name="trophy-outline"
              size={64}
              color={colors.textTertiary}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Active Challenges
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Join a challenge or create your own to get started!
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: colors.primary }]}
              onPress={() => (navigation as any).navigate('Challenges')}
            >
              <Ionicons name="search" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.emptyButtonText}>Find Challenges</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.textButton}
              onPress={() => navigation.navigate('CreateChallenge', { mode: 'create' })}
            >
              <Text style={[styles.textButtonText, { color: colors.primary }]}>
                or create your own
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.ScrollView>

      {/* Floating Points Badge */}
      {activeChallenges.length > 0 && (
        <>
          {/* Collapsed indicator - fades in as badge slides out */}
          <Animated.View
            style={[styles.badgeIndicator, { opacity: indicatorOpacity }]}
            pointerEvents="auto"
          >
            <TouchableOpacity onPress={showBadge} activeOpacity={0.8} hitSlop={{ top: 32, bottom: 32, left: 32, right: 32 }}>
              <LinearGradient
                colors={['#F97316', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.badgeIndicatorGradient}
              >
                <Ionicons name="chevron-back" size={14} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Main badge */}
          <Animated.View
            style={[
              styles.pointsBadgeContainer,
              {
                transform: [{ translateX: badgeTranslateX }],
                opacity: badgeOpacity,
              },
            ]}
            {...badgePanResponder.panHandlers}
          >
            <LinearGradient
              colors={['#F97316', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pointsBadge}
            >
              <Text style={styles.pointsBadgeLabel}>Today</Text>
              <Text style={styles.pointsBadgeValue}>
                {todayPoints.completed}/{todayPoints.total}
              </Text>
              <Text style={styles.pointsBadgeLabel}>pts</Text>
            </LinearGradient>
          </Animated.View>
        </>
      )}

      {/* Help Tooltip - positioned based on help button */}
      {showHelpTooltip && helpButtonPosition && (() => {
        const tooltipWidth = 260;
        const arrowSize = 8;
        const buttonCenterX = helpButtonPosition.x + helpButtonPosition.width / 2;
        const tooltipLeft = Math.max(16, Math.min(buttonCenterX - 40, 400 - tooltipWidth - 16));
        const arrowLeft = buttonCenterX - tooltipLeft - arrowSize;
        const tooltipTop = helpButtonPosition.y + helpButtonPosition.height + arrowSize;

        return (
        <>
          <TouchableOpacity
            style={styles.tooltipBackdrop}
            activeOpacity={1}
            onPress={() => setShowHelpTooltip(false)}
          />
          <View
            style={[
              styles.helpTooltip,
              {
                top: tooltipTop,
                left: tooltipLeft,
              },
            ]}
          >
            <View
              style={[
                styles.helpTooltipArrow,
                { left: arrowLeft },
              ]}
            />
            <Text style={styles.helpTooltipText}>
              Tap a challenge to select it, then check off habits below. Tap the card for details or swipe to switch.{' '}
              {isExpoGo || !DraggableFlatList
                ? 'Use arrows to reorder challenges.'
                : 'Hold and drag to reorder challenges.'}
            </Text>
            <TouchableOpacity
              onPress={() => setShowHelpTooltip(false)}
              style={styles.helpTooltipClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Close tooltip"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={16} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>
        </>
        );
      })()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stickyHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  stickyCarouselContainer: {
    paddingBottom: 8,
    zIndex: 11,
  },
  logo: {
    width: 56,
    height: 56,
  },
  logoText: {
    fontSize: 24,
    fontFamily: 'Kanit_700Bold',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  logoSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Extra padding for floating badge
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -8,
    marginBottom: 4,
    gap: 8,
  },
  dateText: {
    fontSize: 14,
  },
  pastDayBadge: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pastDayBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  selectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 0,
    marginBottom: 2,
  },
  selectorTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  helpButton: {
    marginRight: 6,
    padding: 2,
  },
  tooltipBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  helpTooltip: {
    position: 'absolute',
    zIndex: 100,
    backgroundColor: '#1F2937',
    padding: 14,
    paddingRight: 36,
    borderRadius: 10,
    width: 260,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  helpTooltipText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#F3F4F6',
  },
  helpTooltipClose: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  helpTooltipArrow: {
    position: 'absolute',
    top: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#1F2937',
  },
  challengeSelector: {
    marginTop: 8,
  },
  challengeSelectorContent: {
    paddingHorizontal: 20,
  },
  dateSection: {
    marginTop: 10,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  textButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    marginTop: 8,
  },
  textButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  habitSkeletonContainer: {
    padding: 16,
    borderRadius: 12,
  },
  calendarSection: {
    marginTop: 24,
  },
  calendarSectionTitle: {
    paddingHorizontal: 20,
  },
  habitListSection: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  leaderboardLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 16,
    paddingVertical: 8,
  },
  leaderboardLinkText: {
    fontSize: 13,
    fontWeight: '500',
  },
  pointsBadgeContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  pointsBadge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  pointsBadgeLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  pointsBadgeValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  badgeIndicator: {
    position: 'absolute',
    bottom: 40 - 32,
    right: -32,
    padding: 32,
    zIndex: 10,
  },
  badgeIndicatorGradient: {
    width: 24,
    height: 48,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 4,
    shadowColor: '#000',
    shadowOffset: { width: -1, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
});
