import React,{useState} from 'react';
import {Alert,KeyboardAvoidingView,Platform,Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {useNavigation,useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import type {RootStackParamList} from '../navigation/AppNavigator';
import {useAssets} from '../context/AssetContext';
import {assetCategories,type AssetCategory} from '../types/models';
import {palette,styles} from '../theme/styles';
import {money,roundMoney,validNumber} from '../utils/format';
export function AssetFormScreen(){
  const route=useRoute<RouteProp<RootStackParamList,'AssetForm'>>();
  const id=route.params?.assetId;
  const {assets,upsert,remove}=useAssets();
  const a=assets.find(x=>x.id===id);
  const nav=useNavigation();
  const [name,setName]=useState(a?.name??'');
  const [category,setCategory]=useState<AssetCategory>(a?.category??'其他');
  const [unit,setUnit]=useState(a?.unit??'股');
  const [quantity,setQuantity]=useState(a?String(a.quantity):'');
  const [unitPrice,setUnitPrice]=useState(a?String(a.unitPrice):'');
  const [amount,setAmount]=useState(a?String(a.amountCents/100):'');
  const [note,setNote]=useState(a?.note??'');
  const [busy,setBusy]=useState(false);
  const q=validNumber(quantity),p=validNumber(unitPrice),m=validNumber(amount);
  const submit=async()=>{
    if(!name.trim()||!unit.trim()||q===null||p===null||m===null||!Number.isSafeInteger(Math.round(m*100))){Alert.alert('資料未填完整','名稱、單位、數量、參考單價及目前金額均需正確填寫，數量及價格不能是負數。');return;}
    setBusy(true);
    try{await upsert({name:name.trim(),category,unit:unit.trim(),quantity:q,unitPrice:p,amountCents:Math.round(m!*100),note:note.trim()},id);nav.goBack();}
    catch(e){Alert.alert('儲存失敗',String(e));}
    finally{setBusy(false);}
  };
  const askDelete=()=>{if(busy||id===undefined)return;Alert.alert('刪除資產','僅刪除目前資產，歷史快照不受影響。',[
    {text:'取消',style:'cancel'}, {text:'刪除',style:'destructive',onPress:async()=>{
      setBusy(true);try{await remove(id);nav.goBack();}catch(e){Alert.alert('刪除失敗',String(e));}finally{setBusy(false);}
    }}]);};
  return <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={styles.page}>
    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>資產名稱 *</Text>
      <TextInput style={styles.input} placeholder="例如：黃金、0050、現金" value={name} onChangeText={setName}/>
      <Text style={styles.label}>資產類別</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap'}}>{assetCategories.map(c=><Pressable key={c} onPress={()=>{
        setCategory(c);if(id!==undefined)return;if(c==='現金'){setUnit('元');setUnitPrice('1');}else if(c==='黃金'&&unit==='股')setUnit('g');
      }} style={[styles.chip,category===c&&styles.activeChip]}><Text style={[styles.chipText,category===c&&styles.activeChipText]}>{c}</Text></Pressable>)}</View>
      <Text style={styles.label}>計量單位 *（可以自行輸入）</Text>
      <TextInput style={styles.input} placeholder="g、股、枚、張、元" value={unit} editable={id===undefined} onChangeText={setUnit}/>
      {id!==undefined&&<Text style={styles.tiny}>為避免不同單位混在同一條歷史曲線中，建立後不可變更計量單位；如需換單位，請新增另一項資產。</Text>}
      <Text style={styles.label}>持有數量 *</Text>
      <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="例如：7.35" value={quantity} onChangeText={setQuantity}/>
      <Text style={styles.label}>參考單價（TWD）*</Text>
      <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="例如：3000" value={unitPrice} onChangeText={setUnitPrice}/>
      <View style={[styles.card,{marginTop:20}]}><Text style={styles.tiny}>試算資產價值</Text>
        <Text style={styles.amount}>{money(q!==null&&p!==null?roundMoney(q*p):0)}</Text></View>
      <Text style={styles.label}>目前資產金額（TWD）* — 與數量獨立記錄</Text>
      <TextInput style={styles.input} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder="例如：5000"/>
      <Pressable style={styles.chip} onPress={()=>{if(q!==null&&p!==null)setAmount(String(roundMoney(q*p)));}}>
        <Text style={styles.chipText}>將「數量 × 單價」填入金額</Text>
      </Pressable>
      <Text style={styles.tiny}>改數量或參考單價不會自動改金額。需要時請按上方試算填入；金額四捨五入至分。</Text>
      <Text style={styles.label}>備註</Text>
      <TextInput style={[styles.input,{height:80,textAlignVertical:'top'}]} multiline value={note} onChangeText={setNote}/>
      <Pressable style={[styles.button,{marginTop:20,opacity:busy?0.5:1}]} disabled={busy} onPress={submit}><Text style={styles.buttonText}>{busy?'儲存中…':'儲存資產'}</Text></Pressable>
      {id!==undefined&&<Pressable onPress={askDelete} style={{padding:18,alignItems:'center'}}><Text style={{color:palette.red,fontWeight:'700'}}>刪除此資產</Text></Pressable>}
    </ScrollView>
  </KeyboardAvoidingView>;
}
