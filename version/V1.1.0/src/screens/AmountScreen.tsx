import React from 'react';
import {ScrollView,Text,View,TouchableOpacity,ActivityIndicator} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/AppNavigator';
import {useAssets} from '../context/AssetContext';
import {AssetRow} from '../components/AssetRow';
import {styles} from '../theme/styles';
import {amountOf,money} from '../utils/format';
export function AmountScreen(){
  const {assets,total,loading,error}=useAssets();
  const nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return <ScrollView style={styles.page} contentContainerStyle={styles.body}>
    <View style={styles.card}>
      <Text style={styles.tiny}>目前資產總金額</Text>
      <Text style={[styles.amount,{marginVertical:9}]}>{money(total)}</Text>
      <Text style={styles.tiny}>共 {assets.length} 筆資產 · 手動更新金額與數量</Text>
    </View>
    <TouchableOpacity style={[styles.button,{marginBottom:18}]} onPress={()=>nav.navigate('AssetForm')}>
      <Text style={styles.buttonText}>＋ 新增資產</Text>
    </TouchableOpacity>
    <TouchableOpacity style={[styles.chip,{marginBottom:18}]} onPress={()=>nav.navigate('Backup')}><Text>備份／還原資料</Text></TouchableOpacity>
    <Text style={styles.subtitle}>資產清單</Text>
    {loading&&<ActivityIndicator/>}
    {error&&<Text style={{color:'red'}}>{error}</Text>}
    {!loading&&!assets.length&&<Text style={styles.empty}>目前沒有資產。點選新增資產開始。</Text>}
    {[...assets].sort((a,b)=>amountOf(b)-amountOf(a)).map(a=><AssetRow key={a.id} asset={a} variant="amount" onPress={()=>nav.navigate('AssetForm',{assetId:a.id})}/>)}
  </ScrollView>;
}
