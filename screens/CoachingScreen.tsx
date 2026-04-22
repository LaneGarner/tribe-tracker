import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { API_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { RootState } from '../redux/store';
import { RootStackParamList } from '../types';
import {
  CoachInsightsCacheEntry,
  clearCoachInsights,
  loadCoachInsights,
  saveCoachInsights,
} from '../utils/storage';
import Skeleton from '../components/ui/Skeleton';
import { TAB_BAR_HEIGHT } from '../constants/layout';
import { TabBarGradientFade } from '../components/ui/TabBarGradientFade';

dayjs.extend(relativeTime);

type CoachingNav = NativeStackNavigationProp<RootStackParamList, 'Coaching'>;

interface CoachingEntry {
  challengeId: string;
  opener: string;
  observations: string[];
  gapRead: string;
  thisWeekAsk: string;
}

interface CoachingApiResponse {
  coaching: CoachingEntry[];
  errors: Array<{ challengeId: string; reason: string }>;
  generatedAt: string;
}

async function fetchCoaching(
  token: string,
  challengeIds: string[]
): Promise<CoachingApiResponse> {
  const response = await fetch(`${API_URL}/api/coach`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ challengeIds }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`coach_${response.status}:${text}`);
  }
  return response.json();
}

export default function CoachingScreen() {
  const navigation = useNavigation<CoachingNav>();
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const { session, getAccessToken } = useAuth();
  const userId = session?.user?.id;

  const challenges = useSelector((state: RootState) => state.challenges.data);
  const participants = useSelector((state: RootState) => state.participants.data);

  const activeChallenges = useMemo(() => {
    if (!userId) return [];
    const activeIds = new Set(
      participants
        .filter((p) => p.userId === userId)
        .map((p) => p.challengeId)
    );
    return challenges.filter(
      (c) =>
        activeIds.has(c.id) && (c.status === 'active' || c.status === 'gap')
    );
  }, [challenges, participants, userId]);

  const activeIds = useMemo(
    () => activeChallenges.map((c) => c.id),
    [activeChallenges]
  );
  const activeIdsKey = activeIds.join(',');

  const [coaching, setCoaching] = useState<CoachingEntry[]>([]);
  const [apiErrors, setApiErrors] = useState<
    Array<{ challengeId: string; reason: string }>
  >([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  const hasFetchedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((rm) => {
        if (mounted) setReduceMotion(rm);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const applyResponse = useCallback((resp: CoachingApiResponse) => {
    setCoaching(resp.coaching || []);
    setApiErrors(resp.errors || []);
    setGeneratedAt(resp.generatedAt || new Date().toISOString());
    setError(null);
  }, []);

  const runFetch = useCallback(
    async (opts: { showSkeleton: boolean }) => {
      if (activeIds.length === 0) {
        setCoaching([]);
        setApiErrors([]);
        setGeneratedAt(new Date().toISOString());
        setLoading(false);
        return;
      }
      const token = getAccessToken();
      if (!token) {
        setError('offline');
        setLoading(false);
        return;
      }
      if (opts.showSkeleton) setLoading(true);
      try {
        const resp = await fetchCoaching(token, activeIds);
        applyResponse(resp);
        await saveCoachInsights({
          coaching: resp.coaching || [],
          errors: resp.errors || [],
          generatedAt: resp.generatedAt || new Date().toISOString(),
        });
      } catch (err) {
        console.warn('CoachingScreen fetch failed', err);
        setError(
          typeof err === 'object' && err && 'message' in err
            ? String((err as Error).message)
            : 'unknown'
        );
      } finally {
        setLoading(false);
      }
    },
    [activeIds, applyResponse, getAccessToken]
  );

  // Initial load — read cache, then fetch fresh in the background.
  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    let mounted = true;
    (async () => {
      const cached = await loadCoachInsights();
      if (!mounted) return;
      if (cached) {
        setCoaching(cached.coaching || []);
        setApiErrors(cached.errors || []);
        setGeneratedAt(cached.generatedAt);
        setLoading(false);
      }
      // Always attempt a fresh fetch so the coach reflects latest state.
      await runFetch({ showSkeleton: !cached });
    })();
    return () => {
      mounted = false;
    };
  }, [runFetch]);

  // If the set of active challenges changes (e.g. user joins a new one), refetch.
  const lastIdsKey = useRef<string>(activeIdsKey);
  useEffect(() => {
    if (!hasFetchedRef.current) return;
    if (lastIdsKey.current === activeIdsKey) return;
    lastIdsKey.current = activeIdsKey;
    runFetch({ showSkeleton: false });
  }, [activeIdsKey, runFetch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await clearCoachInsights();
    await runFetch({ showSkeleton: false });
    setRefreshing(false);
  }, [runFetch]);

  const retryChallenge = useCallback(() => {
    runFetch({ showSkeleton: false });
  }, [runFetch]);

  const goToDiscover = useCallback(() => {
    navigation.navigate('Main', { screen: 'Discover' });
  }, [navigation]);

  const subtitle = useMemo(() => {
    const base = 'Generated from your stats';
    if (!generatedAt) return base;
    try {
      return `${base} · Updated ${dayjs(generatedAt).fromNow()}`;
    } catch {
      return base;
    }
  }, [generatedAt]);

  const challengeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of activeChallenges) map.set(c.id, c.name);
    return map;
  }, [activeChallenges]);

  const missingChallengeIds = useMemo(() => {
    const produced = new Set(coaching.map((c) => c.challengeId));
    return activeIds.filter((id) => !produced.has(id));
  }, [activeIds, coaching]);

  const isEmpty = activeChallenges.length === 0;
  const showInitialSkeleton = loading && coaching.length === 0 && !error && !isEmpty;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: TAB_BAR_HEIGHT + 24 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.textSecondary}
          />
        }
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pageTitle, { color: colors.text }]}>
              Your Coach
            </Text>
            <Text style={[styles.subtle, { color: colors.textTertiary }]}>
              {subtitle}
            </Text>
          </View>
          <Ionicons
            name="fitness-outline"
            size={28}
            color={colors.textSecondary}
          />
        </View>

        {isEmpty ? (
          <EmptyState colors={colors} onJoin={goToDiscover} />
        ) : showInitialSkeleton ? (
          <LoadingState colors={colors} count={Math.max(activeChallenges.length, 1)} reduceMotion={reduceMotion} />
        ) : error && coaching.length === 0 ? (
          <OfflineState colors={colors} onRetry={() => runFetch({ showSkeleton: true })} />
        ) : (
          <>
            {coaching.map((entry) => (
              <CoachCard
                key={entry.challengeId}
                entry={entry}
                challengeName={challengeNameById.get(entry.challengeId) || 'Challenge'}
                colors={colors}
              />
            ))}
            {missingChallengeIds.map((id) => (
              <MissingCard
                key={`missing-${id}`}
                colors={colors}
                challengeName={challengeNameById.get(id) || 'Challenge'}
                onRetry={retryChallenge}
              />
            ))}
          </>
        )}
      </ScrollView>
      <TabBarGradientFade />
    </SafeAreaView>
  );
}

