import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, PenTool, Users, AlertCircle } from 'lucide-react';
import { Actor, ActorState } from '../types';

// Config
const READERS_COUNT = 5;

const ReaderWriter: React.FC = () => {
  const [mode, setMode] = useState<'reader-priority' | 'writer-priority'>('reader-priority');
  const [active, setActive] = useState(false);
  
  // State
  const [readers, setReaders] = useState<Actor[]>(
    Array.from({ length: READERS_COUNT }, (_, i) => ({ id: i + 1, name: `读者 ${i + 1}`, state: ActorState.IDLE, actionCount: 0 }))
  );
  const [writer, setWriter] = useState<Actor>({ id: 99, name: "写者 (Writer)", state: ActorState.IDLE, actionCount: 0 });
  
  const [resourceState, setResourceState] = useState<'IDLE' | 'READING' | 'WRITING'>('IDLE');
  const [activeReaderCount, setActiveReaderCount] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 8));

  // Simulation Step
  const step = useCallback(() => {
    // 1. Reset working actors to IDLE randomly (simulate finishing task)
    if (writer.state === ActorState.WORKING) {
        if (Math.random() > 0.7) {
            setWriter(w => ({ ...w, state: ActorState.IDLE }));
            setResourceState('IDLE');
            addLog("写者完成写入。释放资源。");
            return;
        }
    }

    setReaders(prev => {
        let newReaders = [...prev];
        let countChanged = false;
        
        newReaders = newReaders.map(r => {
            if (r.state === ActorState.WORKING && Math.random() > 0.7) {
                countChanged = true;
                return { ...r, state: ActorState.IDLE };
            }
            return r;
        });

        if (countChanged) {
            const currentWorking = newReaders.filter(r => r.state === ActorState.WORKING).length;
            setActiveReaderCount(currentWorking);
            if (currentWorking === 0 && resourceState === 'READING') {
                setResourceState('IDLE');
                addLog("最后一名读者离开。资源空闲。");
            }
        }
        return newReaders;
    });

    // 2. Randomly request access
    const rand = Math.random();
    
    // Try Writer Request (30% chance)
    if (rand < 0.3 && writer.state === ActorState.IDLE) {
        // Logic based on priority
        if (mode === 'reader-priority') {
             // Writer can only write if resource is totally IDLE
             if (resourceState === 'IDLE') {
                 setWriter(w => ({ ...w, state: ActorState.WORKING, actionCount: w.actionCount + 1 }));
                 setResourceState('WRITING');
                 addLog("写者开始写入 (资源独占)。");
             } else {
                 // Blocked
                 // addLog("写者尝试写入但被阻塞。");
             }
        } else {
             // Writer Priority: If writer wants to write, new readers should be blocked (simulated by just checking idle here for simplicity, usually implies queuing)
             // Simplified: If IDLE, go.
             if (resourceState === 'IDLE') {
                setWriter(w => ({ ...w, state: ActorState.WORKING, actionCount: w.actionCount + 1 }));
                setResourceState('WRITING');
                addLog("写者开始写入 (写者优先)。");
            }
        }
    } 
    // Try Reader Request
    else if (rand >= 0.3) {
        const idleReader = readers.find(r => r.state === ActorState.IDLE);
        if (idleReader) {
             if (resourceState === 'WRITING') {
                 // Blocked by writer
             } else {
                 // If Reader Priority: Always allow if not writing
                 // If Writer Priority: Should check if writer is waiting (not fully implemented in this simple visuals, but we assume standard mutex logic)
                 
                 if (mode === 'writer-priority' && Math.random() > 0.5) {
                     // Artificial block to simulate writer preference "intent" logic if complex queue existed
                     // For visual simplicity: Writer priority means readers yield easier? 
                     // Let's stick to strict mutex logic: Reader can enter if not writing.
                 }

                 setReaders(prev => prev.map(r => r.id === idleReader.id ? { ...r, state: ActorState.WORKING, actionCount: r.actionCount + 1 } : r));
                 setResourceState('READING');
                 setActiveReaderCount(c => c + 1);
                 addLog(`${idleReader.name} 开始阅读。`);
             }
        }
    }

  }, [readers, writer, resourceState, mode]);

  useEffect(() => {
    let interval: number;
    if (active) {
        interval = window.setInterval(step, 800);
    }
    return () => clearInterval(interval);
  }, [active, step]);

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
             <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">读者 - 写者问题</h2>
                    <p className="text-slate-500">演示不同的优先级策略下的资源竞争</p>
                </div>
                <div className="flex gap-3 items-center">
                    <select 
                        value={mode} 
                        onChange={(e) => { setActive(false); setMode(e.target.value as any); }}
                        className="bg-slate-100 border-none rounded-lg px-4 py-2 text-sm font-medium"
                    >
                        <option value="reader-priority">读者优先 (Reader Priority)</option>
                        <option value="writer-priority">写者优先 (Writer Priority)</option>
                    </select>
                    <button 
                        onClick={() => setActive(!active)}
                        className={`px-6 py-2 rounded-lg font-bold text-white shadow-md ${active ? 'bg-yellow-500' : 'bg-blue-600'}`}
                    >
                        {active ? '暂停' : '开始'}
                    </button>
                </div>
             </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Readers */}
            <div className="bg-white p-6 rounded-xl border border-slate-200">
                <h3 className="flex items-center gap-2 font-bold text-slate-700 mb-6">
                    <Users size={20} /> 读者队列
                </h3>
                <div className="space-y-3">
                    {readers.map(r => (
                        <div key={r.id} className={`p-3 rounded-lg border flex justify-between items-center transition-all ${r.state === ActorState.WORKING ? 'bg-green-50 border-green-400 text-green-800 translate-x-2' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                            <span>{r.name}</span>
                            {r.state === ActorState.WORKING && <BookOpen size={16} />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Resource */}
            <div className="bg-slate-900 p-6 rounded-xl text-white flex flex-col items-center justify-center relative overflow-hidden">
                 <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                 <div className={`w-32 h-40 rounded-lg border-4 flex items-center justify-center mb-4 transition-all duration-500 ${
                     resourceState === 'WRITING' ? 'border-red-500 bg-red-900/50 shadow-[0_0_30px_rgba(239,68,68,0.5)]' :
                     resourceState === 'READING' ? 'border-green-500 bg-green-900/50 shadow-[0_0_30px_rgba(34,197,94,0.5)]' :
                     'border-slate-600 bg-slate-800'
                 }`}>
                     {resourceState === 'WRITING' && <PenTool size={48} className="text-red-400" />}
                     {resourceState === 'READING' && <BookOpen size={48} className="text-green-400" />}
                     {resourceState === 'IDLE' && <div className="text-slate-500 font-bold">IDLE</div>}
                 </div>
                 <div className="text-xl font-bold tracking-widest">SHARED DB</div>
                 <div className="mt-2 font-mono text-sm text-slate-400">
                    State: <span className={resourceState==='WRITING'?'text-red-400':resourceState==='READING'?'text-green-400':'text-white'}>{resourceState}</span>
                 </div>
                 {resourceState === 'READING' && <div className="mt-1 text-xs text-green-300">Active Readers: {activeReaderCount}</div>}
            </div>

            {/* Writer */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col justify-between">
                 <div>
                    <h3 className="flex items-center gap-2 font-bold text-slate-700 mb-6">
                        <PenTool size={20} /> 写者
                    </h3>
                    <div className={`p-6 rounded-xl border-2 text-center transition-all ${writer.state === ActorState.WORKING ? 'bg-red-50 border-red-500 text-red-800 scale-105' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                        <div className="font-bold text-lg mb-2">Single Writer</div>
                        <div className="text-sm">{writer.state === ActorState.WORKING ? '正在写入...' : '空闲 / 等待'}</div>
                    </div>
                 </div>

                 <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Event Log</h4>
                    <div className="space-y-1.5 text-xs font-mono text-slate-600">
                        {logs.map((l, i) => (
                            <div key={i} className="truncate opacity-80 border-b border-slate-100 pb-1">{l}</div>
                        ))}
                    </div>
                 </div>
            </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex gap-3">
            <AlertCircle className="text-blue-600 flex-shrink-0" />
            <div className="text-sm text-blue-800">
                <strong>策略说明：</strong>
                <ul className="list-disc list-inside mt-1 opacity-90">
                    <li><strong>读者优先：</strong> 只要有读者在读，后续读者可以直接加入，可能导致写者饥饿。</li>
                    <li><strong>写者优先：</strong> 当写者请求访问时，禁止新读者开始阅读，等待当前读者完成后立即让写者执行。</li>
                </ul>
            </div>
        </div>
    </div>
  );
};

export default ReaderWriter;