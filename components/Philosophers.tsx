
import React, { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Play, Pause, AlertTriangle, CheckCircle, Utensils } from 'lucide-react';
import { ActorState } from '../types';

// Config
const PHILOSOPHER_COUNT = 5;

const Philosophers: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [useHierarchy, setUseHierarchy] = useState(false);
  const [deadlockDetected, setDeadlockDetected] = useState(false);

  // States
  // 0: Thinking, 1: Hungry, 2: Eating
  const [philosopherStates, setPhilosopherStates] = useState<ActorState[]>(
    Array(PHILOSOPHER_COUNT).fill(ActorState.THINKING)
  );
  
  // Forks: null = free, number = held by philosopher index
  const [forks, setForks] = useState<(number | null)[]>(
    Array(PHILOSOPHER_COUNT).fill(null)
  );

  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 6));

  // GEOMETRY MAPPING
  // Visual Layout: P0 (Top) -> Fork0 -> P1 (Right) -> Fork1 ...
  // Therefore: Fork i is between P[i] and P[i+1].
  // P[i]'s Right Fork is Fork[i].
  // P[i]'s Left Fork is Fork[i-1] (wrapped).
  
  const getRightForkIndex = (i: number) => i;
  const getLeftForkIndex = (i: number) => (i - 1 + PHILOSOPHER_COUNT) % PHILOSOPHER_COUNT;

  const step = useCallback(() => {
    if (deadlockDetected) return;

    // Deadlock Check: Everyone holding LEFT fork ONLY
    // Note: HAS_LEFT_FORK state implies holding ONE fork.
    // We need to verify logic consistency.
    const holdingOne = philosopherStates.filter(s => s === ActorState.HAS_LEFT_FORK).length;
    if (holdingOne === PHILOSOPHER_COUNT) {
        // Double check that everyone is waiting for the other fork
        setDeadlockDetected(true);
        addLog("系统检测到死锁！所有哲学家都持有左手筷子等待右手筷子。");
        setIsRunning(false);
        return;
    }

    setPhilosopherStates(prevStates => {
        const newStates = [...prevStates];
        const newForks = [...forks];
        let changed = false;

        // Iterate randomly
        const indices = Array.from({ length: PHILOSOPHER_COUNT }, (_, i) => i).sort(() => Math.random() - 0.5);

        for (const i of indices) {
            const currentState = newStates[i];
            
            // Identify specific forks for this philosopher
            const leftForkIdx = getLeftForkIndex(i);
            const rightForkIdx = getRightForkIndex(i);

            // 1. EATING -> THINKING
            if (currentState === ActorState.EATING) {
                if (Math.random() > 0.6) {
                    newStates[i] = ActorState.THINKING;
                    // Release both
                    if (newForks[leftForkIdx] === i) newForks[leftForkIdx] = null;
                    if (newForks[rightForkIdx] === i) newForks[rightForkIdx] = null;
                    
                    addLog(`哲学家 ${i+1} 吃饱了，放下左右筷子 (${leftForkIdx}, ${rightForkIdx}) 开始思考。`);
                    changed = true;
                }
                continue;
            }

            // 2. THINKING -> HUNGRY
            if (currentState === ActorState.THINKING) {
                if (Math.random() > 0.7) {
                    newStates[i] = ActorState.HUNGRY;
                    addLog(`哲学家 ${i+1} 饿了。`);
                    changed = true;
                }
                continue;
            }

            // 3. HUNGRY -> Try pick up FIRST fork
            if (currentState === ActorState.HUNGRY) {
                if (!useHierarchy) {
                    // Naive: Try pick Left first
                    if (newForks[leftForkIdx] === null) {
                        newForks[leftForkIdx] = i;
                        newStates[i] = ActorState.HAS_LEFT_FORK; 
                        addLog(`哲学家 ${i+1} 拿起了左手筷子 (Fork ${leftForkIdx})。`);
                        changed = true;
                    }
                } else {
                    // Hierarchy: Pick Lower Numbered Fork First
                    const firstIdx = Math.min(leftForkIdx, rightForkIdx);
                    const secondIdx = Math.max(leftForkIdx, rightForkIdx);
                    
                    // Simplified step logic: Only pick if the lower one is free
                    // In real OS, we block on P(sem). Here we check availability.
                    // If holding nothing, try pick 'firstIdx'
                    if (newForks[firstIdx] === null) {
                        newForks[firstIdx] = i;
                        newStates[i] = ActorState.HAS_LEFT_FORK; // Generic "Has 1 fork" state
                        addLog(`哲学家 ${i+1} (有序策略) 拿起了小号筷子 (Fork ${firstIdx})。`);
                        changed = true;
                    }
                }
                continue;
            }

            // 4. HAS ONE FORK -> Try pick up SECOND fork
            if (currentState === ActorState.HAS_LEFT_FORK) {
                if (!useHierarchy) {
                    // Naive: Needs Right
                    if (newForks[rightForkIdx] === null) {
                        newForks[rightForkIdx] = i;
                        newStates[i] = ActorState.EATING;
                        addLog(`哲学家 ${i+1} 拿起了右手筷子 (Fork ${rightForkIdx})，开始进餐！`);
                        changed = true;
                    }
                } else {
                    // Hierarchy: Needs the Higher Numbered Fork
                    const secondIdx = Math.max(leftForkIdx, rightForkIdx);
                    // Note: If we picked right first (because it was smaller), we need left now.
                    // We just check if 'secondIdx' matches what we don't have?
                    // Let's just check both. We need to hold both to eat.
                    // We already hold one (assumed to be the smaller one).
                    
                    if (newForks[secondIdx] === null) {
                        newForks[secondIdx] = i;
                        newStates[i] = ActorState.EATING;
                        addLog(`哲学家 ${i+1} 拿起了大号筷子 (Fork ${secondIdx})，开始进餐！`);
                        changed = true;
                    }
                }
            }
        }

        if (changed) {
            setForks(newForks);
            return newStates;
        }
        return prevStates;
    });
  }, [deadlockDetected, forks, philosopherStates, useHierarchy]);

  useEffect(() => {
    let interval: number;
    if (isRunning) {
        interval = window.setInterval(step, 800);
    }
    return () => clearInterval(interval);
  }, [isRunning, step]);

  // Force Deadlock: Everyone takes Left Fork
  const triggerDeadlock = () => {
      setIsRunning(false);
      setUseHierarchy(false);
      
      const newStates = Array(PHILOSOPHER_COUNT).fill(ActorState.HAS_LEFT_FORK);
      const newForks = Array(PHILOSOPHER_COUNT).fill(null);
      
      // Assign Left Fork to each Philosopher
      for(let i=0; i<PHILOSOPHER_COUNT; i++) {
          const leftIdx = getLeftForkIndex(i);
          newForks[leftIdx] = i;
      }
      
      setPhilosopherStates(newStates);
      setForks(newForks);
      setDeadlockDetected(true); // Immediate detect next tick or manually set
      addLog("人为触发死锁：每个人都拿起了左手边的筷子！");
  };

  const reset = () => {
      setIsRunning(false);
      setDeadlockDetected(false);
      setPhilosopherStates(Array(PHILOSOPHER_COUNT).fill(ActorState.THINKING));
      setForks(Array(PHILOSOPHER_COUNT).fill(null));
      setLogs([]);
  };

  // Visualization Geometry
  const radius = 120;
  const center = { x: 160, y: 160 };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
             <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Utensils className="text-purple-500"/> 哲学家就餐问题
                    </h2>
                    <p className="text-slate-500 text-sm">演示死锁现象与资源分级解决方案</p>
                </div>
                <div className="flex flex-wrap gap-3 justify-center">
                    <button 
                        onClick={() => { reset(); setUseHierarchy(!useHierarchy); }}
                        className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${useHierarchy ? 'bg-green-50 border-green-300 text-green-700' : 'bg-yellow-50 border-yellow-300 text-yellow-700'}`}
                    >
                        {useHierarchy ? "策略：资源分级 (死锁免疫)" : "策略：朴素做法 (可能死锁)"}
                    </button>
                    
                    <div className="w-px h-8 bg-slate-200 mx-1"></div>

                    <button onClick={triggerDeadlock} className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-xs font-bold hover:bg-red-100">
                        ⚡ 触发死锁
                    </button>
                    <button onClick={reset} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><RotateCcw size={18}/></button>
                    <button 
                        onClick={() => setIsRunning(!isRunning)}
                        disabled={deadlockDetected}
                        className={`px-6 py-2 rounded-lg font-bold text-white shadow-md ${deadlockDetected ? 'bg-slate-400 cursor-not-allowed' : isRunning ? 'bg-amber-500' : 'bg-blue-600'}`}
                    >
                        {isRunning ? <Pause size={18}/> : <Play size={18}/>}
                    </button>
                </div>
             </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Visual Area */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden">
                {deadlockDetected && (
                    <div className="absolute top-4 left-0 right-0 text-center z-20 animate-bounce">
                        <span className="bg-red-600 text-white px-4 py-2 rounded-full font-bold shadow-lg flex items-center justify-center w-fit mx-auto gap-2">
                            <AlertTriangle size={18} /> 发生死锁 (Deadlock)
                        </span>
                    </div>
                )}

                <div className="relative w-[320px] h-[320px]">
                    {/* Table */}
                    <div className="absolute inset-0 m-auto w-[200px] h-[200px] rounded-full bg-slate-100 border-4 border-slate-200 shadow-inner flex items-center justify-center">
                         <div className="text-center text-slate-300 font-bold text-xs">
                            DINING<br/>TABLE
                         </div>
                    </div>

                    {/* Philosophers */}
                    {philosopherStates.map((state, i) => {
                        const angle = (i * (360 / PHILOSOPHER_COUNT)) - 90; // -90 to start at top
                        const rad = (angle * Math.PI) / 180;
                        const x = center.x + radius * Math.cos(rad);
                        const y = center.y + radius * Math.sin(rad);

                        let colorClass = "bg-blue-500 border-blue-600"; // Thinking
                        if (state === ActorState.HUNGRY || state === ActorState.HAS_LEFT_FORK) colorClass = "bg-yellow-500 border-yellow-600";
                        if (state === ActorState.EATING) colorClass = "bg-red-500 border-red-600 animate-pulse";

                        return (
                            <div 
                                key={i}
                                className={`absolute w-14 h-14 rounded-full border-4 text-white flex items-center justify-center font-bold shadow-lg transition-all duration-500 z-10 ${colorClass}`}
                                style={{ 
                                    left: x - 28, 
                                    top: y - 28,
                                }}
                            >
                                <span className="text-lg">{i+1}</span>
                                {/* Status Badge */}
                                <div className="absolute -bottom-6 text-[10px] text-slate-500 font-bold bg-white/80 px-1 rounded whitespace-nowrap">
                                    {state === ActorState.THINKING && "思考"}
                                    {(state === ActorState.HUNGRY || state === ActorState.HAS_LEFT_FORK) && "饥饿"}
                                    {state === ActorState.EATING && "进餐"}
                                </div>
                            </div>
                        );
                    })}

                    {/* Forks */}
                    {forks.map((owner, i) => {
                        // Fork i Geometry: Between P[i] and P[i+1]
                        // This angle places it between the two philosophers
                        const angle = ((i * (360 / PHILOSOPHER_COUNT)) + (360 / PHILOSOPHER_COUNT) / 2) - 90;
                        const rad = (angle * Math.PI) / 180;
                        
                        // Default position on table
                        let forkX = center.x + 70 * Math.cos(rad);
                        let forkY = center.y + 70 * Math.sin(rad);
                        let rotation = angle; // Base rotation pointing out

                        // If taken, calculate hand position
                        if (owner !== null) {
                            const ownerAngle = (owner * (360 / PHILOSOPHER_COUNT)) - 90;
                            
                            // Determine if it's owner's Right Hand or Left Hand
                            // Logic: Fork i is Right of P[i], Left of P[i+1]
                            // We compare owner index with fork index
                            const isRightHand = (owner === i);
                            const isLeftHand = (owner === (i + 1) % PHILOSOPHER_COUNT);

                            // Offset for hands (in radians)
                            // Right hand is clockwise (+), Left hand is counter-clockwise (-)
                            const handOffset = isRightHand ? 0.35 : -0.35;
                            const ownerRad = ((ownerAngle) * Math.PI) / 180;
                            const targetRad = ownerRad + handOffset;

                            // Move close to philosopher
                            forkX = center.x + (radius - 35) * Math.cos(targetRad);
                            forkY = center.y + (radius - 35) * Math.sin(targetRad);
                            
                            // Rotate to simulate holding
                            // Base person angle + 90 = facing center
                            // Right hand: Tilt left (-45). Left hand: Tilt right (+45)
                            rotation = ownerAngle + 90 + (isRightHand ? -45 : 45);
                        }

                        return (
                            <div
                                key={i}
                                className={`absolute w-1.5 h-12 transition-all duration-500 ${owner !== null ? 'bg-slate-800 shadow-md' : 'bg-slate-300'}`}
                                style={{
                                    left: forkX,
                                    top: forkY,
                                    transform: `translate(-50%, -50%) rotate(${rotation + 90}deg)`,
                                    borderRadius: '2px'
                                }}
                            >
                                {/* Fork Tines visual */}
                                <div className={`absolute -top-1 left-[-2px] w-2.5 h-3 border-b-2 border-x-2 rounded-b-sm ${owner !== null ? 'border-slate-800' : 'border-slate-300'}`}></div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Info Panel */}
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-700 mb-4">实时状态监控</h3>
                    <div className="space-y-3">
                        {philosopherStates.map((s, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                                <span className="font-bold text-slate-600">哲学家 {i+1}</span>
                                <div className="flex-1 mx-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full transition-all duration-500 ${
                                        s === ActorState.EATING ? 'bg-red-500 w-full' :
                                        s === ActorState.HAS_LEFT_FORK ? 'bg-yellow-500 w-2/3' :
                                        s === ActorState.HUNGRY ? 'bg-yellow-300 w-1/3' :
                                        'bg-blue-300 w-0'
                                    }`}></div>
                                </div>
                                <span className={`text-xs font-mono w-20 text-right ${
                                    s === ActorState.EATING ? 'text-red-500 font-bold' : 
                                    s === ActorState.THINKING ? 'text-blue-400' : 'text-yellow-600'
                                }`}>
                                    {s === ActorState.EATING ? 'EATING' : s === ActorState.THINKING ? 'THINKING' : 'WAITING'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-900 p-4 rounded-xl text-slate-300 font-mono text-xs min-h-[150px]">
                    <div className="border-b border-slate-700 pb-2 mb-2 font-bold uppercase flex justify-between">
                        <span>Event Logs</span>
                        <span className="text-slate-500">{deadlockDetected ? "HALTED" : "LIVE"}</span>
                    </div>
                    <div className="space-y-1">
                        {logs.map((log, i) => (
                            <div key={i} className="opacity-80 truncate border-l-2 border-slate-600 pl-2">{log}</div>
                        ))}
                        {logs.length === 0 && <div className="text-slate-600 italic">系统空闲...</div>}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Philosophers;
