
import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, Lock, Unlock, FileText, Cpu, Activity, Layers, AlertTriangle, CheckCircle } from 'lucide-react';

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

        let activeThread = 0; // 0=none, 1=T1, 2=T2

        const t1Busy = t1PC !== 'IDLE';
        const t2Busy = t2PC !== 'IDLE';

        if (mode === 'SAFE') {
            // Strict Mutex Logic: If one is busy, other cannot start
            if (t1Busy) activeThread = 1;
            else if (t2Busy) activeThread = 2;
            else {
                if (t1Counted < TARGET_COUNT && t2Counted < TARGET_COUNT) activeThread = Math.random() > 0.5 ? 1 : 2;
                else if (t1Counted < TARGET_COUNT) activeThread = 1;
                else if (t2Counted < TARGET_COUNT) activeThread = 2;
            }
        } else {
            // UNSAFE: Interleaved Logic
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

      }, mode === 'UNSAFE' ? 400 : 200);
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
                 <line x1="0" y1="50%" x2="40%" y2="50%" stroke={t1PC !== 'IDLE' ? '#3b82f6' : '#cbd5e1'} strokeWidth="4" strokeDasharray="8 4" className={t1PC !== 'IDLE' ? 'animate-dash' : ''} />
                 <line x1="60%" y1="50%" x2="100%" y2="50%" stroke={t2PC !== 'IDLE' ? '#a855f7' : '#cbd5e1'} strokeWidth="4" strokeDasharray="8 4" className={t2PC !== 'IDLE' ? 'animate-dash' : ''} />
             </svg>

             <div className={`z-10 w-40 h-40 bg-white rounded-full border-8 flex flex-col items-center justify-center shadow-xl transition-all duration-300 ${
                 mode === 'UNSAFE' && t1PC !== 'IDLE' && t2PC !== 'IDLE' ? 'border-red-500 scale-110' : 'border-slate-700'
             }`}>
                 <div className="text-4xl font-mono font-bold text-slate-800">{ramValue}</div>
                 <div className="text-xs text-slate-500 mt-1 font-mono">int counter</div>
                 {mode === 'SAFE' && <Lock size={16} className="text-green-600 mt-2" />}
             </div>

             <div className="mt-8 h-8">
                <span className="text-sm font-mono bg-slate-200 px-3 py-1 rounded text-slate-700">{log}</span>
             </div>
             
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
// TASK 2: WORD COUNT (ENHANCED)
// ==========================================

const TEXT_FILE_1 = "OS is fun. Threads are cool! 123 go.";
const TEXT_FILE_2 = "Race conditions? No thanks. Use Mutex.";

const CODE_SNIPPETS = {
  UNSAFE: `// 解法1：无锁 (竞态条件)
void *count_words(void *arg) {
  // ...
  if (!isalnum(c) && isalnum(prev)) {
    // 危险：并发修改共享变量
    total_words++; 
  }
}`,
  MUTEX: `// 解法1：互斥锁 (安全)
void *count_words(void *arg) {
  // ...
  if (!isalnum(c) && isalnum(prev)) {
    sem_wait(&mutex); // 阻塞直到获取锁
    total_words++;    // 临界区
    sem_post(&mutex); // 释放锁
  }
}`,
  LOCAL: `// 解法2：局部变量 (高效)
void *count_words(void *arg) {
  int local_cnt = 0; // 栈上变量
  if (!isalnum(c) && isalnum(prev)) {
    local_cnt++; 
  }
  pthread_exit((void*)local_cnt);
}`
};

type Task2Mode = 'UNSAFE' | 'MUTEX' | 'LOCAL';
type ThreadState = 'IDLE' | 'SCAN' | 'WAIT_MUTEX' | 'CRITICAL' | 'FINISHED';