function CoachCard({
  entry,
  challengeName,
  colors,
}: {
  entry: CoachingEntry;
  challengeName: string;
  colors: ReturnType<typeof getColors>;
}) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
      accessibilityRole="summary"
      accessibilityLabel={`Coach card for ${challengeName}`}
    >
      <Text style={[styles.cardTitle, { color: colors.textSecondary }]} numberOfLines={1}>
        {challengeName.toUpperCase()}
      </Text>
      <Text style={[styles.cardOpener, { color: colors.text }]}>
        {entry.opener}
      </Text>

      <View style={styles.observations}>
        {entry.observations.map((obs, idx) => (
          <View key={idx} style={styles.observationRow}>
            <View
              style={[
                styles.observationDot,
                { backgroundColor: colors.primary },
              ]}
            />
            <Text
              style={[styles.observationText, { color: colors.text }]}
            >
              {obs}
            </Text>
          </View>
        ))}
      </View>

      <Text style={[styles.gapRead, { color: colors.textSecondary }]}>
        {entry.gapRead}
      </Text>

      <View
        style={[
          styles.askBlock,
          { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.askLabel, { color: colors.textSecondary }]}>
          THIS WEEK
        </Text>
        <Text style={[styles.askText, { color: colors.text }]}>
          {entry.thisWeekAsk}
        </Text>
      </View>
    </View>
  );
}

