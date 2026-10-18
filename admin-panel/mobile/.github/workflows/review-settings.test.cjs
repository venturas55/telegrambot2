const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');

function load({failDelete=false}={}) {
  const events=[],alerts=[],items=[];
  let release;
  const react={createElement:(type,props,...children)=>{
    if(props?.title) items.push(props);
    return {type,props,children};
  },useState:()=>[false,()=>{}],useRef:()=>({current:false})};
  const modules={
    react,
    'react-native':{StyleSheet:{create:x=>x},Alert:{alert:(...args)=>alerts.push(args)}},
    'expo-sqlite':{useSQLiteContext:()=>({})},
    'expo-file-system/legacy':{
      documentDirectory:'file:///docs/',EncodingType:{UTF8:'utf8'},
      writeAsStringAsync:async()=>events.push('write'),
      readDirectoryAsync:async()=>['ritmo-export-2026-10-16.json','other.json','ritmo.db','ritmo-export-notes.json'],
      deleteAsync:async path=>{if(failDelete)throw Error('disk failure');events.push(path);}
    },
    'expo-sharing':{isAvailableAsync:async()=>true,shareAsync:()=>new Promise(r=>{release=r;})},
    'lucide-react-native':{},'../../src/ui':{},'../../src/theme':{palette:{}},
    '../../src/context':{useData:()=>({habits:[],completions:[],refresh:async()=>events.push('refresh')})},
    '../../src/db':{clearDatabase:async()=>events.push('clear')},
    '../../src/notifications':{cancelAllHabitNotifications:async()=>events.push('cancel')}
  };
  const source=fs.readFileSync('app/(tabs)/settings.tsx','utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
  const exports={};vm.runInNewContext(compiled,{exports,require:id=>{assert.ok(id in modules,id);return modules[id];}});
  exports.default();
  return {events,alerts,exportData:items.find(x=>x.onPress&&x.title==='Exportar datos').onPress,
    erase:items.find(x=>x.title==='Eliminar todos mis datos').onPress,release:()=>release()};
}

test('erase removes only internal exports, cancels notifications and clears database',async()=>{
  const h=load();h.erase();await h.alerts[0][2][1].onPress();
  assert.deepEqual(h.events,['cancel','file:///docs/ritmo-export-2026-10-16.json','clear','refresh']);
  assert.equal(h.alerts.at(-1)[0],'Datos eliminados');
});
test('export prevents duplicate export and erase until share finishes',async()=>{
  const h=load();const first=h.exportData();await h.exportData();h.erase();
  assert.equal(h.alerts.length,0);assert.deepEqual(h.events,['write']);
  await new Promise(r=>setImmediate(r));h.release();await first;
  h.erase();assert.equal(h.alerts.length,1);
});
test('failed file deletion does not report successful erasure; lock is released',async()=>{
  const h=load({failDelete:true});h.erase();await h.alerts[0][2][1].onPress();
  assert.deepEqual(h.events,['cancel']);assert.equal(h.alerts.at(-1)[0],'Error');
  h.erase();assert.equal(h.alerts.length,3);
});
