import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ImageStyle } from 'react-native';

type AnimatedImageProps = {
  uri: string;
  style?: ImageStyle;
  imageIndex: number;
};

export function AnimatedImage({ uri, style, imageIndex }: AnimatedImageProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Reset position and start animation
    slideAnim.setValue(100); // Start from right
    fadeAnim.setValue(0);

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [imageIndex]);

  return (
    <Animated.Image
      source={{ uri }}
      style={[
        style,
        {
          transform: [{ translateX: slideAnim }],
          opacity: fadeAnim,
        },
      ]}
    />
  );
}
