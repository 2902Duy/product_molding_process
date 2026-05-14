import { useState } from 'react';
import ProductionLotList from './pages/ProductionLotList';
import ProductionLotDetail from './pages/ProductionLotDetail';
import MoldingSlipDetail from './pages/MoldingSlipDetail';
import MoldingProductionSlip from './pages/MoldingProductionSlip';
import InventoryList from './pages/InventoryList';
import ChatWidget from './components/Chat/ChatWidget';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, LayoutDashboard, Package, Factory } from 'lucide-react';

const INVENTORY_SUB_TABS = [
  { id: 'WOOD_BLANKS', label: 'Kho phôi gỗ' },
  { id: 'MOLDING_OUTPUTS', label: 'Kho thành phẩm' },
];

export default function WoodProductionApp() {
  const [view, setView] = useState('lot-list'); // 'lot-list' | 'lot-detail' | 'molding-slip' | 'molding-production-slip' | 'inventory'
  const [lotParams, setLotParams] = useState({});
  const [inventoryMenuOpen, setInventoryMenuOpen] = useState(true);
  const navigate = useNavigate();

  const handleNavigate = (targetView, params = {}) => {
    if (targetView === 'dashboard') {
      navigate('/dashboard');
      return;
    }
    setView(targetView);
    setLotParams(params);
  };

  const handleInventoryClick = () => {
    if (view !== 'inventory') {
      setInventoryMenuOpen(true);
      handleNavigate('inventory', { warehouseTab: lotParams.warehouseTab || 'WOOD_BLANKS' });
      return;
    }

    setInventoryMenuOpen((open) => !open);
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
            onClick={handleInventoryClick}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-[14px] font-medium rounded-lg transition-colors ${view === 'inventory' ? 'bg-blue-50 text-notion-blue' : 'text-warm-gray-600 hover:bg-black/5 hover:text-notion-black'}`}
          >
            <Package size={18} /> Quản Lý Kho
            {inventoryMenuOpen ? <ChevronDown size={15} className="ml-auto" /> : <ChevronRight size={15} className="ml-auto" />}
          </button>
          {view === 'inventory' && inventoryMenuOpen && (
            <div className="ml-7 mt-1 space-y-1">
              {INVENTORY_SUB_TABS.map((tab) => {
                const isActive = (lotParams.warehouseTab || 'WOOD_BLANKS') === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleNavigate('inventory', { warehouseTab: tab.id })}
                    className={`w-full text-left px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors ${
                      isActive
                        ? 'bg-white text-notion-blue shadow-sm'
                        : 'text-warm-gray-500 hover:bg-black/5 hover:text-notion-black'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}
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
          <InventoryList
            onNavigate={handleNavigate}
            initialTab={lotParams.warehouseTab}
            onWarehouseTabChange={(warehouseTab) => setLotParams((prev) => ({ ...prev, warehouseTab }))}
          />
        )}
        {view === 'molding-slip' && (
          <MoldingSlipDetail
            onNavigate={handleNavigate}
            lotId={lotParams.lotId || lotParams.id}
          />
        )}
        {view === 'molding-production-slip' && (
          <MoldingProductionSlip
            onNavigate={handleNavigate}
            lotId={lotParams.lotId || lotParams.id}
          />
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

      <ChatWidget
        currentView={view}
        currentLotId={lotParams.lotId || lotParams.id}
      />
    </div>
  );
}
