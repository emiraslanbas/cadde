import { Platform, Switch } from 'react-native';

import { theme } from '@/constants/theme';

// react-native-web açık düğme rengini ayrı bir prop'tan okur
const WEB_PROPS = Platform.OS === 'web' ? ({ activeThumbColor: '#FFFFFF' } as object) : {};

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Switch
      value={value}
      onValueChange={onChange}
      thumbColor="#FFFFFF"
      trackColor={{ true: theme.primary, false: theme.border }}
      ios_backgroundColor={theme.border}
      {...WEB_PROPS}
    />
  );
}
