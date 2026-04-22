import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext, getColors } from '../../theme/ThemeContext';
import ReplyingToChip from './ReplyingToChip';

export interface ReplyContext {
  messageId: string;
  senderName: string;
  preview: string;
}

export interface EditContext {
  messageId: string;
  content: string;
}

interface ChatInputProps {
  onSend: (text: string, replyToMessageId?: string) => void;
  onEdit?: (messageId: string, content: string) => void;
  onTyping?: () => void;
  disabled?: boolean;
  placeholder?: string;
  replyingTo?: ReplyContext | null;
  onCancelReply?: () => void;
  editing?: EditContext | null;
  onCancelEdit?: () => void;
}

export default function ChatInput({
  onSend,
  onEdit,
  onTyping,
  disabled = false,
  placeholder = 'Message...',
  replyingTo,
  onCancelReply,
  editing,
  onCancelEdit,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);
  const inputRef = useRef<TextInput | null>(null);
  const lastEditIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (editing && editing.messageId !== lastEditIdRef.current) {
      lastEditIdRef.current = editing.messageId;
      setText(editing.content);
      // focus after state settles
      setTimeout(() => inputRef.current?.focus(), 50);
    } else if (!editing) {
      lastEditIdRef.current = null;
    }
  }, [editing]);

  useEffect(() => {
    if (replyingTo) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [replyingTo]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    if (editing && onEdit) {
      onEdit(editing.messageId, trimmed);
      setText('');
      onCancelEdit?.();
      return;
    }
    onSend(trimmed, replyingTo?.messageId);
    setText('');
    if (replyingTo) onCancelReply?.();
  };

  const handleChangeText = (newText: string) => {
    setText(newText);
    if (newText.length > 0 && !editing) onTyping?.();
  };

  const canSend = text.trim().length > 0 && !disabled;
  const effectivePlaceholder = editing ? 'Edit message...' : placeholder;

  return (
    <View>
      {replyingTo && !editing && (
        <ReplyingToChip
          mode="reply"
          senderName={replyingTo.senderName}
          preview={replyingTo.preview}
          onCancel={() => {
            onCancelReply?.();
          }}
        />
      )}
      {editing && (
        <ReplyingToChip
          mode="edit"
          preview={editing.content}
          onCancel={() => {
            setText('');
            onCancelEdit?.();
          }}
        />
      )}
      <View style={[styles.container, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              color: colors.text,
            },
          ]}
          value={text}
          onChangeText={handleChangeText}
          placeholder={effectivePlaceholder}
          placeholderTextColor={colors.textTertiary}
          multiline
          maxLength={2000}
          editable={!disabled}
          accessibilityLabel="Message input"
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: canSend ? colors.primary : colors.surface },
          ]}
          onPress={handleSend}
          disabled={!canSend}
          hitSlop={14}
          accessibilityRole="button"
          accessibilityLabel={editing ? 'Save edit' : 'Send message'}
          accessibilityState={{ disabled: !canSend }}
        >
          <Ionicons
            name={editing ? 'checkmark' : 'arrow-up'}
            size={20}
            color={canSend ? '#fff' : colors.textTertiary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
});
