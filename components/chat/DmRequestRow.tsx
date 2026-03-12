import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { ThemeContext, getColors } from '../../theme/ThemeContext';
import Avatar from '../Avatar';
import { DmRequest } from '../../types';

dayjs.extend(relativeTime);

interface DmRequestRowProps {
  request: DmRequest;
  onAccept: () => void;
  onReject: () => void;
}

export default function DmRequestRow({ request, onAccept, onReject }: DmRequestRowProps) {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Avatar
        imageUrl={request.fromUserPhotoUrl}
        name={request.fromUserName}
        size={44}
      />
      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {request.fromUserName || 'Unknown'}
        </Text>
        <Text style={[styles.time, { color: colors.textTertiary }]}>
          {dayjs(request.createdAt).fromNow()}
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton, { borderColor: colors.border }]}
          onPress={onReject}
          accessibilityRole="button"
          accessibilityLabel={`Reject message request from ${request.fromUserName}`}
        >
          <Text style={[styles.rejectText, { color: colors.textSecondary }]}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton, { backgroundColor: colors.primary }]}
          onPress={onAccept}
          accessibilityRole="button"
          accessibilityLabel={`Accept message request from ${request.fromUserName}`}
        >
          <Text style={styles.acceptText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  time: {
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  rejectButton: {
    borderWidth: 1,
  },
  rejectText: {
    fontSize: 14,
    fontWeight: '500',
  },
  acceptButton: {},
  acceptText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
