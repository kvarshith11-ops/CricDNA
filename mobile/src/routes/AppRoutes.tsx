import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { PlayerDetailsPage } from '../pages/PlayerDetailsPage'
import { PlayersPage } from '../pages/PlayersPage'
import type { RootStackParamList } from '../types/navigation'

const Stack = createNativeStackNavigator<RootStackParamList>()

export const AppRoutes = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#F5F7F2',
          },
          headerShadowVisible: false,
          headerTintColor: '#155B38',
          headerTitleStyle: {
            fontWeight: '900',
          },
          contentStyle: {
            backgroundColor: '#F5F7F2',
          },
        }}
      >
        <Stack.Screen
          name="Players"
          component={PlayersPage}
          options={{ title: 'Player Insights' }}
        />
        <Stack.Screen
          name="PlayerDetails"
          component={PlayerDetailsPage}
          options={({ route }) => ({ title: route.params.player.name })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
