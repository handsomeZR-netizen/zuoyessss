
import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, AlertTriangle, Info, Box, ShoppingCart, Lock, Layers, ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Actor, ActorState, BufferItem, LogEntry } from '../types';

const BUFFER_SIZE = 8; // Slightly reduced for better visual fit
const PRODUCER_COUNT = 3;
const CONSUMER_COUNT = 2;

const Experiment8: React.FC = () => {
  // Simulation Config
  const [isPlaying, setIsPlaying] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1200); 
  const [deadlockMode, setDeadlockMode] = useState(false);

  // System State
  const [buffer, setBuffer] = useState<(BufferItem | null)[]>(new Array(BUFFER_SIZE).fill(null));
  
  // Semaphores (Explicitly visualized)
  const [semEmpty, setSemEmpty] = useState(BUFFER_SIZE);
  const [semFull, setSemFull] = useState(0);
  const [mutexLocked, setMutexLocked] = useState(false);
  const [mutexOwner, setMutexOwner] = useState<string | null>(null);

  const [productCounter, setProductCounter] = useState(1);
  const [systemDeadlocked, setSystemDeadlocked] = useState(false);

  // Actors
  const [producers, setProducers] = useState<Actor[]>(
    Array.from({ length: PRODUCER_COUNT }, (_, i) => ({ id: i + 1, name: `P-${i + 1}`, state: ActorState.IDLE, actionCount: 0 }))
  );
  const [consumers, setConsumers] = useState<Actor[]>(
    Array.from({ length: CONSUMER_COUNT }, (_, i) => ({ id: i + 1, name: `C-${i + 1}`, state: ActorState.IDLE, actionCount: 0 }))
  );

  // Wait Queues (Visualizing OS Kernel Blocked Queues)
  const [mutexQueue, setMutexQueue] = useState<string[]>([]);
  const [emptyQueue, setEmptyQueue] = useState<string[]>([]); // Waiting for empty slot
  const [fullQueue, setFullQueue] = useState<string[]>([]);   // Waiting for full slot

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [bufferHistory, setBufferHistory] = useState<{time: number, count: number}[]>([]);

  const log = (actor: string, action: string, details: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setLogs(prev => [{
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString().split(' ')[0],
      actor,
      action,
      details,
      type
    }, ...prev].slice(0, 50));
  };

  // --- Simulation Logic ---

  const pickActor = (actorList: Actor[]) => {
    const idleActors = actorList.filter(a => a.state === ActorState.IDLE);
    if (idleActors.length === 0) return null;
    return idleActors[Math.floor(Math.random() * idleActors.length)];
  };

  const stepSimulation = useCallback(() => {
    if (systemDeadlocked) return;

    const itemsInBuffer = buffer.filter(i => i !== null).length;
    setBufferHistory(prev => [...prev.slice(-19), { time: Date.now(), count: itemsInBuffer }]);

    // Reset Working to Idle
    setProducers(prev => prev.map(p => p.state === ActorState.WORKING ? { ...p, state: ActorState.IDLE } : p));
    setConsumers(prev => prev.map(c => c.state === ActorState.WORKING ? { ...c, state: ActorState.IDLE } : c));

    // Random Decision
    const wantToProduce = Math.random() > 0.45; 

    if (wantToProduce) {
      // --- PRODUCER ---
      const producer = pickActor(producers);
      if (!producer) return;

      if (deadlockMode) {
        // DEADLOCK MODE: P(mutex) -> P(empty)
        
        // 1. P(mutex)
        if (mutexLocked) {
           // Wait for mutex
           setProducers(ps => ps.map(p => p.id === producer.id ? { ...p, state: ActorState.BLOCKED } : p));
           if(!mutexQueue.includes(producer.name)) setMutexQueue(q => [...q, producer.name]);
           return;
        }
        
        // Acquired Mutex
        setMutexLocked(true);
        setMutexOwner(producer.name);
        
        // 2. P(empty)
        if (semEmpty === 0) {
           // Deadlock condition: Holding Mutex, Waiting for Empty
           setSystemDeadlocked(true);
           setProducers(ps => ps.map(p => p.id === producer.id ? { ...p, state: ActorState.BLOCKED } : p));
           if(!emptyQueue.includes(producer.name)) setEmptyQueue(q => [...q, producer.name]);
           log(producer.name, "死锁", "持有 Mutex，但 Sem_Empty=0，无法生产", "error");
           return;
        }

        // Produce
        const newItem: BufferItem = { id: Date.now(), value: productCounter, producerId: producer.id };
        const insertIndex = buffer.findIndex(x => x === null);
        const newBuffer = [...buffer];
        newBuffer[insertIndex] = newItem;
        
        setBuffer(newBuffer);
        setProductCounter(n => n + 1);
        setSemEmpty(s => s - 1);
        setSemFull(s => s + 1);
        
        setProducers(ps => ps.map(p => p.id === producer.id ? { ...p, state: ActorState.WORKING, actionCount: p.actionCount + 1 } : p));
        log(producer.name, "生产", `放入槽位 [${insertIndex}]`, "success");

        // Release Mutex
        setMutexLocked(false);
        setMutexOwner(null);
        // Clear Wait Queues visual for this actor if they were there (simplified)
        setMutexQueue(q => q.filter(n => n !== producer.name));

      } else {
        // NORMAL MODE: P(empty) -> P(mutex)
        
        // 1. P(empty)
        if (semEmpty === 0) {
            setProducers(ps => ps.map(p => p.id === producer.id ? { ...p, state: ActorState.BLOCKED } : p));
            if(!emptyQueue.includes(producer.name)) setEmptyQueue(q => [...q, producer.name]);
            log(producer.name, "阻塞", "缓冲区满 (Sem_Empty=0)", "warning");
            return; 
        }
        
        // 2. P(mutex)
        if (mutexLocked) {
            setProducers(ps => ps.map(p => p.id === producer.id ? { ...p, state: ActorState.BLOCKED } : p));
            if(!mutexQueue.includes(producer.name)) setMutexQueue(q => [...q, producer.name]);
            return;
        }

        // Execute
        setSemEmpty(s => s - 1); // Decrement Empty
        setMutexLocked(true);
        setMutexOwner(producer.name);
        
        // Clear queues
        setEmptyQueue(q => q.filter(n => n !== producer.name));
        setMutexQueue(q => q.filter(n => n !== producer.name));

        const newItem: BufferItem = { id: Date.now(), value: productCounter, producerId: producer.id };
        const insertIndex = buffer.findIndex(x => x === null);
        const newBuffer = [...buffer];
        newBuffer[insertIndex] = newItem;
        
        setBuffer(newBuffer);
        setProductCounter(n => n + 1);
        
        setProducers(ps => ps.map(p => p.id === producer.id ? { ...p, state: ActorState.WORKING, actionCount: p.actionCount + 1 } : p));
        log(producer.name, "生产", `放入槽位 [${insertIndex}]`, "success");

        setMutexLocked(false);
        setMutexOwner(null);
        setSemFull(s => s + 1); // V(full)
      }

    } else {
      // --- CONSUMER ---
      const consumer = pickActor(consumers);
      if (!consumer) return;

      if (deadlockMode) {
         // 1. P(mutex)
         if (mutexLocked) {
             setConsumers(cs => cs.map(c => c.id === consumer.id ? { ...c, state: ActorState.BLOCKED } : c));
             if(!mutexQueue.includes(consumer.name)) setMutexQueue(q => [...q, consumer.name]);
             return;
         }

         setMutexLocked(true);
         setMutexOwner(consumer.name);

         // 2. P(full)
         if (semFull === 0) {
             setSystemDeadlocked(true);
             setConsumers(cs => cs.map(c => c.id === consumer.id ? { ...c, state: ActorState.BLOCKED } : c));
             if(!fullQueue.includes(consumer.name)) setFullQueue(q => [...q, consumer.name]);
             log(consumer.name, "死锁", "持有 Mutex，但 Sem_Full=0，无法消费", "error");
             return;
         }

         // Consume
         const takeIndex = buffer.findIndex(x => x !== null);
         const item = buffer[takeIndex]!;
         const newBuffer = [...buffer];
         newBuffer[takeIndex] = null;

         setBuffer(newBuffer);
         setSemFull(s => s - 1);
         setSemEmpty(s => s + 1);

         setConsumers(cs => cs.map(c => c.id === consumer.id ? { ...c, state: ActorState.WORKING, actionCount: c.actionCount + 1 } : c));
         log(consumer.name, "消费", `取出产品 ${item.value}`, "info");

         setMutexLocked(false);
         setMutexOwner(null);
         setMutexQueue(q => q.filter(n => n !== consumer.name));

      } else {
        // NORMAL MODE: P(full) -> P(mutex)
        
        // 1. P(full)
        if (semFull === 0) {
            setConsumers(cs => cs.map(c => c.id === consumer.id ? { ...c, state: ActorState.BLOCKED } : c));
            if(!fullQueue.includes(consumer.name)) setFullQueue(q => [...q, consumer.name]);
            log(consumer.name, "阻塞", "缓冲区空 (Sem_Full=0)", "warning");
            return;
        }
        
        // 2. P(mutex)
        if (mutexLocked) {
            setConsumers(cs => cs.map(c => c.id === consumer.id ? { ...c, state: ActorState.BLOCKED } : c));
            if(!mutexQueue.includes(consumer.name)) setMutexQueue(q => [...q, consumer.name]);
            return;
        }

        setSemFull(s => s - 1); // Decrement Full
        setMutexLocked(true);
        setMutexOwner(consumer.name);

        setFullQueue(q => q.filter(n => n !== consumer.name));
        setMutexQueue(q => q.filter(n => n !== consumer.name));

        const takeIndex = buffer.findIndex(x => x !== null);
        const item = buffer[takeIndex]!;
        const newBuffer = [...buffer];
        newBuffer[takeIndex] = null;

        setBuffer(newBuffer);
        
        setConsumers(cs => cs.map(c => c.id === consumer.id ? { ...c, state: ActorState.WORKING, actionCount: c.actionCount + 1 } : c));
        log(consumer.name, "消费", `取出产品 ${item.value}`, "info");

        setMutexLocked(false);
        setMutexOwner(null);
        setSemEmpty(s => s + 1); // V(empty)
      }
    }
  }, [buffer, consumers, producers, mutexLocked, productCounter, deadlockMode, systemDeadlocked, semEmpty, semFull, mutexQueue, emptyQueue, fullQueue]);


  useEffect(() => {
    let interval: number;
    if (isPlaying && !systemDeadlocked) {
      interval = window.setInterval(stepSimulation, simulationSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, simulationSpeed, stepSimulation, systemDeadlocked]);

  const reset = () => {
    setIsPlaying(false);
    setSystemDeadlocked(false);
    setBuffer(new Array(BUFFER_SIZE).fill(null));
    setSemEmpty(BUFFER_SIZE);
    setSemFull(0);
    setMutexLocked(false);
    setMutexOwner(null);
    setProductCounter(1);
    setProducers(ps => ps.map(p => ({ ...p, state: ActorState.IDLE, actionCount: 0 })));
    setConsumers(cs => cs.map(c => ({ ...c, state: ActorState.IDLE, actionCount: 0 })));
    setMutexQueue([]);
    setEmptyQueue([]);
    setFullQueue([]);
    setLogs([]);
    setBufferHistory([]);
  };

  // Visual Components
  const SemaphoreCounter = ({ label, value, max, color, queue }: { label: string, value: number | string, max?: number, color: string, queue: string[] }) => (
    <div className={`bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col relative overflow-hidden min-w-[120px]`}>
        <div className={`absolute top-0 left-0 w-1 h-full ${color}`}></div>
        <span className="text-xs text-slate-400 uppercase font-bold mb-1">{label}</span>
        <div className="text-2xl font-mono font-bold text-slate-800 flex items-baseline gap-1">
           {value} <span className="text-xs font-normal text-slate-400">{max !== undefined ? `/ ${max}` : ''}</span>
        </div>
        
        {/* Wait Queue Visualization */}
        <div className="mt-2 pt-2 border-t border-slate-100 min-h-[24px]">
            <span className="text-[10px] text-slate-400 block mb-1">Wait Queue:</span>
            <div className="flex -space-x-1">
                {queue.length === 0 && <span className="text-[10px] text-slate-300 italic">Empty</span>}
                {queue.map((actor, i) => (
                    <div key={i} className="w-5 h-5 rounded-full bg-slate-200 border border-white flex items-center justify-center text-[8px] font-bold text-slate-600 z-10" title={actor}>
                        {actor.charAt(0)}
                    </div>
                ))}
            </div>
        </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Control Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div>
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                 生产者 - 消费者模型 
                 {systemDeadlocked && <span className="bg-red-600 text-white text-xs px-2 py-1 rounded animate-bounce shadow-lg">DEADLOCK DETECTED</span>}
              </h2>
              <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
                <Layers size={14}/> 实验8：PV操作与信号量机制可视化
              </p>
           </div>
           
           <div className="flex flex-wrap items-center gap-3">
              {/* Mode Toggle */}
              <button 
                 onClick={() => { reset(); setDeadlockMode(!deadlockMode); }}
                 className={`flex items-center px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-wide transition-colors ${
                    deadlockMode 
                    ? 'bg-orange-50 border-orange-300 text-orange-700 shadow-sm' 
                    : 'bg-green-50 border-green-200 text-green-700 shadow-sm'
                 }`}
              >
                 <AlertTriangle size={14} className="mr-2" />
                 {deadlockMode ? "死锁模式: 交换 P(Mutex)/P(Empty)" : "安全模式: 标准顺序"}
              </button>

              <div className="h-8 w-px bg-slate-300 mx-2"></div>

              <button onClick={reset} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg" title="重置">
                  <RotateCcw size={20} />
              </button>
              
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={systemDeadlocked}
                className={`flex items-center px-6 py-2 rounded-lg font-bold text-white shadow-md transition-all active:scale-95 ${
                    systemDeadlocked ? 'bg-slate-400 cursor-not-allowed' :
                    isPlaying ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isPlaying ? <Pause size={18} className="mr-2" /> : <Play size={18} className="mr-2" />}
                {isPlaying ? "暂停" : "开始"}
              </button>
           </div>
        </div>
      </div>

      {/* SEMAPHORE DASHBOARD (The Flash Point) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SemaphoreCounter 
            label="Sem_Empty (空槽)" 
            value={semEmpty} 
            max={BUFFER_SIZE} 
            color="bg-blue-500"
            queue={emptyQueue}
          />
          <SemaphoreCounter 
            label="Mutex (互斥锁)" 
            value={mutexLocked ? 0 : 1} 
            max={1} 
            color="bg-red-500" 
            queue={mutexQueue}
          />
          <SemaphoreCounter 
            label="Sem_Full (产品数)" 
            value={semFull} 
            max={BUFFER_SIZE} 
            color="bg-green-500"
            queue={fullQueue}
          />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Visualization */}
          <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 min-h-[450px] flex flex-col relative">
              
              {/* Background Flow Arrows */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-5">
                 <ArrowRight size={200} />
              </div>

              {/* Actors & Buffer Layout */}
              <div className="flex-1 flex items-center justify-between gap-2 z-10">
                  
                  {/* Producers */}
                  <div className="flex flex-col gap-3 w-28">
                      <h3 className="text-center font-bold text-blue-500 text-xs uppercase mb-2">Producers</h3>
                      {producers.map(p => (
                          <div key={p.id} className={`relative p-2 rounded-lg border-2 transition-all duration-300 flex flex-col items-center ${
                              p.state === ActorState.WORKING ? 'bg-blue-50 border-blue-500 scale-110 shadow-lg' :
                              p.state === ActorState.BLOCKED ? 'bg-red-50 border-red-300 opacity-70' : 'bg-white border-slate-100 text-slate-400'
                          }`}>
                             <Box size={20} className={p.state===ActorState.WORKING?'text-blue-600':''} />
                             <span className="text-xs font-bold mt-1">{p.name}</span>
                             {p.state === ActorState.BLOCKED && <div className="absolute inset-0 bg-red-100/20 flex items-center justify-center text-[10px] font-bold text-red-600 transform -rotate-12">WAIT</div>}
                          </div>
                      ))}
                  </div>

                  {/* The Buffer (Conveyor Belt Style) */}
                  <div className="flex-1 bg-slate-50/80 backdrop-blur-sm rounded-2xl border-2 border-dashed border-slate-300 p-6 flex flex-col items-center relative">
                      <div className="absolute -top-3 bg-slate-200 px-2 py-1 rounded text-[10px] font-bold text-slate-600">
                          SHARED MEMORY BUFFER
                      </div>
                      
                      {/* Mutex Overlay */}
                      <div className={`absolute top-2 right-2 transition-all duration-300 ${mutexLocked ? 'opacity-100 scale-100' : 'opacity-20 scale-75'}`}>
                          {mutexLocked ? (
                              <div className="flex items-center gap-1 bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold border border-red-200">
                                  <Lock size={12} /> {mutexOwner}
                              </div>
                          ) : (
                              <div className="flex items-center gap-1 bg-green-100 text-green-600 px-2 py-1 rounded text-xs font-bold border border-green-200">
                                  OPEN
                              </div>
                          )}
                      </div>

                      <div className="grid grid-cols-4 gap-3 mt-6">
                          {buffer.map((item, idx) => (
                              <div key={idx} className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-xs font-bold shadow-sm transition-all duration-500 ${
                                  item 
                                  ? 'bg-gradient-to-br from-blue-400 to-blue-600 border-blue-700 text-white scale-100' 
                                  : 'bg-white border-slate-200 text-slate-200 scale-90'
                              }`}>
                                  {item ? item.value : idx}
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* Consumers */}
                  <div className="flex flex-col gap-3 w-28">
                      <h3 className="text-center font-bold text-green-500 text-xs uppercase mb-2">Consumers</h3>
                      {consumers.map(c => (
                          <div key={c.id} className={`relative p-2 rounded-lg border-2 transition-all duration-300 flex flex-col items-center ${
                              c.state === ActorState.WORKING ? 'bg-green-50 border-green-500 scale-110 shadow-lg' :
                              c.state === ActorState.BLOCKED ? 'bg-red-50 border-red-300 opacity-70' : 'bg-white border-slate-100 text-slate-400'
                          }`}>
                             <ShoppingCart size={20} className={c.state===ActorState.WORKING?'text-green-600':''} />
                             <span className="text-xs font-bold mt-1">{c.name}</span>
                             {c.state === ActorState.BLOCKED && <div className="absolute inset-0 bg-red-100/20 flex items-center justify-center text-[10px] font-bold text-red-600 transform -rotate-12">WAIT</div>}
                          </div>
                      ))}
                  </div>
              </div>

              {/* Educational Tooltip */}
              <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-start gap-2">
                 <Info size={14} className="mt-0.5 text-blue-400" />
                 <div>
                    <strong>观察重点：</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1 opacity-80">
                       <li>注意顶部的 <code>Sem_Empty</code> 和 <code>Sem_Full</code> 信号量数值如何随操作变化。</li>
                       <li>当数值为0时，请求资源的进程会进入对应的 <code>Wait Queue</code> (显示在信号量卡片下方)。</li>
                       <li>死锁模式下，观察生产者如何持有锁(Mutex=0)同时等待空位(Empty Queue)，导致系统卡死。</li>
                    </ul>
                 </div>
              </div>
          </div>

          {/* Logs & Charts */}
          <div className="flex flex-col gap-4 h-full">
             {/* Logs */}
             <div className="bg-slate-900 text-slate-300 rounded-2xl shadow-lg overflow-hidden flex flex-col h-[60%] min-h-[250px]">
                <div className="p-3 border-b border-slate-700 text-xs font-bold uppercase tracking-wider flex justify-between bg-slate-950">
                    <span>System Kernel Logs</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-[10px] custom-scrollbar">
                    {logs.length === 0 && <div className="text-center text-slate-600 mt-10">Waiting for system start...</div>}
                    {logs.map(log => (
                        <div key={log.id} className={`flex gap-2 animate-in fade-in slide-in-from-left-2 duration-300 ${
                            log.type === 'error' ? 'bg-red-900/20 p-1 rounded' : ''
                        }`}>
                            <span className="text-slate-600">[{log.timestamp}]</span>
                            <div className="flex-1">
                                <span className={`font-bold mr-1 ${
                                    log.type === 'error' ? 'text-red-400' : 
                                    log.type === 'success' ? 'text-green-400' : 
                                    log.type === 'warning' ? 'text-yellow-400' : 'text-blue-400'
                                }`}>{log.actor}:</span>
                                <span className="text-slate-300">{log.action}</span>
                            </div>
                        </div>
                    ))}
                </div>
             </div>

             {/* Chart */}
             <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col h-[40%]">
                 <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Buffer Utilization</h3>
                 <div className="flex-1 min-h-[100px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={bufferHistory}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="time" hide />
                            <YAxis domain={[0, BUFFER_SIZE]} tick={{fontSize: 10}} width={20} />
                            <RechartsTooltip 
                                contentStyle={{backgroundColor: '#1e293b', border:'none', color:'white', fontSize:'10px'}}
                                labelFormatter={() => ''}
                            />
                            <Area type="step" dataKey="count" stroke="#3b82f6" fill="#eff6ff" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                 </div>
             </div>
          </div>
      </div>
    </div>
  );
};

export default Experiment8;
