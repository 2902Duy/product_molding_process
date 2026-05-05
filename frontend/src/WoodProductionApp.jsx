import React, { useState } from 'react';
import ProductionLotList from './pages/ProductionLotList';
import ProductionLotDetail from './pages/ProductionLotDetail';
import InventoryList from './pages/InventoryList';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, Factory, Menu } from 'lucide-react';

export default function WoodProductionApp() {
  const [view, setView] = useState('lot-list'); // 'lot-list' | 'lot-detail' | 'inventory'
  const [lotParams, setLotParams] = useState({});
  const navigate = useNavigate();

  const handleNavigate = (targetView, params = {}) => {
    if (targetView === 'dashboard') {
      navigate('/dashboard');
      return;
    }
    setView(targetView);
    setLotParams(params);
  };

  return (
    <div className="flex h-screen w-full bg-notion-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[240px] bg-warm-white border-r border-whisper flex flex-col shrink-0 hidden md:flex">
        <div className="p-4 border-b border-whisper flex items-center gap-2">
          <Factory size={20} className="text-notion-blue" />
          <h1 className="font-bold text-[15px] text-notion-black tracking-tight">Quản Lý Sản Xuất</h1>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <button
            onClick={() => handleNavigate('lot-list')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-[14px] font-medium rounded-lg transition-colors ${view === 'lot-list' || view === 'lot-detail' ? 'bg-blue-50 text-notion-blue' : 'text-warm-gray-600 hover:bg-black/5 hover:text-notion-black'}`}
          >
            <LayoutDashboard size={18} /> Lệnh Sản Xuất
          </button>
          <button
            onClick={() => handleNavigate('inventory')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-[14px] font-medium rounded-lg transition-colors ${view === 'inventory' ? 'bg-blue-50 text-notion-blue' : 'text-warm-gray-600 hover:bg-black/5 hover:text-notion-black'}`}
          >
            <Package size={18} /> Quản Lý Kho
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-notion-white relative md:pb-0 pb-[72px]">
        {view === 'lot-list' && (
          <ProductionLotList onNavigate={handleNavigate} />
        )}
        {view === 'lot-detail' && (
          <ProductionLotDetail 
            onNavigate={handleNavigate} 
            mode={lotParams.mode} 
            lotId={lotParams.id} 
          />
        )}
        {view === 'inventory' && (
          <InventoryList onNavigate={handleNavigate} />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      {(view === 'lot-list' || view === 'inventory') && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-whisper flex justify-around px-2 py-1.5 z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          <button
            onClick={() => handleNavigate('lot-list')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl flex-1 transition-colors ${view === 'lot-list' ? 'text-notion-blue' : 'text-warm-gray-400 hover:bg-warm-gray-100/50'}`}
          >
            <LayoutDashboard size={20} strokeWidth={view === 'lot-list' ? 2.5 : 2} />
            <span className="text-[11px] font-semibold tracking-tight">Sản Xuất</span>
          </button>
          <button
            onClick={() => handleNavigate('inventory')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl flex-1 transition-colors ${view === 'inventory' ? 'text-notion-blue' : 'text-warm-gray-400 hover:bg-warm-gray-100/50'}`}
          >
            <Package size={20} strokeWidth={view === 'inventory' ? 2.5 : 2} />
            <span className="text-[11px] font-semibold tracking-tight">Kho Phôi</span>
          </button>
        </nav>
      )}
    </div>
  );
}
