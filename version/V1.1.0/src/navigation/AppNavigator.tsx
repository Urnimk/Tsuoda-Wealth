import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {Text} from 'react-native';
import {AmountScreen} from '../screens/AmountScreen';
import {QuantityScreen} from '../screens/QuantityScreen';
import {AmountChartScreen} from '../screens/AmountChartScreen';
import {QuantityChartScreen} from '../screens/QuantityChartScreen';
import {BackupScreen} from '../screens/BackupScreen';
import {AssetFormScreen} from '../screens/AssetFormScreen';
import {palette} from '../theme/styles';
export type RootStackParamList={Home:undefined;Backup:undefined;AssetForm:{assetId?:number}|undefined};
type TabsParamList={Amount:undefined;Quantity:undefined;AmountCharts:undefined;QuantityCharts:undefined};
const Stack=createNativeStackNavigator<RootStackParamList>();
const Tabs=createBottomTabNavigator<TabsParamList>();
function MainTabs(){
  return <Tabs.Navigator screenOptions={({route})=>({
    headerStyle:{backgroundColor:palette.white},headerTintColor:palette.navy,
    tabBarActiveTintColor:palette.blue,tabBarInactiveTintColor:palette.muted,
    tabBarStyle:{paddingTop:6},
    tabBarIcon:({color})=><Text style={{fontSize:19,color}}>{({Amount:'＄',Quantity:'▤',AmountCharts:'⌁',QuantityCharts:'▥'} as Record<string,string>)[route.name]}</Text>
  })}>
    <Tabs.Screen name="Amount" component={AmountScreen} options={{title:'金額總覽'}}/>
    <Tabs.Screen name="Quantity" component={QuantityScreen} options={{title:'數量總覽'}}/>
    <Tabs.Screen name="AmountCharts" component={AmountChartScreen} options={{title:'金額歷史趨勢',tabBarLabelStyle:{fontSize:10}}}/>
    <Tabs.Screen name="QuantityCharts" component={QuantityChartScreen} options={{title:'數量歷史趨勢',tabBarLabelStyle:{fontSize:10}}}/>
  </Tabs.Navigator>;
}
export function AppNavigator(){
  return <Stack.Navigator screenOptions={{headerStyle:{backgroundColor:palette.white},headerTintColor:palette.navy}}>
    <Stack.Screen name="Home" component={MainTabs} options={{headerShown:false}}/>
    <Stack.Screen name="Backup" component={BackupScreen} options={{title:'備份與還原'}}/>
    <Stack.Screen name="AssetForm" component={AssetFormScreen} options={{title:'新增／編輯資產',presentation:'modal'}}/>
  </Stack.Navigator>;
}
