import React, { useContext, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import dayjs from 'dayjs';
import { ThemeContext, getColors } from '../theme/ThemeContext';
import { RootState, AppDispatch } from '../redux/store';
import {
  loadBadgesFromStorage,
  fetchBadgesFromServer,
  getPointsForNextLevel,
} from '../redux/slices/badgesSlice';
import { useAuth } from '../context/AuthContext';
import { isBackendConfigured } from '../config/api';
import { BadgeDefinition, UserBadge } from '../types';
import BadgeGrid from '../components/badges/BadgeGrid';
import LevelBadge from '../components/badges/LevelBadge';
import HexBadge from '../components/badges/HexBadge';

type TabType = 'earned' | 'available';

export default function BadgesScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const { session } = useAuth();

  const { definitions, earned, totalPoints, level, loading } = useSelector(
    (state: RootState) => state.badges
  );

  const [activeTab, setActiveTab] = useState<TabType | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Set initial tab based on earned badges (once loaded)
  useEffect(() => {
    if (activeTab === null && definitions.length > 0) {
      setActiveTab(earned.length > 0 ? 'earned' : 'available');
    }
  }, [activeTab, definitions.length, earned.length]);
  const [selectedBadge, setSelectedBadge] = useState<{
    definition: BadgeDefinition;
    userBadge?: UserBadge;
  } | null>(null);

  // Fetch badges on mount if not already loaded
  useEffect(() => {
    if (definitions.length === 0 && session?.access_token && isBackendConfigured()) {
      dispatch(fetchBadgesFromServer(session.access_token));
    }
  }, [definitions.length, session?.access_token, dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(loadBadgesFromStorage());
    if (session?.access_token && isBackendConfigured()) {
      await dispatch(fetchBadgesFromServer(session.access_token));
    }
    setRefreshing(false);
  }, [dispatch, session?.access_token]);

  const handleBadgePress = useCallback(
    (definition: BadgeDefinition, userBadge?: UserBadge) => {
      setSelectedBadge({ definition, userBadge });
    },
    []
  );

  const closeModal = useCallback(() => {
    setSelectedBadge(null);
  }, []);

  // Filter definitions based on active tab
  const earnedBadgeIds = new Set(earned.map(b => b.badgeId));
  const currentTab = activeTab || 'available';
  const filteredDefinitions =
    currentTab === 'earned'
      ? definitions.filter(d => earnedBadgeIds.has(d.id))
      : definitions.filter(d => !earnedBadgeIds.has(d.id));

  const earnedCount = earned.length;
  const availableCount = definitions.length - earnedCount;
  const totalBadges = definitions.length;
  const pointsToNext = getPointsForNextLevel(totalPoints);

  const tabs: { key: TabType; label: string }[] = [
    { key: 'earned', label: `Collection (${earnedCount})` },
    { key: 'available', label: `Available (${availableCount})` },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Level & Progress Section */}
        <View style={[styles.levelSection, { backgroundColor: colors.surface }]}>
          <LevelBadge
            level={level}
            totalPoints={totalPoints}
            size="lg"
            showTitle
            showPoints
          />
          <View style={styles.progressInfo}>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {earnedCount} of {totalBadges} badges earned
            </Text>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {pointsToNext} points to next level
            </Text>
          </View>
          {/* Progress bar */}
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.primary,
                  width: `${Math.min(100, (totalPoints % 10) * 10)}%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                currentTab === tab.key && {
                  borderBottomColor: colors.primary,
                  borderBottomWidth: 2,
                },
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      currentTab === tab.key
                        ? colors.primary
                        : colors.textSecondary,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Badge Grid */}
        {filteredDefinitions.length > 0 ? (
          <BadgeGrid
            definitions={filteredDefinitions}
            earned={earned}
            onBadgePress={handleBadgePress}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons
              name="ribbon-outline"
              size={48}
              color={colors.textTertiary}
            />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {currentTab === 'earned'
                ? 'No badges earned yet. Keep checking in!'
                : 'You\'ve earned all available badges!'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Badge Detail Modal */}
      <Modal
        visible={selectedBadge !== null}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeModal}
        >
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            {selectedBadge && (
              <>
                <HexBadge
                  badge={selectedBadge.definition}
                  earned={!!selectedBadge.userBadge}
                  size="lg"
                  showName={false}
                />
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {selectedBadge.definition.name}
                </Text>
                <Text
                  style={[styles.modalDescription, { color: colors.textSecondary }]}
                >
                  {selectedBadge.definition.description}
                </Text>
                <View style={styles.modalDetails}>
                  <View style={styles.modalDetailItem}>
                    <Ionicons
                      name="star-outline"
                      size={16}
                      color={colors.warning}
                    />
                    <Text style={[styles.modalDetailText, { color: colors.text }]}>
                      {selectedBadge.definition.points} points
                    </Text>
                  </View>
                  {selectedBadge.userBadge && (
                    <View style={styles.modalDetailItem}>
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color={colors.success}
                      />
                      <Text style={[styles.modalDetailText, { color: colors.text }]}>
                        Earned{' '}
                        {dayjs(selectedBadge.userBadge.earnedAt).format(
                          'MMM D, YYYY'
                        )}
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.closeButton, { backgroundColor: colors.primary }]}
                  onPress={closeModal}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  levelSection: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
  },
  progressInfo: {
    marginTop: 16,
    alignItems: 'center',
    gap: 4,
  },
  progressText: {
    fontSize: 13,
  },
  progressBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalContent: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  modalDetails: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 20,
  },
  modalDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalDetailText: {
    fontSize: 13,
  },
  closeButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
