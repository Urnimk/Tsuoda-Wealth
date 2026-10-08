import React from 'react';
import {Text,View,useWindowDimensions} from 'react-native';
import {LineChart} from 'react-native-gifted-charts';
import {chartColors,palette,styles} from '../theme/styles';
import {numberText} from '../utils/format';
export interface TrendSeries {key:string;name:string;values:number[];color?:string;}
export function TrendChart({months,series,unit='NT$',emptyText='尚無快照資料'}:{months:string[];series:TrendSeries[];unit?:string;emptyText?:string}){
  const {width}=useWindowDimensions();
  if(!months.length||!series.length)return <Text style={styles.empty}>{emptyText}</Text>;
  const peak=Math.max(1,...series.flatMap(s=>s.values));
  const step = Math.pow(10,Math.floor(Math.log10(peak/4)));
  const stepValue=Math.max(step,Math.ceil(peak/(4*step))*step);
  const maxValue=stepValue*4;
  const sets=series.map((s,i)=>({
    color:s.color??chartColors[i%chartColors.length],thickness:2.5,
    data:s.values.map((v,j)=>({value:v,label:months[j].slice(2)}))
  }));
  return <View>
    <LineChart dataSet={sets} width={Math.max(220,width-89)} height={215}
      noOfSections={4} maxValue={maxValue} stepValue={stepValue}
      spacing={66} initialSpacing={12} endSpacing={20}
      yAxisLabelWidth={45} yAxisTextStyle={{color:palette.muted,fontSize:10}}
      xAxisLabelTextStyle={{color:palette.muted,fontSize:10}}
      color={palette.blue} dataPointsRadius={3}
      rulesColor={palette.border} yAxisColor={palette.border} xAxisColor={palette.border}
      formatYLabel={value=>{
        const n=Number(value);
        return n>=1000000?(n/1000000).toFixed(1)+'M':n>=1000?(n/1000).toFixed(n>=10000?0:1)+'k':String(Math.round(n*100)/100);
      }}
      isAnimated={false}/>
    <View style={{flexDirection:'row',flexWrap:'wrap',marginTop:12}}>
      {series.map((s,i)=><View key={s.key} style={{flexDirection:'row',alignItems:'center',marginRight:15,marginBottom:6}}>
        <View style={{width:10,height:10,borderRadius:5,backgroundColor:s.color??chartColors[i%chartColors.length],marginRight:5}}/>
        <Text style={{fontSize:12,color:palette.text}}>{s.name}</Text>
      </View>)}
    </View>
    <Text style={{fontSize:12,color:palette.muted,marginTop:5}}>單位：{unit}。下方列出快照精確數值。</Text>
    {months.map((m,j)=><Text key={`${m}-${j}`} style={{color:palette.muted,fontSize:12,marginTop:3}}>
      {m}：{series.map(s=>`${s.name} ${numberText(s.values[j]??0)}`).join(' · ')}
    </Text>)}
  </View>;
}
