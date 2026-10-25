import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, IconName } from '@/components/Icon';
import { theme } from '@/constants/theme';
import { useCreateStory } from '@/lib/api';
import { errorMessage } from '@/lib/format';

// base64: fotoğraf Supabase'e bu veriyle yüklenir
const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, base64: true };

export default function NewStoryScreen() {
  const insets = useSafeAreaInsets();
  const createStory = useCreateStory();
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const image = asset?.uri ?? null;
  const [caption, setCaption] = useState('');

  const fromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Kamera izni gerekli', 'Hikâye çekmek için kamera izni vermelisin.');
      return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
      if (!result.canceled) setAsset(result.assets[0]);
    } catch {
      // Simülatörde kamera yok
      Alert.alert('Kamera açılamadı', 'Bu cihazda kamera kullanılamıyor. Galeriden seçebilirsin.');
    }
  };

  const fromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (!result.canceled) setAsset(result.assets[0]);
  };

  const share = () => {
    if (!asset?.base64) return;
    createStory.mutate(
      { base64: asset.base64, mimeType: asset.mimeType, caption: caption.trim() },
      {
        onSuccess: () => {
          router.back();
          router.navigate('/profile');
        },
        onError: (error) => Alert.alert('Hikâye paylaşılamadı', errorMessage(error)),
      },
    );
  };

  if (!image) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={16} style={styles.close}>
          <Icon name="close" color="#fff" size={22} />
        </Pressable>
        <View style={styles.chooser}>
          <Text style={styles.title}>Hikâye paylaş</Text>
          <Text style={styles.subtitle}>Hikâyen haritada pininde ve profilinde görünür.</Text>
          <SourceButton icon="camera" label="Kamerayla çek" onPress={fromCamera} />
          <SourceButton icon="photo" label="Galeriden seç" onPress={fromLibrary} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent']} style={styles.topShade} />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={styles.bottomShade} />

      <Pressable
        onPress={() => setAsset(null)}
        disabled={createStory.isPending}
        hitSlop={16}
        style={[styles.close, { position: 'absolute', top: insets.top + 8 }]}>
        <Icon name="close" color="#fff" size={22} />
      </Pressable>

      <View style={[styles.composer, { paddingBottom: insets.bottom + 16 }]}>
        <TextInput
          style={styles.caption}
          value={caption}
          onChangeText={setCaption}
          placeholder="Bir şeyler yaz…"
          placeholderTextColor="rgba(255,255,255,0.7)"
          maxLength={120}
        />
        <Pressable
          style={[styles.shareButton, createStory.isPending && { opacity: 0.7 }]}
          onPress={share}
          disabled={createStory.isPending}>
          {createStory.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.shareText}>Paylaş</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function SourceButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.source} onPress={onPress}>
      <View style={styles.sourceIcon}>
        <Icon name={icon} color="#fff" size={22} />
      </View>
      <Text style={styles.sourceLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  close: {
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chooser: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 14 },
  title: { color: '#fff', fontSize: 28, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.65)', fontSize: 15, marginBottom: 16 },
  source: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  sourceIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceLabel: { color: '#fff', fontSize: 17, fontWeight: '700' },
  topShade: { position: 'absolute', top: 0, left: 0, right: 0, height: 160 },
  bottomShade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 260 },
  composer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    gap: 12,
  },
  caption: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    paddingVertical: 10,
  },
  shareButton: {
    backgroundColor: theme.primary,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  shareText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
