import React, {useEffect, useRef} from 'react';
import {View, StyleSheet, Animated, Easing} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Colors} from '../theme';

interface OrbConfig {
  color: string;
  size: number;
  x: string;   // percentage string e.g. '20%'
  y: string;
  duration: number;
  delay: number;
}

interface AmbientBackgroundProps {
  isDark: boolean;
}

/**
 * AmbientBackground — renders the full-screen gradient backdrop
 * with animated floating color orbs that give the liquid-glass
 * UI its depth. Completely original aesthetic with no references
 * to any existing design system.
 */
export const AmbientBackground: React.FC<AmbientBackgroundProps> = ({isDark}) => {
  const bgColors = isDark ? Colors.background.dark : Colors.background.light;
  const orbColors = isDark ? Colors.orbs.dark : Colors.orbs.light;

  const orbs: OrbConfig[] = [
    {color: orbColors[0], size: 320, x: '-10%', y: '-5%',  duration: 8000, delay: 0},
    {color: orbColors[1], size: 260, x: '55%',  y: '30%',  duration: 10000, delay: 1500},
    {color: orbColors[2], size: 200, x: '10%',  y: '65%',  duration: 9000, delay: 800},
  ];

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <LinearGradient
        style={StyleSheet.absoluteFillObject}
        colors={bgColors}
        start={{x: 0.1, y: 0}}
        end={{x: 0.9, y: 1}}
        locations={[0, 0.33, 0.66, 1]}
      />
      {orbs.map((orb, i) => (
        <AnimatedOrb key={i} {...orb} />
      ))}
    </View>
  );
};

const AnimatedOrb: React.FC<OrbConfig> = ({color, size, x, y, duration, delay}) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [anim, duration, delay]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 30],
  });

  const scale = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.08, 1],
  });

  return (
    <Animated.View
      style={[
        styles.orb,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          left: x as any,
          top: y as any,
          transform: [{translateY}, {scale}],
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    // Soft feathered glow achieved via opacity on colored view
    opacity: 0.75,
  },
});
