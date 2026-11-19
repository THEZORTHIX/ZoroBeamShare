// ZoroBeamShare — Liquid Glass Theme System
// Light & dark palettes with translucent glass design language

export const Colors = {
  // ── Core glass surfaces ──────────────────────────────────────────────
  glass: {
    light: {
      surface: 'rgba(255, 255, 255, 0.35)',
      surfaceStrong: 'rgba(255, 255, 255, 0.55)',
      surfaceSubtle: 'rgba(255, 255, 255, 0.18)',
      border: 'rgba(255, 255, 255, 0.60)',
      borderSubtle: 'rgba(255, 255, 255, 0.30)',
      shimmer: 'rgba(255, 255, 255, 0.80)',
      shadow: 'rgba(100, 120, 180, 0.18)',
    },
    dark: {
      surface: 'rgba(20, 22, 35, 0.55)',
      surfaceStrong: 'rgba(28, 30, 48, 0.75)',
      surfaceSubtle: 'rgba(15, 17, 28, 0.35)',
      border: 'rgba(120, 140, 220, 0.25)',
      borderSubtle: 'rgba(80, 100, 180, 0.15)',
      shimmer: 'rgba(140, 160, 255, 0.12)',
      shadow: 'rgba(0, 0, 0, 0.45)',
    },
  },

  // ── Brand gradient stops ─────────────────────────────────────────────
  brand: {
    primary: ['#6C63FF', '#8B5CF6', '#A78BFA'],
    secondary: ['#06B6D4', '#0EA5E9', '#38BDF8'],
    accent: ['#F472B6', '#EC4899', '#DB2777'],
    success: ['#34D399', '#10B981', '#059669'],
    warning: ['#FBBF24', '#F59E0B', '#D97706'],
    danger: ['#F87171', '#EF4444', '#DC2626'],
  },

  // ── Background gradients ─────────────────────────────────────────────
  background: {
    light: ['#E8EDFF', '#F0E8FF', '#E8F4FF', '#F8F0FF'],
    dark: ['#0A0B14', '#0D0F1E', '#0B1020', '#0F0A18'],
  },

  // ── Orb / glow blobs ────────────────────────────────────────────────
  orbs: {
    light: [
      'rgba(108, 99, 255, 0.25)',
      'rgba(6, 182, 212, 0.20)',
      'rgba(244, 114, 182, 0.18)',
    ],
    dark: [
      'rgba(108, 99, 255, 0.35)',
      'rgba(6, 182, 212, 0.28)',
      'rgba(244, 114, 182, 0.22)',
    ],
  },

  // ── Text ─────────────────────────────────────────────────────────────
  text: {
    light: {
      primary: '#0F0E1A',
      secondary: '#4B4B6B',
      tertiary: '#8B8BB0',
      onGlass: '#1A1A3A',
      inverse: '#FFFFFF',
    },
    dark: {
      primary: '#F0F0FF',
      secondary: '#A0A0C8',
      tertiary: '#5A5A80',
      onGlass: '#E8E8FF',
      inverse: '#0A0B14',
    },
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const Radius = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  full: 999,
};

export const Typography = {
  displayLarge: {fontSize: 48, fontWeight: '800' as const, letterSpacing: -1.5},
  displayMedium: {fontSize: 36, fontWeight: '700' as const, letterSpacing: -1},
  headingLarge: {fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5},
  headingMedium: {fontSize: 22, fontWeight: '600' as const, letterSpacing: -0.3},
  headingSmall: {fontSize: 18, fontWeight: '600' as const, letterSpacing: -0.2},
  bodyLarge: {fontSize: 16, fontWeight: '400' as const, letterSpacing: 0},
  bodyMedium: {fontSize: 14, fontWeight: '400' as const, letterSpacing: 0.1},
  bodySmall: {fontSize: 12, fontWeight: '400' as const, letterSpacing: 0.2},
  labelLarge: {fontSize: 14, fontWeight: '600' as const, letterSpacing: 0.5},
  labelMedium: {fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.6},
  labelSmall: {fontSize: 10, fontWeight: '700' as const, letterSpacing: 0.8},
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  }),
};

export const Animation = {
  fast: 150,
  normal: 280,
  slow: 450,
  spring: {
    damping: 18,
    stiffness: 180,
    mass: 1,
  },
  springBouncy: {
    damping: 12,
    stiffness: 200,
    mass: 0.8,
  },
};