function MissingCard({
  challengeName,
  colors,
  onRetry,
}: {
  challengeName: string;
  colors: ReturnType<typeof getColors>;
  onRetry: () => void;
}) {
  return (
    <View
      style={[
        styles.card,
        styles.missingCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.cardTitle, { color: colors.textSecondary }]} numberOfLines={1}>
        {challengeName.toUpperCase()}
      </Text>
      <Text style={[styles.missingText, { color: colors.textSecondary }]}>
        Your coach is thinking — tap to retry.
      </Text>
      <TouchableOpacity
        onPress={onRetry}
        style={[styles.retryBtn, { borderColor: colors.border }]}
        accessibilityRole="button"
        accessibilityLabel={`Retry coaching for ${challengeName}`}
        hitSlop={{ top: 14, right: 14, bottom: 14, left: 14 }}
      >
        <Ionicons name="refresh" size={16} color={colors.textSecondary} />
        <Text style={[styles.retryBtnText, { color: colors.textSecondary }]}>
          Retry
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function LoadingState({
  colors,
  count,
  reduceMotion,
}: {
  colors: ReturnType<typeof getColors>;
  count: number;
  reduceMotion: boolean;
}) {
  const n = Math.min(3, Math.max(1, count));
  return (
    <View
      accessibilityLabel="Your coach is thinking"
      accessibilityState={{ busy: true }}
    >
      {Array.from({ length: n }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {reduceMotion ? (
            <>
              <View style={[styles.skeletonStatic, { width: '40%', height: 10, backgroundColor: colors.border }]} />
              <View style={[styles.skeletonStatic, { width: '90%', height: 18, marginTop: 12, backgroundColor: colors.border }]} />
              <View style={[styles.skeletonStatic, { width: '75%', height: 14, marginTop: 8, backgroundColor: colors.border }]} />
              <View style={[styles.skeletonStatic, { width: '80%', height: 14, marginTop: 8, backgroundColor: colors.border }]} />
              <View style={[styles.skeletonStatic, { width: '60%', height: 14, marginTop: 8, backgroundColor: colors.border }]} />
            </>
          ) : (
            <>
              <Skeleton width={'40%'} height={10} />
              <View style={{ height: 12 }} />
              <Skeleton width={'90%'} height={18} />
              <View style={{ height: 14 }} />
              <Skeleton width={'75%'} height={12} />
              <View style={{ height: 8 }} />
              <Skeleton width={'80%'} height={12} />
              <View style={{ height: 8 }} />
              <Skeleton width={'60%'} height={12} />
            </>
          )}
        </View>
      ))}
    </View>
  );
}

function EmptyState({
  colors,
  onJoin,
}: {
  colors: ReturnType<typeof getColors>;
  onJoin: () => void;
}) {
  return (
    <View style={styles.emptyState}>
      <Ionicons
        name="fitness-outline"
        size={72}
        color={colors.textTertiary}
      />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        Join a challenge and I'll start coaching you through it.
      </Text>
      <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
        Once you're in, I'll look at your check-ins and streaks and tell you what to push on each week.
      </Text>
      <TouchableOpacity
        onPress={onJoin}
        style={[styles.cta, { backgroundColor: colors.primary }]}
        accessibilityRole="button"
        accessibilityLabel="Discover challenges"
        hitSlop={{ top: 14, right: 14, bottom: 14, left: 14 }}
      >
        <Text style={styles.ctaText}>Discover Challenges</Text>
      </TouchableOpacity>
    </View>
  );
}

function OfflineState({
  colors,
  onRetry,
}: {
  colors: ReturnType<typeof getColors>;
  onRetry: () => void;
}) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.cardOpener, { color: colors.text }]}>
        I'm offline right now — try again in a minute.
      </Text>
      <TouchableOpacity
        onPress={onRetry}
        style={[styles.retryBtn, { borderColor: colors.border, marginTop: 12 }]}
        accessibilityRole="button"
        accessibilityLabel="Retry loading coaching"
        hitSlop={{ top: 14, right: 14, bottom: 14, left: 14 }}
      >
        <Ionicons name="refresh" size={16} color={colors.textSecondary} />
        <Text style={[styles.retryBtnText, { color: colors.textSecondary }]}>
          Retry
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '700',
  },
  subtle: {
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  missingCard: {
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  cardOpener: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 23,
  },
  observations: {
    marginTop: 12,
  },
  observationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  observationDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 8,
    marginRight: 10,
  },
  observationText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  gapRead: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 19,
    marginTop: 10,
  },
  askBlock: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  askLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  askText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  missingText: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 10,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  cta: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 10,
  },
  ctaText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  skeletonStatic: {
    borderRadius: 6,
  },
});
