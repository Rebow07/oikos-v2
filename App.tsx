import React from 'react';
import { StatusBar, View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useThemeContext } from './src/context/ThemeContext';
import { AppProvider } from './src/context/AppContext';
import Navigation from './src/navigation';

// ─── Error Boundary ──────────────────────────────────────────

interface ErrorBoundaryState {
  hasError: boolean;
  error: string;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: '' };

  static getDerivedStateFromError(err: Error) {
    return { hasError: true, error: err.message };
  }

  componentDidCatch(err: Error) {
    console.error('ErrorBoundary:', err);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.emoji}>⚠️</Text>
          <Text style={errorStyles.title}>Algo deu errado</Text>
          <Text style={errorStyles.message}>{this.state.error}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0d',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#f0edd8', marginBottom: 8 },
  message: { fontSize: 14, color: '#6b6960', textAlign: 'center' },
});

// ─── Status Bar Controller ──────────────────────────────────

function ThemedStatusBar() {
  const { isDark } = useThemeContext();
  return (
    <StatusBar
      barStyle={isDark ? 'light-content' : 'dark-content'}
      backgroundColor={isDark ? '#0f0f0d' : '#FFFFFF'}
      translucent={false}
    />
  );
}

// ─── App ─────────────────────────────────────────────────────

export default function App() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <ThemedStatusBar />
            <AppProvider>
              <Navigation />
            </AppProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
