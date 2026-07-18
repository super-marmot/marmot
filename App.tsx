import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { Pressable, Text } from 'react-native'
import { DarkTheme, NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import ChatListScreen from './src/screens/ChatListScreen'
import ChatScreen from './src/screens/ChatScreen'
import ModelsScreen from './src/screens/ModelsScreen'
import SettingsScreen from './src/screens/SettingsScreen'
import { colors } from './src/theme'
import type { RootStackParamList } from './src/navigation'

const Stack = createNativeStackNavigator<RootStackParamList>()

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
  },
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={theme}>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="Chats"
          component={ChatListScreen}
          options={({ navigation }) => ({
            title: 'Marmot',
            headerRight: () => (
              <Pressable onPress={() => navigation.navigate('Settings')} hitSlop={12}>
                <Text style={{ color: colors.textDim, fontSize: 15 }}>Settings</Text>
              </Pressable>
            ),
          })}
        />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
        <Stack.Screen name="Models" component={ModelsScreen} options={{ title: 'Model library' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  )
}
