import React,{useState} from 'react';
import {Alert,Pressable,ScrollView,Text} from 'react-native';
import {File,Paths} from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import {useAssets} from '../context/AssetContext';
import {parseBackup} from '../database/backup';
import {styles} from '../theme/styles';
export function BackupScreen(){
  const {backup,restore}=useAssets();const [busy,setBusy]=useState(false);
  const exportFile=async()=>{
    setBusy(true);let file:File|undefined;
    try{
      if(!await Sharing.isAvailableAsync())throw new Error('此裝置無法分享檔案');
      const text=await backup();file=new File(Paths.cache,`assets-backup-${Date.now()}.json`);file.write(text);
      await Sharing.shareAsync(file.uri,{mimeType:'application/json',UTI:'public.json',dialogTitle:'儲存資產備份'});
    }catch(e){Alert.alert('匯出失敗',String(e));}finally{setBusy(false);}
  };
  const importFile=async()=>{
    setBusy(true);
    try{
      const picked=await DocumentPicker.getDocumentAsync({type:['application/json','text/plain'],copyToCacheDirectory:true});
      if(picked.canceled){setBusy(false);return;}
      const f=new File(picked.assets[0].uri);
      if(f.size>20_000_000)throw new Error('檔案超過20MB');
      const text=await f.text();const b=parseBackup(text);
      Alert.alert('確認還原備份',`將以 ${b.assets.length} 筆資產及 ${b.snapshots.length} 個月快照取代目前全部資料。建議先匯出目前資料。`,[
        {text:'取消',style:'cancel',onPress:()=>setBusy(false)},
        {text:'取代並還原',style:'destructive',onPress:()=>{restore(text).then(()=>Alert.alert('完成','備份已還原')).catch(e=>Alert.alert('還原失敗',String(e))).finally(()=>setBusy(false));}}
      ],{cancelable:false});
    }catch(e){Alert.alert('讀取失敗',String(e));setBusy(false);}
  };
  return <ScrollView style={styles.page} contentContainerStyle={styles.body}>
    <Text style={styles.title}>備份與還原</Text>
    <Text style={styles.tiny}>備份包含目前資產、全部月快照及指定日設定。請將 JSON 檔存至自己管理的位置；檔案未加密。清除 App 資料或解除安裝前請先備份。</Text>
    <Pressable disabled={busy} style={[styles.button,{marginTop:24,opacity:busy?0.5:1}]} onPress={exportFile}><Text style={styles.buttonText}>匯出備份檔</Text></Pressable>
    <Pressable disabled={busy} style={[styles.button,{marginTop:24,opacity:busy?0.5:1}]} onPress={importFile}><Text style={styles.buttonText}>選擇備份檔還原</Text></Pressable>
    {busy&&<Text>處理中…</Text>}
  </ScrollView>;
}
