import React, { useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Animated, ViewStyle } from 'react-native';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  State,
} from 'react-native-gesture-handler';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface SwipeableViewProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  canSwipeLeft?: boolean;   // Whether left swipe is allowed (default true)
  canSwipeRight?: boolean;  // Whether right swipe is allowed (default true)
}

export interface SwipeableViewRef {
  animateLeft: () => void;
  animateRight: () => void;
}

const SWIPE_THRESHOLD = 30;
const SLIDE_DISTANCE = 60;

const SwipeableView = forwardRef<SwipeableViewRef, SwipeableViewProps>(({
  children,
  onSwipeLeft,
  onSwipeRight,
  disabled = false,
  style,
  canSwipeLeft = true,
  canSwipeRight = true,
}, ref) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReducedMotion();

  const animateRight = useCallback(() => {
    if (onSwipeRight) {
      onSwipeRight();
      if (reduceMotion) {
        translateX.setValue(0);
        return;
      }
      translateX.setValue(-SLIDE_DISTANCE);
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        stiffness: 200,
        damping: 22,
      }).start();
    }
  }, [onSwipeRight, reduceMotion, translateX]);

  const animateLeft = useCallback(() => {
    if (onSwipeLeft) {
      onSwipeLeft();
      if (reduceMotion) {
        translateX.setValue(0);
        return;
      }
      translateX.setValue(SLIDE_DISTANCE);
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        stiffness: 200,
        damping: 22,
      }).start();
    }
  }, [onSwipeLeft, reduceMotion, translateX]);

  useImperativeHandle(ref, () => ({
    animateLeft,
    animateRight,
  }), [animateLeft, animateRight]);

  const onGestureEvent = useCallback(
    (event: PanGestureHandlerGestureEvent) => {
      const { translationX: tx } = event.nativeEvent;

      // Block visual feedback at boundaries
      if (tx < 0 && !canSwipeLeft) {
        translateX.setValue(0);
      } else if (tx > 0 && !canSwipeRight) {
        translateX.setValue(0);
      } else {
        translateX.setValue(tx);
      }
    },
    [canSwipeLeft, canSwipeRight, translateX]
  );

  const onHandlerStateChange = useCallback(
    (event: PanGestureHandlerGestureEvent) => {
      if (event.nativeEvent.state === State.END) {
        const { translationX: tx, velocityX } = event.nativeEvent;

        // If swipe was blocked, just reset without animation
        if ((tx < 0 && !canSwipeLeft) || (tx > 0 && !canSwipeRight)) {
          translateX.setValue(0);
          return;
        }

        const swipedRight = tx > SWIPE_THRESHOLD || velocityX > 400;
        const swipedLeft = tx < -SWIPE_THRESHOLD || velocityX < -400;

        if (swipedRight && onSwipeRight) {
          animateRight();
        } else if (swipedLeft && onSwipeLeft) {
          animateLeft();
        } else {
          // Snap back
          if (reduceMotion) {
            translateX.setValue(0);
            return;
          }
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            stiffness: 500,
            damping: 30,
          }).start();
        }
      }
    },
    [animateLeft, animateRight, canSwipeLeft, canSwipeRight, onSwipeLeft, onSwipeRight, reduceMotion, translateX]
  );

  const opacity = translateX.interpolate({
    inputRange: [-SLIDE_DISTANCE, 0, SLIDE_DISTANCE],
    outputRange: [0.7, 1, 0.7],
    extrapolate: 'clamp',
  });

  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
      activeOffsetX={[-10, 10]}
      failOffsetY={[-15, 15]}
      enabled={!disabled}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ translateX }],
            opacity,
          }
        ]}
      >
        {children}
      </Animated.View>
    </PanGestureHandler>
  );
});

export default SwipeableView;
