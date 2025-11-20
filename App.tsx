
import React, { useState } from 'react';
import { LayoutDashboard, Files, Database, BookOpen, Users, Utensils } from 'lucide-react';
import { ExperimentType } from './types';
import Experiment7 from './components/Experiment7';
import Experiment8 from './components/Experiment8';
import ReaderWriter from './components/ReaderWriter';
import Philosophers from './components/Philosophers';
import AppleOrange from './components/AppleOrange';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ExperimentType>(ExperimentType.PRODUCER_CONSUMER);

  const NavButton = ({ type, icon: Icon, title, subtitle }: { type: ExperimentType, icon: any, title: string, subtitle: string }) => (
    <button
      onClick={() => setActiveTab(type)}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
        activeTab === type
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
          : 'hover:bg-slate-800 text-slate-300'
      }`}
    >
      <Icon size={20} className="flex-shrink-0" />
      <div className="text-left overflow-hidden">
        <span className="block font-medium truncate">{title}</span>
        <span className="text-xs opacity-70 truncate">{subtitle}</span>
      </div>
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-100 font-sans text-slate-800">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex-shrink-0 shadow-xl z-10 flex flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <LayoutDashboard className="text-blue-400" />
            <h1 className="text-xl font-bold tracking-tight">OS 操作系统<br/>并发实验室</h1>
          </div>
          <p className="text-xs text-slate-400 mt-2">实验7 & 实验8 可视化演示</p>
        </div>
        
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
          <div className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            核心实验
          </div>
          
          <NavButton 
            type={ExperimentType.THREAD_BASIC} 
            icon={Files} 
            title="实验7: 线程并发" 
            subtitle="单词统计 (Word Count)" 
          />
          
          <NavButton 
            type={ExperimentType.PRODUCER_CONSUMER} 
            icon={Database} 
            title="实验8: 生产者-消费者" 
            subtitle="含死锁模拟与可视化" 
          />

          <div className="pt-4 pb-2 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
            拓展任务 (Bonus)
          </div>

          <NavButton 
            type={ExperimentType.APPLE_ORANGE} 
            icon={Users} 
            title="苹果 - 橘子问题" 
            subtitle="多信号量复杂同步" 
          />

          <NavButton 
            type={ExperimentType.PHILOSOPHERS} 
            icon={Utensils} 
            title="哲学家就餐问题" 
            subtitle="死锁与资源分级" 
          />

          <NavButton 
            type={ExperimentType.READER_WRITER} 
            icon={BookOpen} 
            title="读者 - 写者问题" 
            subtitle="读写优先策略演示" 
          />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-8 relative">
        <div className="max-w-7xl mx-auto">
          {activeTab === ExperimentType.THREAD_BASIC && <Experiment7 />}
          {activeTab === ExperimentType.PRODUCER_CONSUMER && <Experiment8 />}
          {activeTab === ExperimentType.READER_WRITER && <ReaderWriter />}
          {activeTab === ExperimentType.PHILOSOPHERS && <Philosophers />}
          {activeTab === ExperimentType.APPLE_ORANGE && <AppleOrange />}
        </div>
      </main>
    </div>
  );
};

export default App;
