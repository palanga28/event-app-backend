import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, ChevronRight, Sparkles } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { storage } from '../lib/storage';

const { width } = Dimensions.get('window');

interface GilbertBotProps {
  onComplete?: () => void;
}

const ONBOARDING_STEPS = [
  {
    title: "Bienvenue sur AMPIA ! 🎉",
    message: "Salut ! Je suis Gilbert, ton guide personnel. Je vais te faire découvrir l'application en quelques étapes simples.",
    emoji: "👋",
  },
  {
    title: "Découvre des événements 🎭",
    message: "Explore des concerts, festivals, conférences et bien plus encore. Utilise la recherche pour trouver ce qui te passionne !",
    emoji: "🔍",
  },
  {
    title: "Achète tes billets 🎫",
    message: "Réserve tes places en quelques clics. Paiement sécurisé par Mobile Money (Airtel, Orange, M-Pesa, Afrimoney).",
    emoji: "💳",
  },
  {
    title: "Tes billets toujours sur toi 📱",
    message: "Retrouve tous tes billets dans l'onglet 'Billets'. Présente le QR code à l'entrée, c'est tout !",
    emoji: "✨",
  },
  {
    title: "Crée tes propres événements 🚀",
    message: "Tu es organisateur ? Crée et publie tes événements, vends des billets et suis tes ventes en temps réel.",
    emoji: "📊",
  },
  {
    title: "C'est parti ! 🎊",
    message: "Tu es prêt à vivre des expériences inoubliables. Si tu as besoin d'aide, je suis toujours là. Amuse-toi bien !",
    emoji: "🎉",
  },
];

export default function GilbertBot({ onComplete }: GilbertBotProps) {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  useEffect(() => {
    if (visible) {
      animateIn();
    }
  }, [visible, currentStep]);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await storage.getItemAsync('gilbert_onboarding_completed');
      if (!completed) {
        setTimeout(() => setVisible(true), 1000);
      }
    } catch (error) {
      console.log('Error checking onboarding status:', error);
    }
  };

  const animateIn = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    try {
      await storage.setItemAsync('gilbert_onboarding_completed', 'true');
    } catch (error) {
      console.log('Error saving onboarding status:', error);
    }
    setVisible(false);
    onComplete?.();
  };

  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={['rgba(168, 85, 247, 0.15)', 'rgba(236, 72, 153, 0.15)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBg}
          />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.gilbertAvatar}>
              <Text style={styles.gilbertEmoji}>🤖</Text>
              <View style={styles.sparkle}>
                <Sparkles size={12} color="#fbbf24" />
              </View>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.gilbertName}>Gilbert</Text>
              <Text style={styles.gilbertRole}>Ton guide AMPIA</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={handleSkip}>
              <X size={20} color={colors.text.muted} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.stepEmoji}>{step.emoji}</Text>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepMessage}>{step.message}</Text>
          </View>

          {/* Progress */}
          <View style={styles.progressContainer}>
            {ONBOARDING_STEPS.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  index === currentStep && styles.progressDotActive,
                  index < currentStep && styles.progressDotCompleted,
                ]}
              />
            ))}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {!isLastStep && (
              <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                <Text style={styles.skipButtonText}>Passer</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <LinearGradient
                colors={['#a855f7', '#ec4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.nextButtonGradient}
              >
                <Text style={styles.nextButtonText}>
                  {isLastStep ? "C'est parti !" : 'Suivant'}
                </Text>
                {!isLastStep && <ChevronRight size={18} color="#fff" />}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: width - 40,
    maxWidth: 400,
    backgroundColor: colors.background.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border.light,
    overflow: 'hidden',
  },
  gradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  gilbertAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  gilbertEmoji: {
    fontSize: 24,
  },
  sparkle: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.background.card,
    borderRadius: 10,
    padding: 2,
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  gilbertName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  gilbertRole: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  stepEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  stepMessage: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 20,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressDotActive: {
    backgroundColor: '#a855f7',
    width: 24,
  },
  progressDotCompleted: {
    backgroundColor: '#ec4899',
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 0,
    gap: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.muted,
  },
  nextButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
