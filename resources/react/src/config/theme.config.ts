/**
 * Theme Configuration
 * Ant Design theme customization and color palette
 */

import type { ThemeConfig } from 'antd'

// Color Palette - Trang nghiêm và chuyên nghiệp
export const colors = {
  // Primary - Blue (Professional)
  primary: {
    50: '#e3f2fd',
    100: '#bbdefb',
    200: '#90caf9',
    300: '#64b5f6',
    400: '#42a5f5',
    500: '#1890ff', // Main
    600: '#1e88e5',
    700: '#1976d2',
    800: '#1565c0',
    900: '#0d47a1',
  },

  // Red - Nghị quyết 57 (Bold & Important)
  red: {
    50: '#ffebee',
    100: '#ffcdd2',
    200: '#ef9a9a',
    300: '#e57373',
    400: '#ef5350',
    500: '#d32f2f', // Main
    600: '#e53935',
    700: '#c62828',
    800: '#b71c1c',
    900: '#8b0000',
  },

  // Gray - Neutral
  gray: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },

  // Success
  success: {
    light: '#4caf50',
    main: '#2e7d32',
    dark: '#1b5e20',
  },

  // Warning
  warning: {
    light: '#ff9800',
    main: '#f57c00',
    dark: '#e65100',
  },

  // Error
  error: {
    light: '#f44336',
    main: '#d32f2f',
    dark: '#c62828',
  },

  // Info
  info: {
    light: '#29b6f6',
    main: '#0288d1',
    dark: '#01579b',
  },

  // Background
  background: {
    default: '#fafafa',
    paper: '#ffffff',
    elevated: '#f5f5f5',
  },

  // Text
  text: {
    primary: '#212121',
    secondary: '#757575',
    disabled: '#bdbdbd',
    hint: '#9e9e9e',
  },
} as const

// Ant Design Theme Config
export const themeConfig: ThemeConfig = {
  token: {
    // Primary Colors
    colorPrimary: colors.primary[500],
    colorSuccess: colors.success.main,
    colorWarning: colors.warning.main,
    colorError: colors.error.main,
    colorInfo: colors.info.main,

    // Background
    colorBgContainer: colors.background.paper,
    colorBgElevated: colors.background.elevated,
    colorBgLayout: colors.background.default,

    // Text
    colorText: colors.text.primary,
    colorTextSecondary: colors.text.secondary,
    colorTextDisabled: colors.text.disabled,

    // Border
    colorBorder: colors.gray[300],
    colorBorderSecondary: colors.gray[200],

    // Border Radius
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 4,
    borderRadiusXS: 2,

    // Font
    fontSize: 14,
    fontSizeHeading1: 32,
    fontSizeHeading2: 28,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 16,
    fontSizeSM: 12,
    fontSizeLG: 16,
    fontSizeXL: 20,

    // Line Height
    lineHeight: 1.5715,
    lineHeightHeading1: 1.25,
    lineHeightHeading2: 1.3,
    lineHeightHeading3: 1.35,
    lineHeightHeading4: 1.4,
    lineHeightHeading5: 1.5,

    // Font Family
    fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
      'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol',
      'Noto Color Emoji'`,

    // Motion
    motionDurationFast: '0.1s',
    motionDurationMid: '0.2s',
    motionDurationSlow: '0.3s',

    // Box Shadow
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
    boxShadowSecondary: '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',

    // Control Height
    controlHeight: 40,
    controlHeightLG: 48,
    controlHeightSM: 32,
    controlHeightXS: 24,

    // Padding
    padding: 16,
    paddingLG: 24,
    paddingSM: 12,
    paddingXS: 8,
    paddingXXS: 4,

    // Margin
    margin: 16,
    marginLG: 24,
    marginSM: 12,
    marginXS: 8,
    marginXXS: 4,
  },

  components: {
    // Button
    Button: {
      primaryShadow: '0 2px 0 rgba(5, 145, 255, 0.1)',
      fontWeight: 600,
      controlHeight: 40,
      controlHeightLG: 48,
      controlHeightSM: 32,
    },

    // Input
    Input: {
      controlHeight: 40,
      controlHeightLG: 48,
      controlHeightSM: 32,
    },

    // Select
    Select: {
      controlHeight: 40,
      controlHeightLG: 48,
      controlHeightSM: 32,
    },

    // Table
    Table: {
      headerBg: colors.gray[50],
      headerColor: colors.text.primary,
      headerSplitColor: colors.gray[300],
      rowHoverBg: colors.gray[50],
      borderColor: colors.gray[200],
    },

    // Menu
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: colors.primary[50],
      itemSelectedColor: colors.primary[500],
      itemHoverBg: colors.gray[100],
      itemHoverColor: colors.primary[500],
      iconSize: 18,
      itemHeight: 48,
      itemBorderRadius: 8,
    },

    // Card
    Card: {
      borderRadiusLG: 12,
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02)',
      boxShadowTertiary: '0 6px 16px 0 rgba(0, 0, 0, 0.08)',
    },

    // Modal
    Modal: {
      borderRadiusLG: 12,
      headerBg: colors.background.paper,
    },

    // Layout
    Layout: {
      headerBg: colors.background.paper,
      headerHeight: 72,
      headerPadding: '0 32px',
      siderBg: colors.background.paper,
      bodyBg: colors.background.default,
    },

    // Pagination
    Pagination: {
      itemActiveBg: colors.primary[500],
      itemSize: 36,
      borderRadius: 8,
    },

    // Tag
    Tag: {
      borderRadiusSM: 8,
      fontSizeSM: 12,
      fontWeight: 600,
    },

    // Notification
    Notification: {
      borderRadiusLG: 12,
    },

    // Message
    Message: {
      borderRadiusLG: 12,
    },
  },
} as const

// Custom CSS Variables
export const cssVariables = {
  // Shadows
  '--shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  '--shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  '--shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  '--shadow-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1)',

  // Spacing
  '--spacing-xs': '4px',
  '--spacing-sm': '8px',
  '--spacing-md': '16px',
  '--spacing-lg': '24px',
  '--spacing-xl': '32px',
  '--spacing-2xl': '48px',

  // Transitions
  '--transition-fast': '0.15s ease-in-out',
  '--transition-base': '0.3s ease-in-out',
  '--transition-slow': '0.5s ease-in-out',

  // Border Radius
  '--radius-sm': '4px',
  '--radius-md': '8px',
  '--radius-lg': '12px',
  '--radius-xl': '16px',
} as const

// Export types
export type Colors = typeof colors
export type CSSVariables = typeof cssVariables