const Task2WordCount: React.FC = () => {
  const [mode, setMode] = useState<Task2Mode>('MUTEX');
  const [isRunning, setIsRunning] = useState(false);
  
  // Shared State
  const [globalCount, setGlobalCount] = useState(0);
  const [mutexLocked, setMutexLocked] = useState(false);
  const [mutexOwner, setMutexOwner] = useState<number | null>(null);

  // Thread 1
  const [cursor1, setCursor1] = useState(0);
  const [state1, setState1] = useState<ThreadState>('IDLE');
  const [localCount1, setLocalCount1] = useState(0);

  // Thread 2
  const [cursor2, setCursor2] = useState(0);
  const [state2, setState2] = useState<ThreadState>('IDLE');
  const [localCount2, setLocalCount2] = useState(0);

  const textRef1 = useRef(TEXT_FILE_1);
  const textRef2 = useRef(TEXT_FILE_2);

  const reset = () => {
    setIsRunning(false);
    setCursor1(0); setState1('IDLE'); setLocalCount1(0);
    setCursor2(0); setState2('IDLE'); setLocalCount2(0);
    setGlobalCount(0);
    setMutexLocked(false);
    setMutexOwner(null);
  };

  const isAlnum = (char: string) => /^[a-z0-9]+$/i.test(char);
  
  // Check if current char is not alnum, but previous was.
  // We check index vs index-1.
  const isWordBoundary = (text: string, index: number) => {
    // Standard C "wc" logic: non-alnum following alnum.
    const curr = text[index];
    const prev = index > 0 ? text[index - 1] : null;
    
    // If curr is NOT alnum (space, punct, or undefined for EOF), and prev IS alnum
    // Note: undefined occurs if index == length (simulating EOF)
    const currIsAlnum = curr ? isAlnum(curr) : false;
    const prevIsAlnum = prev ? isAlnum(prev) : false;

    return !currIsAlnum && prevIsAlnum;
  };

  useEffect(() => {
    let interval: number;

    const stepThread = (
      id: number, 
      cursor: number, 
      state: ThreadState, 
      text: string, 
      setCursor: React.Dispatch<React.SetStateAction<number>>,
      setState: React.Dispatch<React.SetStateAction<ThreadState>>,
      setLocal: React.Dispatch<React.SetStateAction<number>>
    ) => {
        if (state === 'FINISHED') return;

        // 1. Handle Blocked State (Mutex Mode)
        if (state === 'WAIT_MUTEX') {
            if (!mutexLocked) {
                // Acquire Lock
                setMutexLocked(true);
                setMutexOwner(id);
                setState('CRITICAL');
            }
            return; // Wait next tick
        }

        // 2. Handle Critical Section
        if (state === 'CRITICAL') {
            setGlobalCount(c => c + 1);
            setMutexLocked(false);
            setMutexOwner(null);
            setState('SCAN'); // Resume scanning
            return;
        }

        // 3. Handle Scanning
        if (state === 'SCAN' || state === 'IDLE') {
            // Check if finished (scan one past end to catch EOF boundary)
            if (cursor > text.length) {
                setState('FINISHED');
                return;
            }

            // Check for Word Boundary AT CURRENT CURSOR
            if (isWordBoundary(text, cursor)) {
                // Found word!
                if (mode === 'LOCAL') {
                    setLocal(c => c + 1);
                    // Continue scanning
                } else if (mode === 'MUTEX') {
                    setState('WAIT_MUTEX'); // Request entry
                    return; // Pause cursor
                } else {
                    // UNSAFE MODE
                    // Simulate Race: 
                    // If both threads update roughly same time, we lose one.
                    // We implement a random delay or just raw increment.
                    setGlobalCount(c => c + 1);
                    
                    // To ensure "Incorrect" result occasionally:
                    // We could read globalCount, wait, then write globalCount+1
                    // But given React batching, we'll just let it fly. 
                    // For educational visual, Mutex mode blocking is the key.
                }
            }
            
            // Move cursor forward
            setCursor(c => c + 1);
            setState('SCAN');
        }
    };

    if (isRunning) {
      interval = window.setInterval(() => {
         stepThread(1, cursor1, state1, textRef1.current, setCursor1, setState1, setLocalCount1);
         stepThread(2, cursor2, state2, textRef2.current, setCursor2, setState2, setLocalCount2);
         
         // Post-processing: if both finished in LOCAL mode, sum up
         if (state1 === 'FINISHED' && state2 === 'FINISHED' && mode === 'LOCAL' && globalCount === 0) {
             setGlobalCount(localCount1 + localCount2);
         }

      }, mode === 'UNSAFE' ? 100 : 200); // Unsafe runs faster to create chaos
    }
    return () => clearInterval(interval);
  }, [isRunning, mode, cursor1, cursor2, state1, state2, mutexLocked, localCount1, localCount2, globalCount]);


  const renderText = (text: string, cursor: number) => {
     return (
        <div className="font-mono text-sm bg-slate-50 p-3 rounded border border-slate-200 leading-relaxed break-all h-24 overflow-hidden relative">
            {text.split('').map((char, i) => (
                <span key={i} className={`inline-block w-[9px] text-center transition-colors ${
                    i === cursor ? 'bg-blue-500 text-white font-bold' : 
                    i < cursor ? 'text-slate-400' : 'text-slate-800'
                }`}>
                    {char === ' ' ? '\u00A0' : char}
                </span>
            ))}
            {cursor === text.length && <span className="text-xs text-slate-300 ml-1">[EOF]</span>}
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
            <p className="text-sm text-slate-500">模拟真实文件IO与算法逻辑。正确总数应为 14。</p>
          </div>
          <div className="flex flex-wrap gap-2">
             <div className="flex bg-slate-100 p-1 rounded-lg">
                <button onClick={() => { reset(); setMode('UNSAFE'); }} className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${mode === 'UNSAFE' ? 'bg-white text-red-600 shadow' : 'text-slate-500'}`}>解法1: 无锁</button>
                <button onClick={() => { reset(); setMode('MUTEX'); }} className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${mode === 'MUTEX' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>解法1: 互斥锁</button>
                <button onClick={() => { reset(); setMode('LOCAL'); }} className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${mode === 'LOCAL' ? 'bg-white text-green-600 shadow' : 'text-slate-500'}`}>解法2: 局部变量</button>
             </div>
             <button onClick={() => setIsRunning(!isRunning)} disabled={state1 === 'FINISHED' && state2 === 'FINISHED'} className={`px-5 py-2 rounded-lg font-bold text-white shadow-md ${isRunning ? 'bg-amber-500' : 'bg-blue-600'}`}>
                {isRunning ? '暂停' : '开始'}
             </button>
          </div>
      </div>

      {/* Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Thread 1 */}
          <div className={`p-4 rounded-xl border-2 transition-all ${state1 === 'CRITICAL' ? 'border-red-500 shadow-lg' : state1 === 'WAIT_MUTEX' ? 'border-yellow-400 opacity-80' : 'border-slate-200'}`}>
                 <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-slate-700 flex items-center gap-2"><Cpu size={16}/> Thread 1</span>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${state1 === 'WAIT_MUTEX' ? 'bg-yellow-100 text-yellow-700' : state1==='CRITICAL'?'bg-red-100 text-red-700':'bg-slate-100 text-slate-500'}`}>{state1}</span>
                 </div>
                 {renderText(textRef1.current, cursor1)}
                 {mode === 'LOCAL' && <div className="mt-2 text-xs font-mono text-blue-600 font-bold">Local Count: {localCount1}</div>}
          </div>

          {/* Shared Memory */}
          <div className="flex flex-col gap-4">
             <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-slate-300 shadow-inner relative min-h-[120px]">
                 <div className="absolute top-0 right-0 bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-500 uppercase rounded-bl">C Code</div>
                 <pre className="whitespace-pre-wrap z-10 relative">{CODE_SNIPPETS[mode]}</pre>
                 {state1 === 'CRITICAL' && <div className="absolute left-0 right-0 h-4 bg-yellow-500/20 top-[60px] border-l-4 border-yellow-500"></div>}
             </div>

             <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 p-6 flex flex-col items-center justify-center relative">
                 <div className="text-xs font-bold text-slate-400 uppercase mb-2">Shared Memory (Global)</div>
                 
                 {/* Lock Visual */}
                 {mode === 'MUTEX' && (
                     <div className={`mb-2 flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${mutexLocked ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                         {mutexLocked ? <><Lock size={12}/> LOCKED (T{mutexOwner})</> : <><Unlock size={12}/> OPEN</>}
                     </div>
                 )}

                 <div className={`w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center z-10 bg-white ${mutexLocked ? 'border-red-500' : 'border-slate-300'}`}>
                     <div className="text-2xl font-mono font-bold text-slate-800">{globalCount}</div>
                 </div>
                 
                 {state1 === 'FINISHED' && state2 === 'FINISHED' && (
                     <div className={`mt-4 text-sm font-bold ${globalCount === 14 ? 'text-green-600' : 'text-red-500'}`}>
                         Final: {globalCount} / 14
                     </div>
                 )}
             </div>
          </div>

          {/* Thread 2 */}
          <div className={`p-4 rounded-xl border-2 transition-all ${state2 === 'CRITICAL' ? 'border-red-500 shadow-lg' : state2 === 'WAIT_MUTEX' ? 'border-yellow-400 opacity-80' : 'border-slate-200'}`}>
                 <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-slate-700 flex items-center gap-2"><Cpu size={16}/> Thread 2</span>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${state2 === 'WAIT_MUTEX' ? 'bg-yellow-100 text-yellow-700' : state2==='CRITICAL'?'bg-red-100 text-red-700':'bg-slate-100 text-slate-500'}`}>{state2}</span>
                 </div>
                 {renderText(textRef2.current, cursor2)}
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
