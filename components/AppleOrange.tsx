
import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, ArrowDown, ArrowUp, User, Apple as AppleIcon, Citrus } from 'lucide-react';
import { ActorState } from '../types';

const AppleOrange: React.FC = () => {
  const [active, setActive] = useState(false);
  
  // Plate Content: null, 'apple', 'orange'
  const [plate, setPlate] = useState<'apple' | 'orange' | null>(null);
  
  // Semaphores
  const [semPlate, setSemPlate] = useState(1); // Empty slots (1 or 0)
  const [semApple, setSemApple] = useState(0); // Apple available
  const [semOrange, setSemOrange] = useState(0); // Orange available
  
  // Actor States
  const [fatherState, setFatherState] = useState(ActorState.IDLE);
  const [motherState, setMotherState] = useState(ActorState.IDLE);
  const [sonState, setSonState] = useState(ActorState.IDLE);
  const [daughterState, setDaughterState] = useState(ActorState.IDLE);

  const [logs, setLogs] = useState<string[]>([]);
  const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 6));

  const step = useCallback(() => {
    // 1. Check if anyone is currently working, if so, finish their work and return (one tick for action)
    let someoneWorking = false;
    
    if (fatherState === ActorState.WORKING) { setFatherState(ActorState.IDLE); someoneWorking = true; }
    if (motherState === ActorState.WORKING) { setMotherState(ActorState.IDLE); someoneWorking = true; }
    if (sonState === ActorState.WORKING) { setSonState(ActorState.IDLE); someoneWorking = true; }
    if (daughterState === ActorState.WORKING) { setDaughterState(ActorState.IDLE); someoneWorking = true; }

    if (someoneWorking) return; // Give visual time for the "Working" state before next move

    // 2. Smart Scheduler: Find all Valid Moves
    const candidates: string[] = [];

    // Father: Can act if Plate is Empty
    if (semPlate > 0) candidates.push('father');
    
    // Mother: Can act if Plate is Empty
    if (semPlate > 0) candidates.push('mother');

    // Daughter: Can act if Apple is available
    if (semApple > 0) candidates.push('daughter');

    // Son: Can act if Orange is available
    if (semOrange > 0) candidates.push('son');

    if (candidates.length === 0) return; // Should theoretically not happen unless deadlocked by logic, but here logic is sound.

    // 3. Pick a random winner from VALID candidates
    const winner = candidates[Math.floor(Math.random() * candidates.length)];

    if (winner === 'father') {
         setPlate('apple');
         setSemPlate(0);
         setSemApple(1);
         setFatherState(ActorState.WORKING);
         addLog("父亲放入了一个苹果。");
    } else if (winner === 'mother') {
         setPlate('orange');
         setSemPlate(0);
         setSemOrange(1);
         setMotherState(ActorState.WORKING);
         addLog("母亲放入了一个橘子。");
    } else if (winner === 'daughter') {
         setPlate(null);
         setSemApple(0);
         setSemPlate(1);
         setDaughterState(ActorState.WORKING);
         addLog("女儿吃掉了苹果。");
    } else if (winner === 'son') {
         setPlate(null);
         setSemOrange(0);
         setSemPlate(1);
         setSonState(ActorState.WORKING);
         addLog("儿子吃掉了橘子。");
    }

  }, [fatherState, motherState, sonState, daughterState, semPlate, semApple, semOrange]);

  useEffect(() => {
    let interval: number;
    if (active) {
        interval = window.setInterval(step, 1000);
    }
    return () => clearInterval(interval);
  }, [active, step]);

  const reset = () => {
      setActive(false);
      setPlate(null);
      setSemPlate(1);
      setSemApple(0);
      setSemOrange(0);
      setFatherState(ActorState.IDLE);
      setMotherState(ActorState.IDLE);
      setSonState(ActorState.IDLE);
      setDaughterState(ActorState.IDLE);
      setLogs([]);
  };

  // Helper to display status text
  const getStatus = (role: string, state: ActorState) => {
      if (state === ActorState.WORKING) return "正在操作...";
      
      if (role === 'father' || role === 'mother') {
          return semPlate === 0 ? "等待空盘 (Wait)" : "就绪 (Ready)";
      }
      if (role === 'daughter') {
          return semApple === 0 ? "等待苹果 (Wait)" : "就绪 (Ready)";
      }
      if (role === 'son') {
          return semOrange === 0 ? "等待橘子 (Wait)" : "就绪 (Ready)";
      }
      return "Idle";
  };

  const ActorCard = ({ role, roleId, icon: Icon, color, state, target }: { role: string, roleId: string, icon: any, color: string, state: ActorState, target: string }) => {
      const statusText = getStatus(roleId, state);
      const isWaiting = statusText.includes("等待");

      return (
        <div className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-300 ${
            state === ActorState.WORKING ? `bg-${color}-50 border-${color}-500 scale-105 shadow-lg` : 
            isWaiting ? 'bg-slate-50 border-slate-200 opacity-70' : 'bg-white border-slate-200'
        }`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-colors ${
                state === ActorState.WORKING ? `bg-${color}-100 text-${color}-600` : 
                isWaiting ? 'bg-slate-200 text-slate-400' : `bg-${color}-50 text-${color}-400`
            }`}>
                <Icon size={24} />
            </div>
            <div className="font-bold text-slate-700 text-sm md:text-base">{role}</div>
            <div className="text-xs text-slate-400 mb-2">{target}</div>
            
            <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                state === ActorState.WORKING ? `bg-${color}-100 text-${color}-700` : 
                isWaiting ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'
            }`}>
                {statusText}
            </div>
        </div>
      );
  };

  const SemaphoreBadge = ({ label, val, activeColor }: { label: string, val: number, activeColor: string }) => (
      <div className={`px-3 py-2 rounded-lg border text-center min-w-[80px] transition-colors duration-300 ${val > 0 ? `bg-${activeColor}-50 border-${activeColor}-300` : 'bg-slate-50 border-slate-200 opacity-60'}`}>
          <div className="text-[10px] text-slate-500 uppercase font-bold">{label}</div>
          <div className={`text-xl font-mono font-bold ${val > 0 ? `text-${activeColor}-600` : 'text-slate-400'}`}>{val}</div>
      </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
             <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">苹果 - 橘子问题</h2>
                    <p className="text-slate-500 text-sm">多信号量同步与进程互斥演示</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={reset} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><RotateCcw size={20}/></button>
                    <button 
                        onClick={() => setActive(!active)}
                        className={`px-6 py-2 rounded-lg font-bold text-white shadow-md ${active ? 'bg-amber-500' : 'bg-blue-600'}`}
                    >
                        {active ? <Pause size={18} className="mr-2 inline"/> : <Play size={18} className="mr-2 inline"/>}
                        {active ? '暂停' : '开始模拟'}
                    </button>
                </div>
             </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Logic Board */}
            <div className="lg:col-span-2 bg-slate-50 rounded-xl border border-slate-200 p-8 relative min-h-[500px] flex flex-col justify-between">
                
                {/* Producers Row */}
                <div className="flex justify-around">
                    <ActorCard role="父亲 (Father)" roleId="father" icon={User} color="blue" state={fatherState} target="放入苹果" />
                    <ActorCard role="母亲 (Mother)" roleId="mother" icon={User} color="purple" state={motherState} target="放入橘子" />
                </div>

                {/* Arrows Down */}
                <div className="flex justify-around text-slate-300 my-2">
                    <ArrowDown size={32} className={fatherState === ActorState.WORKING ? 'text-blue-500 animate-bounce' : ''} />
                    <ArrowDown size={32} className={motherState === ActorState.WORKING ? 'text-purple-500 animate-bounce' : ''} />
                </div>

                {/* The Plate (Shared Resource) */}
                <div className="self-center relative">
                    <div className="w-48 h-48 rounded-full bg-white border-4 border-slate-300 shadow-inner flex items-center justify-center relative overflow-hidden">
                        <div className="absolute top-2 text-[10px] font-bold text-slate-400 uppercase">The Plate (Cap: 1)</div>
                        
                        {plate === 'apple' && (
                            <div className="animate-zoom-in flex flex-col items-center text-red-500">
                                <AppleIcon size={64} fill="currentColor" />
                                <span className="font-bold mt-1">APPLE</span>
                            </div>
                        )}
                        {plate === 'orange' && (
                            <div className="animate-zoom-in flex flex-col items-center text-orange-500">
                                <Citrus size={64} />
                                <span className="font-bold mt-1">ORANGE</span>
                            </div>
                        )}
                        {plate === null && <span className="text-slate-300 italic">Empty</span>}
                    </div>
                </div>

                {/* Arrows Up (Consuming) */}
                <div className="flex justify-around text-slate-300 my-2">
                    <ArrowUp size={32} className={daughterState === ActorState.WORKING ? 'text-red-500 animate-bounce' : ''} />
                    <ArrowUp size={32} className={sonState === ActorState.WORKING ? 'text-orange-500 animate-bounce' : ''} />
                </div>

                {/* Consumers Row */}
                <div className="flex justify-around">
                    <ActorCard role="女儿 (Daughter)" roleId="daughter" icon={User} color="red" state={daughterState} target="吃掉苹果" />
                    <ActorCard role="儿子 (Son)" roleId="son" icon={User} color="orange" state={sonState} target="吃掉橘子" />
                </div>
            </div>

            {/* Status Panel */}
            <div className="space-y-6">
                {/* Semaphore Dashboard */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        信号量状态 (Semaphores)
                    </h3>
                    <div className="flex gap-2 justify-between">
                        <SemaphoreBadge label="S_Plate" val={semPlate} activeColor="green" />
                        <SemaphoreBadge label="S_Apple" val={semApple} activeColor="red" />
                        <SemaphoreBadge label="S_Orange" val={semOrange} activeColor="orange" />
                    </div>
                    <div className="mt-4 text-xs text-slate-500">
                        <p><strong>S_Plate:</strong> 盘子是否为空 (互斥)</p>
                        <p><strong>S_Apple:</strong> 盘中是否有苹果 (唤醒女儿)</p>
                        <p><strong>S_Orange:</strong> 盘中是否有橘子 (唤醒儿子)</p>
                    </div>
                </div>

                {/* Logs */}
                <div className="bg-slate-900 p-4 rounded-xl text-slate-300 h-[300px] overflow-hidden flex flex-col">
                    <div className="font-bold text-xs uppercase border-b border-slate-700 pb-2 mb-2">Action Log</div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 font-mono text-xs">
                        {logs.length === 0 && <div className="text-slate-600 italic">等待开始...</div>}
                        {logs.map((log, i) => (
                            <div key={i} className="border-l-2 border-blue-500 pl-2 opacity-90">
                                <span className="text-blue-400 mr-1">&gt;</span>{log}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default AppleOrange;
