import React, { useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Animated, ViewStyle } from 'react-native';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  State,
} from 'react-native-gesture-handler';

interface SwipeableViewProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
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
}, ref) => {
  const translateX = useRef(new Animated.Value(0)).current;

  const animateRight = useCallback(() => {
    if (onSwipeRight) {
      onSwipeRight();
      translateX.setValue(-SLIDE_DISTANCE);
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        stiffness: 200,
        damping: 22,
      }).start();
    }
  }, [onSwipeRight, translateX]);

  const animateLeft = useCallback(() => {
    if (onSwipeLeft) {
      onSwipeLeft();
      translateX.setValue(SLIDE_DISTANCE);
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        stiffness: 200,
        damping: 22,
      }).start();
    }
  }, [onSwipeLeft, translateX]);

  useImperativeHandle(ref, () => ({
    animateLeft,
    animateRight,
  }), [animateLeft, animateRight]);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = useCallback(
    (event: PanGestureHandlerGestureEvent) => {
      if (event.nativeEvent.state === State.END) {
        const { translationX: tx, velocityX } = event.nativeEvent;

        const swipedRight = tx > SWIPE_THRESHOLD || velocityX > 400;
        const swipedLeft = tx < -SWIPE_THRESHOLD || velocityX < -400;

        if (swipedRight && onSwipeRight) {
          animateRight();
        } else if (swipedLeft && onSwipeLeft) {
          animateLeft();
        } else {
          // Snap back
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            stiffness: 500,
            damping: 30,
          }).start();
        }
      }
    },
    [animateLeft, animateRight, onSwipeLeft, onSwipeRight, translateX]
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
