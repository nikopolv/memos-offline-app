import React, { useEffect, useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import {
  TextInput,
  Button,
  Text,
  HelperText,
  Surface,
  useTheme,
  ActivityIndicator,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../stores';
import {
  ACCESS_TOKEN_INPUT_BEHAVIOR,
  SERVER_URL_INPUT_BEHAVIOR,
  canSubmitLoginCredentials,
  normalizeLoginCredentials,
} from './loginCredentials';

const ONBOARDING_SEEN_KEY = 'memos_login_onboarding_seen_v1';

export function LoginScreen() {
  const theme = useTheme();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [serverUrl, setServerUrl] = useState('');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isPreparing, setIsPreparing] = useState(true);

  useEffect(() => {
    async function loadOnboardingState() {
      try {
        const seen = await AsyncStorage.getItem(ONBOARDING_SEEN_KEY);
        setShowOnboarding(seen !== 'true');
      } finally {
        setIsPreparing(false);
      }
    }

    loadOnboardingState();
  }, []);

  const handleDismissOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
    setShowOnboarding(false);
  };

  const handleLogin = async () => {
    if (!canSubmitLoginCredentials(serverUrl, token)) return;

    const normalized = normalizeLoginCredentials(serverUrl, token);
    await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
    await login(normalized.serverUrl, normalized.token);
  };

  const isValid = canSubmitLoginCredentials(serverUrl, token);

  if (isPreparing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Surface style={styles.surface} elevation={2}>
        {showOnboarding ? (
          <>
            <Text variant="headlineMedium" style={styles.title}>
              Welcome to Memos Offline
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              A quick setup gets you to offline-ready memo capture in under a minute.
            </Text>

            <View style={styles.onboardingStep}>
              <Text variant="titleSmall">1. Add your server</Text>
              <Text variant="bodyMedium" style={styles.onboardingCopy}>
                Paste the URL for the Memos instance you already use in the browser.
              </Text>
            </View>

            <View style={styles.onboardingStep}>
              <Text variant="titleSmall">2. Paste an access token</Text>
              <Text variant="bodyMedium" style={styles.onboardingCopy}>
                In Memos, open Settings → Access Tokens and copy one into the app.
              </Text>
            </View>

            <View style={styles.onboardingStep}>
              <Text variant="titleSmall">3. Start writing anywhere</Text>
              <Text variant="bodyMedium" style={styles.onboardingCopy}>
                New notes save locally first and sync automatically when the network cooperates.
              </Text>
            </View>

            <Button mode="contained" onPress={handleDismissOnboarding} style={styles.button}>
              Start setup
            </Button>

            <Button mode="text" onPress={handleDismissOnboarding}>
              I already know this
            </Button>
          </>
        ) : (
          <>
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
              autoCapitalize={SERVER_URL_INPUT_BEHAVIOR.autoCapitalize}
              autoCorrect={SERVER_URL_INPUT_BEHAVIOR.autoCorrect}
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
              autoCapitalize={ACCESS_TOKEN_INPUT_BEHAVIOR.autoCapitalize}
              autoCorrect={ACCESS_TOKEN_INPUT_BEHAVIOR.autoCorrect}
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
          </>
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  onboardingStep: {
    marginBottom: 18,
  },
  onboardingCopy: {
    marginTop: 6,
    opacity: 0.75,
    lineHeight: 20,
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
