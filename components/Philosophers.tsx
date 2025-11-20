
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

  // Helper to check fork availability
  const leftFork = (i: number) => i;
  const rightFork = (i: number) => (i + 1) % PHILOSOPHER_COUNT;

  const step = useCallback(() => {
    if (deadlockDetected) return;

    // Check for deadlock state: Everyone has left fork (or just one fork) and waiting for other
    // Simplified detection for visualization: If everyone has exactly one fork and is hungry/waiting
    const holdingOne = philosopherStates.filter(s => s === ActorState.HAS_LEFT_FORK).length;
    if (holdingOne === PHILOSOPHER_COUNT) {
        setDeadlockDetected(true);
        addLog("系统检测到死锁！所有哲学家都持有左手筷子等待右手筷子。");
        setIsRunning(false);
        return;
    }

    setPhilosopherStates(prevStates => {
        const newStates = [...prevStates];
        const newForks = [...forks];
        let changed = false;

        // Logic for each philosopher
        // We iterate randomly to simulate async threads
        const indices = Array.from({ length: PHILOSOPHER_COUNT }, (_, i) => i).sort(() => Math.random() - 0.5);

        for (const i of indices) {
            const currentState = newStates[i];
            const left = leftFork(i);
            const right = rightFork(i);

            // 1. EATING -> THINKING (Finish eating)
            if (currentState === ActorState.EATING) {
                // Randomly finish eating
                if (Math.random() > 0.6) {
                    newStates[i] = ActorState.THINKING;
                    newForks[left] = null;
                    newForks[right] = null;
                    addLog(`哲学家 ${i+1} 吃饱了，开始思考。`);
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

            // 3. HUNGRY -> Try to pick forks
            if (currentState === ActorState.HUNGRY) {
                // STRATEGY: NAIVE (Left then Right)
                if (!useHierarchy) {
                    if (newForks[left] === null) {
                        newForks[left] = i;
                        newStates[i] = ActorState.HAS_LEFT_FORK;
                        addLog(`哲学家 ${i+1} 拿起了左边的筷子。`);
                        changed = true;
                    }
                } 
                // STRATEGY: HIERARCHY (Resource Ordering)
                // Odd numbered pick Left then Right, Even numbered pick Right then Left (or similar)
                // Classic Dijkstra: Identify forks by number. Always pick lower number first.
                else {
                    const firstFork = Math.min(left, right);
                    const secondFork = Math.max(left, right);
                    
                    // Simplification for step-by-step:
                    // If holding nothing, try pick first
                    // If holding first, try pick second
                    // Note: We need a state for "HAS_FIRST_FORK" to be precise, but reusing HAS_LEFT_FORK as "HAS_ONE_FORK"
                    
                    if (newForks[firstFork] === null && newForks[secondFork] === null) {
                        // Atomic pickup for simplicity in this step logic, or
                        // actually visually we want to see partial pickup.
                        // Let's stick to: Can only pick up if BOTH are free? No, that's too safe (Monitor solution).
                        // Let's implement "Pick Lower First"
                        
                        if (newForks[firstFork] === null) {
                             newForks[firstFork] = i;
                             newStates[i] = ActorState.HAS_LEFT_FORK; // Using this state generically as "Has 1 fork"
                             changed = true;
                        }
                    }
                }
            }

            // 4. HAS ONE FORK -> Try pick second
            if (currentState === ActorState.HAS_LEFT_FORK) {
                if (!useHierarchy) {
                    // Naive: Needs Right
                    if (newForks[right] === null) {
                        newForks[right] = i;
                        newStates[i] = ActorState.EATING;
                        addLog(`哲学家 ${i+1} 拿起了右边的筷子，开始进餐！`);
                        changed = true;
                    }
                } else {
                    // Hierarchy: Needs higher numbered fork
                    const secondFork = Math.max(left, right);
                    if (newForks[secondFork] === null) {
                        newForks[secondFork] = i;
                        newStates[i] = ActorState.EATING;
                        addLog(`哲学家 ${i+1} 拿到第二支筷子，开始进餐！(有序)`);
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

  // Force Deadlock
  const triggerDeadlock = () => {
      setIsRunning(false);
      setUseHierarchy(false);
      setDeadlockDetected(true);
      
      const newStates = Array(PHILOSOPHER_COUNT).fill(ActorState.HAS_LEFT_FORK);
      const newForks = forks.map((_, i) => i); // Fork i taken by Phil i (Left fork)
      
      setPhilosopherStates(newStates);
      setForks(newForks);
      addLog("人为触发死锁：每个人都拿起了左手边的筷子！");
  };

  const reset = () => {
      setIsRunning(false);
      setDeadlockDetected(false);
      setPhilosopherStates(Array(PHILOSOPHER_COUNT).fill(ActorState.THINKING));
      setForks(Array(PHILOSOPHER_COUNT).fill(null));
      setLogs([]);
  };

  // Visualization geometry
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
                        // Fork i is between Phil i and Phil i+1
                        const angle = ((i * (360 / PHILOSOPHER_COUNT)) + (360 / PHILOSOPHER_COUNT) / 2) - 90;
                        const rad = (angle * Math.PI) / 180;
                        
                        // Default position on table
                        let dist = 70; // distance from center
                        let forkX = center.x + dist * Math.cos(rad);
                        let forkY = center.y + dist * Math.sin(rad);
                        let rotation = angle;

                        // If taken, move towards owner
                        if (owner !== null) {
                            const ownerAngle = (owner * (360 / PHILOSOPHER_COUNT)) - 90;
                            const ownerRad = (ownerAngle * Math.PI) / 180;
                            // Move closer to owner
                            forkX = center.x + (radius - 35) * Math.cos(ownerRad);
                            forkY = center.y + (radius - 35) * Math.sin(ownerRad);
                            
                            // Slight offset to left or right hand
                            // This logic is purely visual approximation
                            const isLeftHand = (owner === i); // If owner index matches fork index, it's their left fork
                            const offsetAngle = ownerRad + (isLeftHand ? -0.3 : 0.3);
                             forkX = center.x + (radius - 35) * Math.cos(offsetAngle);
                             forkY = center.y + (radius - 35) * Math.sin(offsetAngle);
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
