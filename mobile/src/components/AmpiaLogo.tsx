import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line, Rect, Defs, LinearGradient, Stop, Filter, FeGaussianBlur, FeMerge, FeMergeNode, G } from 'react-native-svg';
import { colors } from '../theme/colors';

type AmpiaLogoProps = {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
};

export function AmpiaLogo({ size = 'md', showText = false }: AmpiaLogoProps) {
  const sizeValues = {
    sm: { container: 32, text: 12 },
    md: { container: 48, text: 14 },
    lg: { container: 64, text: 16 },
  };

  const { container, text } = sizeValues[size];

  return (
    <View style={styles.container}>
      <View style={{ width: container, height: container }}>
        <Svg viewBox="0 0 80 80" width={container} height={container}>
          <Defs>
            <LinearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#f87171" />
              <Stop offset="100%" stopColor="#b91c1c" />
            </LinearGradient>
            
            <Filter id="glow">
              <FeGaussianBlur stdDeviation="1.5" result="coloredBlur" />
              <FeMerge>
                <FeMergeNode in="coloredBlur" />
                <FeMergeNode in="SourceGraphic" />
              </FeMerge>
            </Filter>
          </Defs>

          <G>
            {/* Triangle principal (A) */}
            <Path
              d="M20 60 L30 25 L40 60 Z"
              fill="url(#redGradient)"
              filter="url(#glow)"
            />
            
            {/* Barre du A */}
            <Rect
              x="24"
              y="45"
              width="12"
              height="3"
              fill="#000000"
            />
            
            {/* Forme M géométrique */}
            <Path
              d="M38 60 L38 25 L44 42 L50 25 L50 60"
              stroke="#ffffff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            
            {/* Cercle P minimaliste */}
            <Circle
              cx="60"
              cy="40"
              r="8"
              stroke="url(#redGradient)"
              strokeWidth="3"
              fill="none"
              filter="url(#glow)"
            />
            
            {/* Ligne P */}
            <Line
              x1="60"
              y1="25"
              x2="60"
              y2="60"
              stroke="url(#redGradient)"
              strokeWidth="3"
              strokeLinecap="round"
              filter="url(#glow)"
            />
            
            {/* Points décoratifs */}
            <Circle cx="30" cy="70" r="1.5" fill="url(#redGradient)" />
            <Circle cx="40" cy="70" r="1.5" fill="#ffffff" />
            <Circle cx="50" cy="70" r="1.5" fill="url(#redGradient)" />
          </G>
        </Svg>
      </View>

      {showText && (
        <Text style={[styles.text, { fontSize: text }]}>AMPIA</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  text: {
    marginTop: 8,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: '#f87171',
  },
});
