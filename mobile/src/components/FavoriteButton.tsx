import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Heart } from 'lucide-react-native';
import { colors } from '../theme/colors';

type FavoriteButtonProps = {
  isFavorite: boolean;
  onPress: () => void;
  size?: number;
  disabled?: boolean;
};

export function FavoriteButton({ isFavorite, onPress, size = 24, disabled = false }: FavoriteButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isFavorite) {
      // Animation de "pop" quand on ajoute aux favoris
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.3,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isFavorite]);

  const handlePress = () => {
    if (disabled) return;
    
    // Animation de pression
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} disabled={disabled} style={styles.button}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Heart
          size={size}
          color={isFavorite ? colors.primary.pink : colors.text.primary}
          fill={isFavorite ? colors.primary.pink : 'transparent'}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 4,
  },
});
