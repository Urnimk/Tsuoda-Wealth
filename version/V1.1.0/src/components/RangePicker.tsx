import React from 'react';
import {Pressable,Text,View} from 'react-native';
import type {RangeFilter} from '../types/models';
import {styles} from '../theme/styles';
export function RangePicker({range,onChange}:{range:RangeFilter;onChange:(value:RangeFilter)=>void}){
  return <View style={{flexDirection:'row',marginBottom:12}}>{([{id:'all',title:'全部歷史'},{id:'12m',title:'近12個月'}] as const).map(x=><Pressable
    key={x.id} onPress={()=>onChange(x.id)} style={[styles.chip,range===x.id&&styles.activeChip]}>
    <Text style={[styles.chipText,range===x.id&&styles.activeChipText]}>{x.title}</Text>
  </Pressable>)}</View>;
}
