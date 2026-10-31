import React, { useCallback, useContext, useEffect, useLayoutEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, Platform, FlatList } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { AppDispatch, RootState } from '../redux/store';
import { fetchChallengesFromServer, fetchPublicChallenges } from '../redux/slices/challengesSlice';
import { fetchParticipantsFromServer } from '../redux/slices/participantsSlice';
import { RootStackParamList, Challenge } from '../types';
import { CHALLENGE_CATEGORIES } from '../constants/categories';
import { getDiscoverChallengeSections, discoverCategoryKey, rankDiscoverChallenges } from '../utils/discoverChallenges';
import PublicChallengeCard from '../components/challenge/PublicChallengeCard';
import { PublicChallengeListSkeleton } from '../components/challenge/PublicChallengeCardSkeleton';
import { ResponsiveGrid } from '../components/layout';
import { isBackendConfigured } from '../config/api';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

export default function DiscoverCategoryScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'DiscoverCategory'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const dispatch = useDispatch<AppDispatch>();
  const { user, getAccessToken } = useAuth();
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const { gutter, insets } = useResponsiveLayout();
  const category = CHALLENGE_CATEGORIES.find(c => c.key === params.categoryKey);
  const challenges = useSelector((state: RootState) => state.challenges.data);
  const participants = useSelector((state: RootState) => state.participants.data);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: category?.label || 'Category' });
  }, [navigation, category?.label]);

  const refresh = useCallback(async () => {
    const token = getAccessToken();
    if (!token || !isBackendConfigured()) return;
    setFailed(false);
    try {
      await Promise.all([
        dispatch(fetchChallengesFromServer(token)).unwrap(),
        dispatch(fetchParticipantsFromServer(token)).unwrap(),
      ]);
      await dispatch(fetchPublicChallenges(token)).unwrap();
    } catch {
      setFailed(true);
    }
  }, [dispatch, getAccessToken]);

  useEffect(() => {
    let active = true;
    refresh().finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refresh]);

  const joinedIds = new Set(participants.filter(p => p.userId === user?.id).map(p => p.challengeId));
  const { upcoming, active } = getDiscoverChallengeSections(
    challenges.filter(c => category && discoverCategoryKey(c) === category.key), joinedIds
  );
  const renderCard = (challenge: Challenge) => (
    <PublicChallengeCard challenge={challenge}
      accessLabel={joinedIds.has(challenge.id) ? 'Joined' : undefined}
      onPress={() => navigation.navigate('ChallengeDetail', { challengeId: challenge.id })} />
  );
  const section = (title: string, list: Challenge[], isUpcoming: boolean) => {
    if (!list.length) return null;
    const cards = rankDiscoverChallenges(list, isUpcoming).map(challenge => (
      <View key={challenge.id}>{renderCard(challenge)}</View>
    ));
    return (
      <View style={styles.section}>
        <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }]}>{title} · {list.length}</Text>
        {Platform.OS === 'web'
          ? <ResponsiveGrid compactColumns={1} mediumColumns={2} wideColumns={3}>{cards}</ResponsiveGrid>
          : cards}
      </View>
    );
  };

  const contentStyle = [styles.content, {
    paddingLeft: gutter + insets.left,
    paddingRight: gutter + insets.right,
    paddingBottom: Math.max(insets.bottom, 24) + 24,
  }];
  const onRefresh = async () => {
    setRefreshing(true);
    try { await refresh(); } finally { setRefreshing(false); }
  };
  if (Platform.OS !== 'web') {
    type Row = { key: string; title: string } | { key: string; challenge: Challenge };
    const rows: Row[] = [];
    for (const [title, list, isUpcoming] of [['Upcoming', upcoming, true], ['Active', active, false]] as const) {
      if (!list.length) continue;
      rows.push({ key: title, title: `${title} · ${list.length}` });
      rows.push(...rankDiscoverChallenges(list, isUpcoming).map(challenge => ({ key: challenge.id, challenge })));
    }
    return <FlatList data={rows} keyExtractor={row => row.key}
      style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={contentStyle}
      initialNumToRender={8} maxToRenderPerBatch={8} windowSize={7}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={failed ? <Text style={[styles.notice, { color: colors.textSecondary }]}>Couldn’t refresh challenges. Pull down to try again.</Text> : null}
      ListEmptyComponent={loading ? <PublicChallengeListSkeleton count={3} /> : !failed ?
        <Text style={[styles.notice, { color: colors.textSecondary }]}>{category ? 'No upcoming or active challenges in this category yet.' : 'Category not found.'}</Text> : null}
      renderItem={({ item }) => 'title' in item
        ? <Text accessibilityRole="header" style={[styles.heading, { color: colors.text, marginTop: item.key === 'Active' && upcoming.length ? 24 : 0 }]}>{item.title}</Text>
        : renderCard(item.challenge)} />;
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={contentStyle}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {loading && !upcoming.length && !active.length ? <PublicChallengeListSkeleton count={3} /> : <>
        {failed && <Text style={[styles.notice, { color: colors.textSecondary }]}>Couldn’t refresh challenges. Pull down to try again.</Text>}
        {section('Upcoming', upcoming, true)}
        {section('Active', active, false)}
        {!failed && !upcoming.length && !active.length && <Text style={[styles.notice, { color: colors.textSecondary }]}>
          {category ? 'No upcoming or active challenges in this category yet.' : 'Category not found.'}
        </Text>}
      </>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 24, width: '100%', maxWidth: 1200, alignSelf: 'center' },
  section: { marginBottom: 24 },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  notice: { margin: 24, textAlign: 'center', fontSize: 16 },
});
