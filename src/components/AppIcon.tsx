import React from 'react';
import { Platform, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

type IconName =
  | 'alert-circle'
  | 'checkbox-blank-outline'
  | 'checkbox-marked-outline'
  | 'cloud-upload'
  | 'close'
  | 'cog'
  | 'code-tags'
  | 'eye'
  | 'eye-off'
  | 'format-bold'
  | 'format-list-bulleted'
  | 'information'
  | 'logout'
  | 'magnify'
  | 'notebook'
  | 'pin'
  | 'plus'
  | 'server'
  | 'sync'
  | 'theme-light-dark'
  | 'wifi'
  | 'wifi-off';

type AppIconProps = {
  color?: string;
  direction?: 'ltr' | 'rtl';
  name: string;
  size?: number;
  testID?: string;
};

const WEB_ICON_PATHS: Partial<Record<IconName, React.ReactNode>> = {
  'alert-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5" />
      <path d="M12 16.5h.01" />
    </>
  ),
  'checkbox-blank-outline': (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
    </>
  ),
  'checkbox-marked-outline': (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <path d="m8 12 2.5 2.5L16 9" />
    </>
  ),
  'cloud-upload': (
    <>
      <path d="M7 18h9a4 4 0 0 0 .5-7.97A5.5 5.5 0 0 0 6.1 8.2 3.5 3.5 0 0 0 7 18Z" />
      <path d="m12 16.5V10" />
      <path d="m9.5 12.5 2.5-2.5 2.5 2.5" />
    </>
  ),
  close: (
    <>
      <path d="m7 7 10 10" />
      <path d="m17 7-10 10" />
    </>
  ),
  cog: (
    <>
      <path d="m12 3 1.2 2.3 2.6.5-.9 2.5 1.8 1.8-1.8 1.8.9 2.5-2.6.5L12 21l-1.2-2.3-2.6-.5.9-2.5-1.8-1.8 1.8-1.8-.9-2.5 2.6-.5L12 3Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  'code-tags': (
    <>
      <path d="m9 8-4 4 4 4" />
      <path d="m15 8 4 4-4 4" />
      <path d="m13.5 6-3 12" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12s3.5-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.5 5.5-9.5 5.5S2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  'eye-off': (
    <>
      <path d="M3 3 21 21" />
      <path d="M10.6 6.7A10.8 10.8 0 0 1 12 6.5c6 0 9.5 5.5 9.5 5.5a17.6 17.6 0 0 1-3.1 3.7" />
      <path d="M6.4 6.4A18.7 18.7 0 0 0 2.5 12s3.5 5.5 9.5 5.5c1.4 0 2.7-.3 3.8-.8" />
      <path d="M10.9 10.9A2.5 2.5 0 0 0 13.1 13" />
    </>
  ),
  'format-bold': (
    <>
      <path d="M8 5h5a3 3 0 0 1 0 6H8Z" />
      <path d="M8 11h6a3.5 3.5 0 0 1 0 7H8Z" />
    </>
  ),
  'format-list-bulleted': (
    <>
      <circle cx="5.5" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="5.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="5.5" cy="17" r="1" fill="currentColor" stroke="none" />
      <path d="M9 7h10" />
      <path d="M9 12h10" />
      <path d="M9 17h10" />
    </>
  ),
  information: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10.5v5" />
      <path d="M12 7.5h.01" />
    </>
  ),
  logout: (
    <>
      <path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4" />
      <path d="M14 8l5 4-5 4" />
      <path d="M9 12h10" />
    </>
  ),
  magnify: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  notebook: (
    <>
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <path d="M9 4v16" />
      <path d="M11.5 9H15" />
      <path d="M11.5 13H15" />
    </>
  ),
  pin: (
    <>
      <path d="m9 4 6 6" />
      <path d="M8 11.5 13.5 6l4.5 4.5-5.5 5.5" />
      <path d="m10.5 13.5-4 6" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  server: (
    <>
      <rect x="5" y="4" width="14" height="6" rx="1.5" />
      <rect x="5" y="14" width="14" height="6" rx="1.5" />
      <path d="M8 7h.01" />
      <path d="M8 17h.01" />
      <path d="M11 7h5" />
      <path d="M11 17h5" />
    </>
  ),
  sync: (
    <>
      <path d="M20 7v5h-5" />
      <path d="M4 17v-5h5" />
      <path d="M6.5 9A7 7 0 0 1 18 7" />
      <path d="M17.5 15A7 7 0 0 1 6 17" />
    </>
  ),
  'theme-light-dark': (
    <>
      <path d="M12 3v18" />
      <path d="M12 3a9 9 0 1 0 0 18" />
      <path d="M12 3a9 9 0 0 1 0 18" />
    </>
  ),
  wifi: (
    <>
      <path d="M4 9a12 12 0 0 1 16 0" />
      <path d="M7 12a8 8 0 0 1 10 0" />
      <path d="M10 15a4 4 0 0 1 4 0" />
      <circle cx="12" cy="18" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  'wifi-off': (
    <>
      <path d="M3 3 21 21" />
      <path d="M4 9a12 12 0 0 1 12.2-1.8" />
      <path d="M7 12a8 8 0 0 1 4.3-1.3" />
      <path d="M10 15a4 4 0 0 1 1.6-.3" />
      <circle cx="12" cy="18" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
};

function isKnownIconName(name: string): name is IconName {
  return Object.prototype.hasOwnProperty.call(WEB_ICON_PATHS, name);
}

export function AppIcon({
  color = '#1f2937',
  direction = 'ltr',
  name,
  size = 24,
  testID,
}: AppIconProps) {
  if (Platform.OS !== 'web') {
    return (
      <MaterialCommunityIcons
        name={name as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
        color={color}
        size={size}
        style={direction === 'rtl' ? styles.rtlFlip : undefined}
        testID={testID}
      />
    );
  }

  if (!isKnownIconName(name)) {
    return (
      <Text
        style={[
          styles.webFallback,
          { color, fontSize: size * 0.75, height: size, width: size },
          direction === 'rtl' ? styles.rtlFlip : undefined,
        ]}
        testID={testID}
      >
        ?
      </Text>
    );
  }

  return (
    <svg
      aria-hidden="true"
      data-testid={testID}
      fill="none"
      height={size}
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.9"
      viewBox="0 0 24 24"
      width={size}
      style={direction === 'rtl' ? { transform: 'scaleX(-1)' } : undefined}
    >
      {WEB_ICON_PATHS[name]}
    </svg>
  );
}

export function renderPaperIcon(name: string) {
  return ({ color, direction, size }: { color: string; direction: 'ltr' | 'rtl'; size: number }) => (
    <AppIcon color={color} direction={direction} name={name} size={size} />
  );
}

const styles = StyleSheet.create({
  rtlFlip: {
    transform: [{ scaleX: -1 }],
  },
  webFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
});
