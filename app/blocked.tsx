import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { theme } from '@/constants/theme';
import { errorMessage } from '@/lib/format';
import { useBlockedUsers, useUnblockUser } from '@/lib/safety';

export default function BlockedUsersScreen() {
  const { data: users = [], isLoading } = useBlockedUsers();
  const unblock = useUnblockUser();

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      data={users}
      keyExtractor={(u) => u.id}
      ListEmptyComponent={
        isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={theme.primary} />
        ) : (
          <Text style={styles.empty}>Engellediğin kimse yok.</Text>
        )
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Avatar uri={item.avatar_url} name={item.name} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.username}>@{item.username}</Text>
          </View>
          <Pressable
            style={styles.button}
            disabled={unblock.isPending}
            onPress={() =>
              unblock.mutate(item.id, { onError: (error) => Alert.alert('Engel kaldırılamadı', errorMessage(error)) })
            }>
            <Text style={styles.buttonText}>Engeli kaldır</Text>
          </Pressable>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface },
  empty: { textAlign: 'center', color: theme.muted, marginTop: 40, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: '#fff' },
  name: { fontSize: 15, fontWeight: '700', color: theme.text },
  username: { fontSize: 13, color: theme.muted },
  button: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: theme.surface },
  buttonText: { fontSize: 13, fontWeight: '700', color: theme.text },
});
