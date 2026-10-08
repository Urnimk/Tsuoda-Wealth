import React from 'react';
import {StatusBar} from 'react-native';
import {SQLiteProvider} from 'expo-sqlite';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {initializeDatabase} from './src/database/database';
import {AssetProvider} from './src/context/AssetContext';
import {AppNavigator} from './src/navigation/AppNavigator';
import {AppErrorBoundary} from './src/components/AppErrorBoundary';
export default function App(){
  return <AppErrorBoundary><SafeAreaProvider>
    <StatusBar barStyle="dark-content"/>
    <SQLiteProvider databaseName="asset_dual_view.db" onInit={initializeDatabase}>
      <AssetProvider>
        <NavigationContainer><AppNavigator/></NavigationContainer>
      </AssetProvider>
    </SQLiteProvider>
  </SafeAreaProvider></AppErrorBoundary>;
}
