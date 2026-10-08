import React from 'react';
import {ScrollView,Text} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/AppNavigator';
import {useAssets} from '../context/AssetContext';
import {AssetRow} from '../components/AssetRow';
import {styles} from '../theme/styles';
export function QuantityScreen(){
  const {assets}=useAssets();
  const nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return <ScrollView style={styles.page} contentContainerStyle={styles.body}>
    <Text style={styles.title}>各資產持有數量</Text>
    <Text style={[styles.tiny,{marginBottom:17}]}>不同計量單位不能直接加總，修改數量不會更動已保存的歷史快照。</Text>
    {!assets.length&&<Text style={styles.empty}>尚無資產，請到「金額總覽」新增。</Text>}
    {assets.map(a=><AssetRow key={a.id} asset={a} variant="quantity" onPress={()=>nav.navigate('AssetForm',{assetId:a.id})}/>)}
  </ScrollView>;
}
