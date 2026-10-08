import React, {createContext,useCallback,useContext,useEffect,useMemo,useState,useRef} from 'react';
import {AppState,ActivityIndicator,Text,View,Pressable} from 'react-native';
import {useSQLiteContext} from 'expo-sqlite';
import type {Asset,AssetInput,SnapshotWithItems} from '../types/models';
import {localYearMonth} from '../utils/format';
import {listAssets,listSnapshots,removeAsset,saveAsset,saveSnapshot,getAutoDay,setAutoDay,recordDueSnapshot} from '../database/database';
import {exportBackup,restoreBackup} from '../database/backup';
interface Store {
  backup:()=>Promise<string>; restore:(text:string)=>Promise<void>;
  assets:Asset[]; snapshots:SnapshotWithItems[]; total:number; loading:boolean; error:string|null;
  refresh:()=>Promise<void>; upsert:(a:AssetInput,id?:number)=>Promise<void>;
  remove:(id:number)=>Promise<void>; recordMonth:(overwrite?:boolean)=>Promise<void>;
  autoDay:number; changeAutoDay:(day:number)=>Promise<void>; currentMonth:string;
}
const Context=createContext<Store|null>(null);
export function AssetProvider({children}:{children:React.ReactNode}) {
  const db=useSQLiteContext();
  const queue=useRef<Promise<unknown>>(Promise.resolve());
  const serial=useCallback(<T,>(work:()=>Promise<T>):Promise<T>=>{
    const result=queue.current.then(work,work);queue.current=result.catch(()=>{});return result;
  },[]);
  const [autoDay,setDay]=useState(0);
  const [assets,setAssets]=useState<Asset[]>([]);
  const [snapshots,setSnapshots]=useState<SnapshotWithItems[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [currentMonth,setCurrentMonth]=useState(localYearMonth(new Date()));
  const load=useCallback(async()=>{
    try {
      const [a,s]=await Promise.all([listAssets(db),listSnapshots(db)]);
      setAssets(a);setSnapshots(s);setDay(await getAutoDay(db));setCurrentMonth(localYearMonth(new Date()));setError(null);
    } catch(e){setError(String(e));throw e;}
    finally{setLoading(false);}
  },[db]);
  const refresh=useCallback(()=>serial(async()=>{try{await recordDueSnapshot(db);await load();}catch(e){setError(String(e));setLoading(false);throw e;}}),[db,load,serial]);
  useEffect(()=>{
    refresh().catch(()=>{});
    const sub=AppState.addEventListener('change',status=>{
      if(status==='active')refresh().catch(()=>{});
    });
    const timer=setInterval(()=>{if(AppState.currentState==='active')refresh().catch(()=>{});},60_000);
    return ()=>{sub.remove();clearInterval(timer);};
  },[refresh]);
  const upsert=useCallback((input:AssetInput,id?:number)=>serial(async()=>{await saveAsset(db,input,id);await load();}),[db,load,serial]);
  const remove=useCallback((id:number)=>serial(async()=>{await removeAsset(db,id);await load();}),[db,load,serial]);
  const recordMonth=useCallback((overwrite=false)=>serial(async()=>{
    await saveSnapshot(db,localYearMonth(new Date()),overwrite);await load();
  }),[db,load,serial]);
  const total=useMemo(()=>assets.reduce((sum,a)=>sum+a.amountCents,0)/100,[assets]);
  const changeAutoDay=useCallback((day:number)=>serial(async()=>{await setAutoDay(db,day);await load();}),[db,load,serial]);
  const backup=useCallback(()=>serial(()=>exportBackup(db)),[db,serial]);
  const restore=useCallback((text:string)=>serial(async()=>{await restoreBackup(db,text);await load();}),[db,serial,load]);
  if(loading)return <View style={{flex:1,justifyContent:'center'}}><ActivityIndicator/><Text>載入資產資料…</Text></View>;
  if(error)return <View style={{flex:1,justifyContent:'center',padding:24}}><Text>資料讀取失敗：{error}</Text><Pressable onPress={()=>refresh().catch(()=>{})}><Text>重新讀取（不清除資料）</Text></Pressable></View>;
  return <Context.Provider value={{backup,restore,assets,snapshots,total,loading,error,refresh,upsert,remove,recordMonth,currentMonth,autoDay,changeAutoDay}}>{children}</Context.Provider>;
}
export function useAssets(){const value=useContext(Context);if(!value)throw new Error('AssetProvider missing');return value;}
