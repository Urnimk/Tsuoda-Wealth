import React from 'react';
import {View,Text,Pressable} from 'react-native';
export class AppErrorBoundary extends React.Component<{children:React.ReactNode},{error:Error|null}> {
  state:{error:Error|null}={error:null};
  static getDerivedStateFromError(error:Error){return {error};}
  render(){
    if(this.state.error)return <View style={{flex:1,justifyContent:'center',padding:24}}>
      <Text style={{fontSize:20,fontWeight:'bold'}}>無法載入 App</Text>
      <Text>{this.state.error.message}</Text>
      <Text>目前資料不會自動清除。請重試；仍失敗時保留錯誤訊息供排查。</Text>
      <Pressable onPress={()=>this.setState({error:null})} style={{padding:20}}><Text>重試</Text></Pressable>
    </View>;
    return this.props.children;
  }
}
