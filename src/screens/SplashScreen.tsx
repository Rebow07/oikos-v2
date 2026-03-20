import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { useTheme } from '../theme';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ navigation }: any) {
  const { Colors, isDark } = useTheme();
  const bg = isDark ? '#000000' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const subColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';

  const fadeIn = useRef(new Animated.Value(0)).current;
  const blurAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const subtitleFade = useRef(new Animated.Value(0)).current;
  const subtitleSlide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Sequence: fade in + deblur name, then subtitle, then navigate
    Animated.sequence([
      // 1. Name appears from blur
      Animated.parallel([
        Animated.timing(fadeIn, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ]),
      // 2. Subtitle slides up
      Animated.parallel([
        Animated.timing(subtitleFade, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(subtitleSlide, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      // 3. Wait
      Animated.delay(800),
    ]).start(() => {
      navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
    });
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* OIKOS */}
      <Animated.View style={{
        opacity: fadeIn,
        transform: [{ scale: scaleAnim }],
      }}>
        <Text style={[styles.name, { color: textColor }]}>
          OIKOS
        </Text>
      </Animated.View>

      {/* Family */}
      <Animated.View style={{
        opacity: subtitleFade,
        transform: [{ translateY: subtitleSlide }],
      }}>
        <Text style={[styles.subtitle, { color: subColor }]}>
          FAMILY
        </Text>
      </Animated.View>

      {/* Decorative line */}
      <Animated.View style={[styles.line, {
        opacity: subtitleFade,
        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
      }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 62,
    fontWeight: '800',
    letterSpacing: 18,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  line: {
    width: 60,
    height: 2,
    borderRadius: 1,
    marginTop: 24,
  },
});
