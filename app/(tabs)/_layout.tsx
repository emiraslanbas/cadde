import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';
import { router, Tabs } from 'expo-router';
import { ComponentProps } from 'react';
import { ColorValue, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { TAB_BAR_HEIGHT, theme } from '@/constants/theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

// Ekranın altında yüzen, yarı saydam (cam) menü
const TAB_BAR_MARGIN = 16;
const CREATE_BUTTON_SIZE = 46;

function TabIcon({ name, color }: { name: SymbolName; color: ColorValue }) {
  return <SymbolView name={name} tintColor={color} size={24} />;
}

function GlassBackground() {
  // Android'de bulanıklaştırma pahalı ve tutarsız; yarı saydam koyu zemin yeterli
  if (Platform.OS === 'android') return <View style={[StyleSheet.absoluteFill, styles.androidGlass]} />;
  return <BlurView tint="systemChromeMaterialDark" intensity={80} style={StyleSheet.absoluteFill} />;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      // Menü zaten güvenli alanın üstünde yüzüyor; ek alt boşluk ikonları yukarı itiyordu
      safeAreaInsets={{ bottom: 0 }}
      screenOptions={{
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.muted,
        tabBarShowLabel: false,
        // Etiket yokken "alt alta" düzen ikonu yukarı yaslıyor; yan yana düzen ortalar
        tabBarLabelPosition: 'beside-icon',
        tabBarBackground: GlassBackground,
        tabBarStyle: [styles.tabBar, { bottom: Math.max(insets.bottom, 12) }],
        tabBarItemStyle: styles.tabItem,
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '800' },
        sceneStyle: { backgroundColor: theme.bg },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Harita',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabIcon name={{ ios: 'map.fill', android: 'map', web: 'map' }} color={color} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Etkinlikler',
          tabBarIcon: ({ color }) => (
            <TabIcon name={{ ios: 'calendar', android: 'event', web: 'event' }} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/story/new');
          },
        }}
        options={{
          title: 'Paylaş',
          tabBarAccessibilityLabel: 'Hikâye paylaş',
          // Büyük + düğmesi ikon kutusuna sığsın, kesilmesin
          tabBarIconStyle: { width: CREATE_BUTTON_SIZE, height: CREATE_BUTTON_SIZE },
          tabBarIcon: () => (
            <View style={styles.createButton}>
              <Icon name="plus" color={theme.bg} size={22} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => (
            <TabIcon name={{ ios: 'person.crop.circle', android: 'person', web: 'person' }} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ayarlar',
          tabBarIcon: ({ color }) => (
            <TabIcon name={{ ios: 'gearshape.fill', android: 'settings', web: 'settings' }} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: TAB_BAR_MARGIN,
    right: TAB_BAR_MARGIN,
    height: TAB_BAR_HEIGHT,
    paddingBottom: 0,
    borderRadius: TAB_BAR_HEIGHT / 2,
    borderTopWidth: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.glassBorder,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    elevation: 0,
  },
  tabItem: { height: TAB_BAR_HEIGHT, paddingVertical: 0, justifyContent: 'center' },
  androidGlass: { backgroundColor: 'rgba(24,24,30,0.94)' },
  createButton: {
    width: CREATE_BUTTON_SIZE,
    height: CREATE_BUTTON_SIZE,
    borderRadius: CREATE_BUTTON_SIZE / 2,
    backgroundColor: theme.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
