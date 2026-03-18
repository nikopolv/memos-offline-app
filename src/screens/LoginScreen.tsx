import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import {
  TextInput,
  Button,
  Text,
  HelperText,
  Surface,
  useTheme,
} from 'react-native-paper';
import { useAuthStore } from '../stores';

export function LoginScreen() {
  const theme = useTheme();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [serverUrl, setServerUrl] = useState('');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);

  const handleLogin = async () => {
    if (!serverUrl.trim() || !token.trim()) return;
    await login(serverUrl.trim(), token.trim());
  };

  const isValid = serverUrl.trim().length > 0 && token.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Surface style={styles.surface} elevation={2}>
        <Text variant="headlineMedium" style={styles.title}>
          Memos
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Connect to your Memos server
        </Text>

        <TextInput
          label="Server URL"
          value={serverUrl}
          onChangeText={(text) => {
            setServerUrl(text);
            clearError();
          }}
          placeholder="https://memos.example.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={styles.input}
          mode="outlined"
        />

        <TextInput
          label="Access Token"
          value={token}
          onChangeText={(text) => {
            setToken(text);
            clearError();
          }}
          secureTextEntry={!showToken}
          right={
            <TextInput.Icon
              icon={showToken ? 'eye-off' : 'eye'}
              onPress={() => setShowToken(!showToken)}
            />
          }
          style={styles.input}
          mode="outlined"
        />

        {error && (
          <HelperText type="error" visible={!!error}>
            {error}
          </HelperText>
        )}

        <Button
          mode="contained"
          onPress={handleLogin}
          loading={isLoading}
          disabled={!isValid || isLoading}
          style={styles.button}
        >
          Connect
        </Button>

        <Text variant="bodySmall" style={styles.hint}>
          Get your access token from Memos Settings → Access Tokens
        </Text>
      </Surface>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  surface: {
    padding: 24,
    borderRadius: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
  hint: {
    textAlign: 'center',
    marginTop: 16,
    opacity: 0.5,
  },
});
