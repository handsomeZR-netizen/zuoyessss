
import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Lock, Unlock, FileText, Cpu, Database, ArrowDown, CheckCircle, Zap, List, Activity, Layers, AlertTriangle } from 'lucide-react';

// ==========================================
// TASK 1: THREAD BEHAVIOR (COUNTER RACE)
// ==========================================

type Instruction = 'IDLE' | 'READ' | 'INC' | 'WRITE';

const Task1Counter: React.FC = () => {
  const TARGET_COUNT = 10; // Small number for visual clarity
  const [mode, setMode] = useState<'UNSAFE' | 'SAFE'>('UNSAFE');
  const [isRunning, setIsRunning] = useState(false);
  const [ramValue, setRamValue] = useState(0);
  
  // Thread 1 State
  const [t1Reg, setT1Reg] = useState<number | null>(null);
  const [t1PC, setT1PC] = useState<Instruction>('IDLE');
  const [t1Counted, setT1Counted] = useState(0);

  // Thread 2 State
  const [t2Reg, setT2Reg] = useState<number | null>(null);
  const [t2PC, setT2PC] = useState<Instruction>('IDLE');
  const [t2Counted, setT2Counted] = useState(0);

  const [log, setLog] = useState<string>("");

  const reset = () => {
    setIsRunning(false);
    setRamValue(0);
    setT1Reg(null); setT1PC('IDLE'); setT1Counted(0);
    setT2Reg(null); setT2PC('IDLE'); setT2Counted(0);
    setLog("Ready to start.");
  };

  useEffect(() => {
    let interval: number;
    if (isRunning) {
      interval = window.setInterval(() => {
        // Check finish condition
        if (t1Counted >= TARGET_COUNT && t2Counted >= TARGET_COUNT) {
          setIsRunning(false);
          setLog(`Finished. Final RAM: ${ramValue} (Expected: ${TARGET_COUNT * 2})`);
          return;
        }

        // Scheduler Logic
        // In UNSAFE mode: Randomly pick a thread to execute one micro-instruction
        // In SAFE mode: If one thread is in critical section (READ/INC/WRITE), it must finish before other starts
        
        let activeThread = 0; // 0=none, 1=T1, 2=T2

        const t1Busy = t1PC !== 'IDLE';
        const t2Busy = t2PC !== 'IDLE';

        if (mode === 'SAFE') {
            // Strict Mutex Logic: If one is busy, other cannot start
            if (t1Busy) activeThread = 1;
            else if (t2Busy) activeThread = 2;
            else {
                // Both idle, pick one that has work left
                if (t1Counted < TARGET_COUNT && t2Counted < TARGET_COUNT) activeThread = Math.random() > 0.5 ? 1 : 2;
                else if (t1Counted < TARGET_COUNT) activeThread = 1;
                else if (t2Counted < TARGET_COUNT) activeThread = 2;
            }
        } else {
            // UNSAFE / Interleaved Logic
            // We can switch context at any time
            const candidates = [];
            if (t1Counted < TARGET_COUNT || t1Busy) candidates.push(1);
            if (t2Counted < TARGET_COUNT || t2Busy) candidates.push(2);
            
            if (candidates.length > 0) {
                activeThread = candidates[Math.floor(Math.random() * candidates.length)];
            }
        }

        if (activeThread === 1) {
            // Execute T1 Step
            if (t1PC === 'IDLE') {
                setT1PC('READ');
                setLog("T1: Reading from RAM...");
            } else if (t1PC === 'READ') {
                setT1Reg(ramValue);
                setT1PC('INC');
                setLog(`T1: Loaded ${ramValue} into Register`);
            } else if (t1PC === 'INC') {
                setT1Reg(r => (r !== null ? r + 1 : 0));
                setT1PC('WRITE');
                setLog("T1: Incrementing Register");
            } else if (t1PC === 'WRITE') {
                if (t1Reg !== null) setRamValue(t1Reg);
                setT1PC('IDLE');
                setT1Counted(c => c + 1);
                setLog(`T1: Wrote ${t1Reg} to RAM`);
            }
        } else if (activeThread === 2) {
            // Execute T2 Step
            if (t2PC === 'IDLE') {
                setT2PC('READ');
                setLog("T2: Reading from RAM...");
            } else if (t2PC === 'READ') {
                setT2Reg(ramValue);
                setT2PC('INC');
                setLog(`T2: Loaded ${ramValue} into Register`);
            } else if (t2PC === 'INC') {
                setT2Reg(r => (r !== null ? r + 1 : 0));
                setT2PC('WRITE');
                setLog("T2: Incrementing Register");
            } else if (t2PC === 'WRITE') {
                if (t2Reg !== null) setRamValue(t2Reg);
                setT2PC('IDLE');
                setT2Counted(c => c + 1);
                setLog(`T2: Wrote ${t2Reg} to RAM`);
            }
        }

      }, mode === 'UNSAFE' ? 400 : 200); // Safe can be faster as it just flows
    }
    return () => clearInterval(interval);
  }, [isRunning, mode, ramValue, t1Counted, t2Counted, t1PC, t2PC, t1Reg, t2Reg]);

  const InstructionBlock = ({ pc, reg }: { pc: Instruction, reg: number | null }) => (
    <div className="bg-slate-900 text-slate-300 font-mono text-xs p-4 rounded-lg shadow-inner space-y-2">
        <div className={`px-2 py-1 rounded ${pc === 'READ' ? 'bg-yellow-500 text-black font-bold' : 'opacity-50'}`}>
            1. MOV REG, [ADDR]
        </div>
        <div className={`px-2 py-1 rounded ${pc === 'INC' ? 'bg-yellow-500 text-black font-bold' : 'opacity-50'}`}>
            2. ADD REG, 1
        </div>
        <div className={`px-2 py-1 rounded ${pc === 'WRITE' ? 'bg-yellow-500 text-black font-bold' : 'opacity-50'}`}>
            3. MOV [ADDR], REG
        </div>
        <div className="mt-4 pt-2 border-t border-slate-700 text-center">
            <span className="text-slate-500">Register Value:</span>
            <div className="text-xl font-bold text-green-400">{reg !== null ? reg : '-'}</div>
        </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4">
        {/* Header & Controls */}
        <div className="lg:col-span-12 bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center">
            <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Activity size={20} className="text-blue-500"/>
                    任务一：线程行为与数据竞争
                </h3>
                <p className="text-sm text-slate-500">观察两个线程同时对共享变量执行 <code>count++</code> 的微观过程</p>
            </div>
            <div className="flex gap-3 mt-4 md:mt-0">
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button onClick={() => { reset(); setMode('UNSAFE'); }} className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${mode === 'UNSAFE' ? 'bg-white text-red-600 shadow' : 'text-slate-500'}`}>并发 (Unsafe)</button>
                    <button onClick={() => { reset(); setMode('SAFE'); }} className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${mode === 'SAFE' ? 'bg-white text-green-600 shadow' : 'text-slate-500'}`}>加锁 (Safe)</button>
                </div>
                <button onClick={reset} className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200"><RotateCcw size={18}/></button>
                <button onClick={() => setIsRunning(!isRunning)} className={`px-6 py-2 rounded-lg text-white font-bold shadow ${isRunning ? 'bg-amber-500' : 'bg-blue-600'}`}>
                    {isRunning ? '暂停' : '开始运行'}
                </button>
            </div>
        </div>

        {/* Thread 1 */}
        <div className="lg:col-span-3 flex flex-col gap-4">
            <div className={`p-4 rounded-xl border-2 transition-all ${t1PC !== 'IDLE' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                <div className="font-bold text-blue-700 mb-2 flex justify-between">
                    <span>Thread 1</span>
                    <span className="text-xs bg-blue-100 px-2 py-1 rounded">Loop: {t1Counted}/{TARGET_COUNT}</span>
                </div>
                <InstructionBlock pc={t1PC} reg={t1Reg} />
            </div>
        </div>

        {/* RAM / Shared Memory */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-slate-200 p-8 relative">
             <div className="absolute top-4 left-0 right-0 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                Shared Memory (RAM)
             </div>

             {/* CPU to RAM Lines */}
             <svg className="absolute inset-0 w-full h-full pointer-events-none">
                 {/* Left Line */}
                 <line x1="0" y1="50%" x2="40%" y2="50%" stroke={t1PC !== 'IDLE' ? '#3b82f6' : '#cbd5e1'} strokeWidth="4" strokeDasharray="8 4" className={t1PC !== 'IDLE' ? 'animate-dash' : ''} />
                 {/* Right Line */}
                 <line x1="60%" y1="50%" x2="100%" y2="50%" stroke={t2PC !== 'IDLE' ? '#a855f7' : '#cbd5e1'} strokeWidth="4" strokeDasharray="8 4" className={t2PC !== 'IDLE' ? 'animate-dash' : ''} />
             </svg>

             {/* The RAM Box */}
             <div className={`z-10 w-40 h-40 bg-white rounded-full border-8 flex flex-col items-center justify-center shadow-xl transition-all duration-300 ${
                 // Highlight collision if race condition likely (both active in unsafe)
                 mode === 'UNSAFE' && t1PC !== 'IDLE' && t2PC !== 'IDLE' ? 'border-red-500 scale-110' : 'border-slate-700'
             }`}>
                 <div className="text-4xl font-mono font-bold text-slate-800">{ramValue}</div>
                 <div className="text-xs text-slate-500 mt-1 font-mono">int counter</div>
                 {mode === 'SAFE' && <Lock size={16} className="text-green-600 mt-2" />}
             </div>

             {/* Status Message */}
             <div className="mt-8 h-8">
                <span className="text-sm font-mono bg-slate-200 px-3 py-1 rounded text-slate-700">{log}</span>
             </div>
             
             {/* Result Analysis */}
             {!isRunning && t1Counted >= TARGET_COUNT && (
                 <div className={`mt-4 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${
                     ramValue === TARGET_COUNT * 2 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                 }`}>
                     {ramValue === TARGET_COUNT * 2 
                        ? <><CheckCircle size={16}/> 结果正确 (20)</> 
                        : <><AlertTriangle size={16}/> 数据竞争: 丢失 {TARGET_COUNT * 2 - ramValue} 次更新</>
                     }
                 </div>
             )}
        </div>

        {/* Thread 2 */}
        <div className="lg:col-span-3 flex flex-col gap-4">
            <div className={`p-4 rounded-xl border-2 transition-all ${t2PC !== 'IDLE' ? 'border-purple-500 bg-purple-50' : 'border-slate-200 bg-white'}`}>
                <div className="font-bold text-purple-700 mb-2 flex justify-between">
                    <span>Thread 2</span>
                    <span className="text-xs bg-purple-100 px-2 py-1 rounded">Loop: {t2Counted}/{TARGET_COUNT}</span>
                </div>
                <InstructionBlock pc={t2PC} reg={t2Reg} />
            </div>
        </div>
    </div>
  );
};


// ==========================================
// TASK 2: WORD COUNT (EXISTING IMPLEMENTATION)
// ==========================================

const TEXT_FILE_1 = "OS is fun. Threads are cool! 123 go.";
const TEXT_FILE_2 = "Race conditions? No thanks. Use Mutex.";

const CODE_SNIPPETS = {
  UNSAFE: `// 解法1：无锁 (竞态条件)
void *count_words(void *arg) {
  // ... scan char c ...
  if (!isalnum(c) && isalnum(prev)) {
    // 临界区 (无保护)
    total_words++; 
  }
}`,
  MUTEX: `// 解法1：互斥锁 (安全)
void *count_words(void *arg) {
  // ... scan char c ...
  if (!isalnum(c) && isalnum(prev)) {
    sem_wait(&mutex); // P操作
    total_words++;    // 临界区
    sem_post(&mutex); // V操作
  }
}`,
  LOCAL: `// 解法2：局部变量 (高效)
void *count_words(void *arg) {
  int local_cnt = 0;
  // ... scan char c ...
  if (!isalnum(c) && isalnum(prev)) {
    local_cnt++; // 线程私有
  }
  pthread_exit((void*)local_cnt);
}
// Main: sum += join(t1) + join(t2)`
};

type Task2Mode = 'UNSAFE' | 'MUTEX' | 'LOCAL';

const Task2WordCount: React.FC = () => {
  const [mode, setMode] = useState<Task2Mode>('MUTEX');
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  
  // Scanning State
  const [cursor1, setCursor1] = useState(0);
  const [cursor2, setCursor2] = useState(0);
  
  // Counters
  const [globalCount, setGlobalCount] = useState(0);
  const [localCount1, setLocalCount1] = useState(0);
  const [localCount2, setLocalCount2] = useState(0);

  // Visual Cues
  const [thread1Status, setThread1Status] = useState<'IDLE' | 'SCAN' | 'WAIT' | 'CRITICAL'>('IDLE');
  const [thread2Status, setThread2Status] = useState<'IDLE' | 'SCAN' | 'WAIT' | 'CRITICAL'>('IDLE');
  const [collision, setCollision] = useState(false);

  const textRef1 = useRef(TEXT_FILE_1);
  const textRef2 = useRef(TEXT_FILE_2);

  const reset = () => {
    setIsRunning(false);
    setIsFinished(false);
    setCursor1(0);
    setCursor2(0);
    setGlobalCount(0);
    setLocalCount1(0);
    setLocalCount2(0);
    setThread1Status('IDLE');
    setThread2Status('IDLE');
    setCollision(false);
  };

  const isAlnum = (char: string) => /^[a-z0-9]+$/i.test(char);
  const isWordEnd = (text: string, index: number) => {
    if (index === 0) return false;
    const curr = text[index];
    const prev = text[index - 1];
    return !isAlnum(curr) && isAlnum(prev);
  };

  useEffect(() => {
    let interval: number;
    if (isRunning && !isFinished) {
      interval = window.setInterval(() => {
        let finished1 = cursor1 >= textRef1.current.length;
        let finished2 = cursor2 >= textRef2.current.length;

        if (finished1 && finished2) {
          setIsFinished(true);
          setIsRunning(false);
          setThread1Status('IDLE');
          setThread2Status('IDLE');
          if (mode === 'LOCAL') {
             setGlobalCount(localCount1 + localCount2);
          }
          return;
        }

        // Thread 1 Step
        if (!finished1) {
            const next1 = cursor1 + 1;
            setCursor1(next1);
            setThread1Status('SCAN');
            if (isWordEnd(textRef1.current, cursor1)) handleWordFound(1);
        } else {
            setThread1Status('IDLE');
        }

        // Thread 2 Step
        if (!finished2) {
            const next2 = cursor2 + 1;
            setCursor2(next2);
            setThread2Status('SCAN');
            if (isWordEnd(textRef2.current, cursor2)) handleWordFound(2);
        } else {
            setThread2Status('IDLE');
        }

      }, mode === 'UNSAFE' ? 150 : 300);
    }
    return () => clearInterval(interval);
  }, [isRunning, isFinished, cursor1, cursor2, mode, localCount1, localCount2, globalCount]);

  const handleWordFound = (threadId: number) => {
    if (mode === 'LOCAL') {
        if (threadId === 1) setLocalCount1(c => c + 1);
        else setLocalCount2(c => c + 1);
    } else {
        if (mode === 'MUTEX') {
            if (threadId === 1) setThread1Status('CRITICAL');
            else setThread2Status('CRITICAL');
            setGlobalCount(c => c + 1);
        } else {
            if (thread1Status === 'SCAN' && thread2Status === 'SCAN' && Math.random() > 0.7) {
                setCollision(true);
                setTimeout(() => setCollision(false), 200);
                if (Math.random() > 0.5) setGlobalCount(c => c + 1);
            } else {
                setGlobalCount(c => c + 1);
            }
        }
    }
  };

  const renderText = (text: string, cursor: number, isActive: boolean) => {
     return (
        <div className="font-mono text-sm bg-slate-50 p-3 rounded border border-slate-200 leading-relaxed break-all h-24 overflow-hidden relative">
            {text.split('').map((char, i) => (
                <span key={i} className={`inline-block w-[9px] text-center transition-colors ${
                    i === cursor ? 'bg-blue-500 text-white font-bold animate-pulse' : 
                    i < cursor ? 'text-slate-400' : 'text-slate-800'
                }`}>
                    {char === ' ' ? '\u00A0' : char}
                </span>
            ))}
            {isActive && <div className="absolute bottom-1 right-1 text-[10px] text-blue-500 font-bold animate-bounce">SCANNING</div>}
        </div>
     );
  };

  return (
    <div className="space-y-6 animate-fade-in p-4">
      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText className="text-purple-500"/> 任务二：多线程单词统计
            </h3>
            <p className="text-sm text-slate-500">模拟真实文件IO与算法逻辑。文件1："{TEXT_FILE_1}"</p>
          </div>
          <div className="flex flex-wrap gap-2">
             <div className="flex bg-slate-100 p-1 rounded-lg">
                <button onClick={() => { reset(); setMode('UNSAFE'); }} className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${mode === 'UNSAFE' ? 'bg-white text-red-600 shadow' : 'text-slate-500 hover:text-slate-700'}`}>解法1: 无锁</button>
                <button onClick={() => { reset(); setMode('MUTEX'); }} className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${mode === 'MUTEX' ? 'bg-white text-blue-600 shadow' : 'text-slate-500 hover:text-slate-700'}`}>解法1: 互斥锁</button>
                <button onClick={() => { reset(); setMode('LOCAL'); }} className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${mode === 'LOCAL' ? 'bg-white text-green-600 shadow' : 'text-slate-500 hover:text-slate-700'}`}>解法2: 局部变量</button>
             </div>
             <button onClick={() => setIsRunning(!isRunning)} disabled={isFinished} className={`px-5 py-2 rounded-lg font-bold text-white shadow-md ${isRunning ? 'bg-amber-500' : 'bg-blue-600'}`}>
                {isRunning ? '暂停' : isFinished ? '完成' : '开始'}
             </button>
          </div>
      </div>

      {/* Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Thread 1 */}
          <div className={`p-4 rounded-xl border-2 transition-all ${thread1Status !== 'IDLE' ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                 <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-slate-700 flex items-center gap-2"><Cpu size={16}/> Thread 1</span>
                 </div>
                 {renderText(textRef1.current, cursor1, thread1Status === 'SCAN')}
                 {mode === 'LOCAL' && <div className="mt-2 text-xs font-mono text-blue-600 font-bold">Local Count: {localCount1}</div>}
          </div>

          {/* Shared Memory */}
          <div className="flex flex-col gap-4">
             <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-slate-300 shadow-inner relative min-h-[120px]">
                 <div className="absolute top-0 right-0 bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-500 uppercase rounded-bl">C Code</div>
                 <pre className="whitespace-pre-wrap z-10 relative">{CODE_SNIPPETS[mode]}</pre>
                 {thread1Status === 'CRITICAL' && <div className="absolute left-0 right-0 h-4 bg-yellow-500/20 top-[60px] border-l-4 border-yellow-500"></div>}
             </div>

             <div className={`flex-1 bg-slate-50 rounded-xl border border-slate-200 p-6 flex flex-col items-center justify-center relative ${collision ? 'animate-shake bg-red-50' : ''}`}>
                 <div className="text-xs font-bold text-slate-400 uppercase mb-2">Shared Memory (Global)</div>
                 <div className={`w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center z-10 bg-white ${collision ? 'border-red-500' : 'border-slate-300'}`}>
                     <div className="text-2xl font-mono font-bold text-slate-800">{globalCount}</div>
                 </div>
                 {collision && <div className="text-red-500 font-bold text-xs mt-2 animate-pulse">COLLISION!</div>}
                 {isFinished && <div className="mt-2 text-xs font-bold text-green-600">Final: {globalCount}</div>}
             </div>
          </div>

          {/* Thread 2 */}
          <div className={`p-4 rounded-xl border-2 transition-all ${thread2Status !== 'IDLE' ? 'border-purple-400 bg-purple-50' : 'border-slate-200 bg-white'}`}>
                 <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-slate-700 flex items-center gap-2"><Cpu size={16}/> Thread 2</span>
                 </div>
                 {renderText(textRef2.current, cursor2, thread2Status === 'SCAN')}
                 {mode === 'LOCAL' && <div className="mt-2 text-xs font-mono text-purple-600 font-bold">Local Count: {localCount2}</div>}
          </div>
      </div>
    </div>
  );
};


// ==========================================
// MAIN CONTAINER
// ==========================================

const Experiment7: React.FC = () => {
  const [activeTask, setActiveTask] = useState<'TASK1' | 'TASK2'>('TASK1');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Main Tab Switcher */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-1.5 flex space-x-2 w-fit mx-auto mb-8">
        <button
          onClick={() => setActiveTask('TASK1')}
          className={`flex items-center px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
            activeTask === 'TASK1'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
          }`}
        >
          <Activity size={16} className="mr-2" />
          任务一：观察线程行为
        </button>
        <button
          onClick={() => setActiveTask('TASK2')}
          className={`flex items-center px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
            activeTask === 'TASK2'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
          }`}
        >
          <Layers size={16} className="mr-2" />
          任务二：多线程单词统计
        </button>
      </div>

      {/* Content Area */}
      <div className="min-h-[600px]">
          {activeTask === 'TASK1' ? <Task1Counter /> : <Task2WordCount />}
      </div>
    </div>
  );
};

export default Experiment7;
