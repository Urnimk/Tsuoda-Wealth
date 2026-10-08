import React from 'react';
import {Pressable,Text,View} from 'react-native';
import type {Asset} from '../types/models';
import {amountOf,money,numberText} from '../utils/format';
import {palette,styles} from '../theme/styles';
export function AssetRow({asset,variant,onPress}:{asset:Asset;variant:'amount'|'quantity';onPress:()=>void}){
  return <Pressable onPress={onPress} style={styles.card}>
    <View style={styles.row}>
      <View style={{flex:1}}><Text style={styles.name}>{asset.name}</Text>
        <Text style={styles.tiny}>{asset.category} · {numberText(asset.quantity)} {asset.unit}</Text></View>
      <View style={{alignItems:'flex-end'}}>
        <Text style={{fontWeight:'800',color:palette.navy,fontSize:variant==='amount'?18:20}}>
          {variant==='amount'?money(amountOf(asset)):`${numberText(asset.quantity)} ${asset.unit}`}</Text>
        <Text style={styles.tiny}>{variant==='amount'?`參考單價 ${money(asset.unitPrice)}`:'點選編輯'}</Text>
      </View>
    </View>
  </Pressable>;
}
