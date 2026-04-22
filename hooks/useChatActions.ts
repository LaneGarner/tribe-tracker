import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../redux/store';
import {
  addReaction as addReactionAction,
  removeReaction as removeReactionAction,
  deleteMessage as deleteMessageAction,
  editMessage as editMessageAction,
} from '../redux/slices/chatSlice';
import { ChatMessage } from '../types';
import { ActionsTarget } from '../components/chat/MessageActionsOverlay';
import { ReplyContext, EditContext } from '../components/chat/ChatInput';

export interface UseChatActionsOptions {
  conversationId: string;
  currentUserId?: string;
  flashMessage: (messageId: string) => void;
}

export function useChatActions({ conversationId, currentUserId, flashMessage }: UseChatActionsOptions) {
  const dispatch = useDispatch<AppDispatch>();

  const [actionsTarget, setActionsTarget] = useState<ActionsTarget | null>(null);
  const [replyingTo, setReplyingTo] = useState<ReplyContext | null>(null);
  const [editing, setEditing] = useState<EditContext | null>(null);

  const beginReply = useCallback((message: ChatMessage) => {
    if (!message || message.deletedAt) return;
    setEditing(null);
    setReplyingTo({
      messageId: message.id,
      senderName: message.senderName || 'Unknown',
      preview: (message.content || '').substring(0, 140),
    });
  }, []);

  const cancelReply = useCallback(() => setReplyingTo(null), []);

  const beginEdit = useCallback((message: ChatMessage) => {
    if (!currentUserId || message.senderId !== currentUserId) return;
    if (message.deletedAt) return;
    setReplyingTo(null);
    setEditing({ messageId: message.id, content: message.content });
  }, [currentUserId]);

  const cancelEdit = useCallback(() => setEditing(null), []);

  const handleCopy = useCallback(async (message: ChatMessage) => {
    if (!message.content) return;
    try {
      await Clipboard.setStringAsync(message.content);
    } catch (err) {
      console.error('Clipboard error:', err);
    }
  }, []);

  const handleDelete = useCallback((message: ChatMessage) => {
    if (!currentUserId || message.senderId !== currentUserId) return;
    Alert.alert(
      'Delete message?',
      'This message will be removed for everyone in the conversation.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            dispatch(deleteMessageAction({
              conversationId,
              messageId: message.id,
              deletedAt: new Date().toISOString(),
            }));
          },
        },
      ],
    );
  }, [dispatch, conversationId, currentUserId]);

  const handleEditSubmit = useCallback((messageId: string, content: string) => {
    dispatch(editMessageAction({
      conversationId,
      messageId,
      content,
      editedAt: new Date().toISOString(),
    }));
  }, [dispatch, conversationId]);

  const handleLongPress = useCallback((message: ChatMessage, bubbleY: number, bubbleHeight: number, isOwn: boolean) => {
    setActionsTarget({ message, bubbleY, bubbleHeight, isOwn });
  }, []);

  const closeActions = useCallback(() => setActionsTarget(null), []);

  const handleToggleReaction = useCallback((message: ChatMessage, emoji: string) => {
    if (!currentUserId || message.deletedAt) return;
    const existing = message.reactions?.find(r => r.emoji === emoji);
    const already = !!existing?.selfReacted;
    const payload = {
      conversationId,
      messageId: message.id,
      userId: currentUserId,
      emoji,
      currentUserId,
    };
    if (already) {
      dispatch(removeReactionAction(payload));
    } else {
      dispatch(addReactionAction(payload));
    }
  }, [dispatch, conversationId, currentUserId]);

  const jumpToMessage = useCallback((messageId: string) => {
    flashMessage(messageId);
  }, [flashMessage]);

  return {
    actionsTarget,
    replyingTo,
    editing,
    beginReply,
    cancelReply,
    beginEdit,
    cancelEdit,
    handleCopy,
    handleDelete,
    handleEditSubmit,
    handleLongPress,
    closeActions,
    handleToggleReaction,
    jumpToMessage,
  };
}
