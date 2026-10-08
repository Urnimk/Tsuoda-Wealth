import { StyleSheet } from 'react-native';
export const palette = {
  navy: '#19385D', blue:'#2563EB', teal:'#0891B2', green:'#059669',
  text:'#152239', muted:'#64748B', bg:'#F5F7FB', border:'#E2E8F0', white:'#FFFFFF', red:'#B91C1C'
};
export const styles = StyleSheet.create({
  page:{flex:1, backgroundColor:palette.bg}, body:{padding:16,paddingBottom:42},
  card:{backgroundColor:palette.white,borderRadius:18,padding:18,marginBottom:14,borderColor:palette.border,borderWidth:1},
  title:{fontSize:22,fontWeight:'800',color:palette.text,marginBottom:12},
  subtitle:{fontSize:17,fontWeight:'700',color:palette.text,marginBottom:9},
  tiny:{fontSize:13,color:palette.muted}, name:{fontSize:16,fontWeight:'700',color:palette.text},
  amount:{fontSize:28,fontWeight:'800',color:palette.navy},
  row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12},
  button:{backgroundColor:palette.blue,borderRadius:12,paddingVertical:12,paddingHorizontal:16,alignItems:'center',justifyContent:'center'},
  buttonText:{color:palette.white,fontSize:15,fontWeight:'700'},
  outline:{borderColor:palette.blue,borderWidth:1,borderRadius:12,paddingVertical:10,paddingHorizontal:14,alignItems:'center'},
  outlineText:{color:palette.blue,fontWeight:'700'},
  input:{borderColor:palette.border,borderWidth:1,borderRadius:10,backgroundColor:palette.white,paddingHorizontal:13,paddingVertical:12,color:palette.text,fontSize:16},
  label:{color:palette.text,fontWeight:'700',marginBottom:7,marginTop:12},
  chip:{borderWidth:1,borderColor:palette.border,paddingHorizontal:12,paddingVertical:8,borderRadius:20,marginRight:7,marginBottom:8},
  activeChip:{backgroundColor:palette.blue,borderColor:palette.blue},
  chipText:{fontSize:13,color:palette.text},activeChipText:{color:palette.white},
  empty:{color:palette.muted,paddingVertical:20,textAlign:'center'},
});
export const chartColors = ['#2563EB','#059669','#D97706','#7C3AED','#DB2777','#0891B2','#DC2626','#4F46E5'];
