import React,{useMemo,useState} from 'react';
import {Pressable,ScrollView,Text,View} from 'react-native';
import {useAssets} from '../context/AssetContext';
import {RangePicker} from '../components/RangePicker';
import {TrendChart} from '../components/TrendChart';
import {palette,styles} from '../theme/styles';
import {numberText,rangeSnapshots} from '../utils/format';
import type {RangeFilter} from '../types/models';
export function QuantityChartScreen(){
  const {snapshots}=useAssets();
  const [range,setRange]=useState<RangeFilter>('all');
  const [selectedId,setSelectedId]=useState<number|null>(null);
  const records=useMemo(()=>rangeSnapshots(snapshots,range),[snapshots,range]);
  const options=useMemo(()=>{
    const ids=new Map<number,{id:number;name:string;unit:string}>();
    // Read snapshot records, not current assets; deleting an asset preserves its chart history.
    for(const s of snapshots)for(const i of s.items)ids.set(i.assetId,{id:i.assetId,name:i.assetName,unit:i.unit});
    return [...ids.values()].sort((a,b)=>a.name.localeCompare(b.name));
  },[snapshots]);
  const chosen=options.find(x=>x.id===selectedId)??options[0];
  const months=records.map(x=>x.yearMonth);
  const amounts=chosen?records.map(s=>s.items.find(i=>i.assetId===chosen.id)?.quantity??0):[];
  return <ScrollView style={styles.page} contentContainerStyle={styles.body}>
    <Text style={styles.title}>每月數量趨勢</Text>
    <Text style={[styles.tiny,{marginBottom:12}]}>單純追蹤資產持有數量，不受價格漲跌影響。不同單位分開顯示。</Text>
    <RangePicker range={range} onChange={setRange}/>
    <View style={styles.card}>
      <Text style={styles.subtitle}>選擇資產</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap'}}>{options.map(o=><Pressable key={o.id}
        style={[styles.chip,chosen?.id===o.id&&styles.activeChip]} onPress={()=>setSelectedId(o.id)}>
        <Text style={[styles.chipText,chosen?.id===o.id&&styles.activeChipText]}>{o.name} ({o.unit})</Text>
      </Pressable>)}</View>
      {!chosen&&<Text style={styles.empty}>尚未有歷史快照資料。</Text>}
      {chosen&&<>
        <Text style={[styles.subtitle,{marginTop:12}]}>{chosen.name}（{chosen.unit}）</Text>
        <TrendChart months={months} series={[{key:String(chosen.id),name:chosen.name,values:amounts,color:palette.green}]} unit={chosen.unit}/>
      </>}
    </View>
    {chosen&&<View style={styles.card}><Text style={styles.subtitle}>各月數量</Text>
      {[...records].reverse().map(s=><View key={s.id} style={[styles.row,{paddingVertical:8,borderBottomWidth:1,borderBottomColor:palette.border}]}>
        <Text style={styles.name}>{s.yearMonth}</Text>
        <Text style={styles.name}>{numberText(s.items.find(i=>i.assetId===chosen.id)?.quantity??0)} {chosen.unit}</Text>
      </View>)}
    </View>}
  </ScrollView>;
}
