import React,{useMemo,useState} from 'react';
import {Alert,Pressable,ScrollView,Text,View,TextInput} from 'react-native';
import {useAssets} from '../context/AssetContext';
import {RangePicker} from '../components/RangePicker';
import {TrendChart,type TrendSeries} from '../components/TrendChart';
import {chartColors,palette,styles} from '../theme/styles';
import {money,rangeSnapshots} from '../utils/format';
import type {RangeFilter} from '../types/models';
export function AmountChartScreen(){
  const {snapshots,recordMonth,currentMonth,autoDay,changeAutoDay}=useAssets();
  const [busy,setBusy]=useState(false);
  const [dayText,setDayText]=useState(String(autoDay||1));
  const [range,setRange]=useState<RangeFilter>('all');
  const [hidden,setHidden]=useState<number[]>([]);
  const records=useMemo(()=>rangeSnapshots(snapshots,range),[snapshots,range]);
  const months=records.map(s=>s.yearMonth);
  const assetOptions=useMemo(()=>{
    const values=new Map<number,{id:number;name:string}>();
    for(const snap of records)for(const item of snap.items)values.set(item.assetId,{id:item.assetId,name:item.assetName});
    return [...values.values()].sort((a,b)=>a.name.localeCompare(b.name));
  },[records]);
  const amountSeries:TrendSeries[]=assetOptions.filter(a=>!hidden.includes(a.id)).map(a=>({
    key:String(a.id), name:a.name,
    color:chartColors[assetOptions.findIndex(x=>x.id===a.id)%chartColors.length],
    values:records.map(r=>r.items.find(item=>item.assetId===a.id)?.amount??0)
  }));
  const doRecord=async(overwrite=false)=>{
    if(busy)return;setBusy(true);
    try{await recordMonth(overwrite);Alert.alert('完成',`已儲存 ${currentMonth} 資產快照。`);}
    catch(e){if(String(e).includes('SNAPSHOT_EXISTS')){
      Alert.alert('本月已有快照','重新儲存會覆蓋本月原有紀錄，是否繼續？',[
        {text:'取消',style:'cancel'},{text:'覆蓋',style:'destructive',onPress:()=>{doRecord(true).catch(()=>{});}}
      ]);
    }else Alert.alert('快照失敗',String(e));}finally{setBusy(false);}
  };
  return <ScrollView style={styles.page} contentContainerStyle={styles.body}>
    <Text style={styles.title}>每月金額趨勢</Text>
    <View style={styles.card}>
      <Text style={styles.subtitle}>本月正式快照</Text>
      <Text style={[styles.tiny,{marginBottom:12}]}>快照儲存當下的數量、單價與金額；不會隨後續編輯而回溯改變。</Text>
      <Pressable disabled={busy} onPress={()=>{doRecord().catch(()=>{});}} style={styles.button}><Text style={styles.buttonText}>儲存 {currentMonth} 快照</Text></Pressable>
      <Text style={[styles.tiny,{marginTop:10}]}>可手動記錄，或啟用下方自動快照。自動功能在 App 開啟／回到前景時檢查，關閉時不執行、不虛構過去月份資料。</Text>
    </View>
    <View style={styles.card}>
      <Text style={styles.subtitle}>每月自動快照：{autoDay?`${autoDay} 日起`:'關閉'}</Text>
      <TextInput style={styles.input} value={dayText} onChangeText={setDayText} keyboardType="number-pad" placeholder="1–28"/>
      <Pressable style={styles.chip} onPress={()=>{changeAutoDay(Number(dayText)).then(()=>Alert.alert('已儲存','設定於下次前景檢查生效。')).catch(e=>Alert.alert('設定失敗',String(e)));}}><Text>儲存指定日（1–28）</Text></Pressable>
      <Pressable style={styles.chip} onPress={()=>{changeAutoDay(0).catch(e=>Alert.alert('設定失敗',String(e)));}}><Text>關閉自動快照</Text></Pressable>
      <Text style={styles.tiny}>當月達指定日且尚無快照才記錄，不覆蓋已存在紀錄。精確記錄時間列於下方；錯過日期會保存實際開啟時的數值。</Text>
    </View>
    <RangePicker range={range} onChange={setRange}/>
    <View style={styles.card}>
      <Text style={styles.subtitle}>全部資產總金額</Text>
      <TrendChart months={months} series={[{key:'total',name:'全部資產',values:records.map(s=>s.totalAmount),color:palette.blue}]}/>
    </View>
    <View style={styles.card}>
      <Text style={styles.subtitle}>個別資產金額</Text>
      <Text style={[styles.tiny,{marginBottom:12}]}>點選資產名稱，可顯示或隱藏該折線。</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',marginBottom:6}}>
        {assetOptions.map(a=><Pressable key={a.id} onPress={()=>setHidden(values=>values.includes(a.id)?values.filter(id=>id!==a.id):[...values,a.id])}
          style={[styles.chip,!hidden.includes(a.id)&&styles.activeChip]}>
          <Text style={[styles.chipText,!hidden.includes(a.id)&&styles.activeChipText]}>{a.name}</Text>
        </Pressable>)}
      </View>
      <TrendChart months={months} series={amountSeries} emptyText="此期間沒有可顯示的資產折線。"/>
    </View>
    <View style={styles.card}><Text style={styles.subtitle}>正式月結紀錄</Text>
      {!records.length&&<Text style={styles.empty}>尚無紀錄，先按上方的快照按鈕。</Text>}
      {[...records].reverse().map(s=><View key={s.id} style={[styles.row,{paddingVertical:8,borderBottomWidth:1,borderBottomColor:palette.border}]}>
        <View><Text style={styles.name}>{s.yearMonth}</Text><Text style={styles.tiny}>{new Date(s.recordedAt).toLocaleString('zh-TW')}</Text></View><Text style={styles.name}>{money(s.totalAmount)}</Text>
      </View>)}
    </View>
  </ScrollView>;
}
