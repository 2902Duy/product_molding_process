/**
 * AppLayout — khung giao diện chính của ứng dụng.
 * Sidebar: Brand, nav items, AI chat toggle, user/logout footer
 * Main: page content
 * Chat: panel fixed-right (state lifted here)
 */
import { useState, useEffect } from 'react';
import ProductionLotList from '../features/production-lot/pages/ProductionLotList';
import ProductionLotDetail from '../features/production-lot/pages/ProductionLotDetail';
import MoldingSlipDetail from '../features/molding/pages/MoldingSlipDetail';
import MoldingProductionSlip from '../features/molding/pages/MoldingProductionSlip';
import FinishingProductionSlip from '../features/finishing/pages/FinishingProductionSlip';
import InventoryList from '../features/inventory/pages/InventoryList';
import ChatWidget from '../features/chat/components/ChatWidget';
import { useNavigate, useLocation, useParams, useSearchParams, Routes, Route } from 'react-router-dom';
import { db } from '../services/db';
import {
  ChevronDown, ChevronRight,
  LayoutDashboard, Package, Factory,
  Warehouse, Sparkles, LogOut, X,
  PanelLeftClose, PanelLeftOpen,
  RefreshCw,
} from 'lucide-react';

const INVENTORY_SUB_TABS = [
  { id: 'WOOD_BLANKS', label: 'Kho phôi gỗ' },
  { id: 'MOLDING_OUTPUTS', label: 'Kho thành phẩm' },
];

const INITIAL_MESSAGES = [
  {
    role: 'assistant',
    content: 'Bạn có thể hỏi về tồn kho, phiếu sản xuất, công đoạn định hình hoặc lý do phiếu chưa hoàn tất.',
  },
];

export default function AppLayout({ onLogout }) {
  const [view, setView] = useState('lot-list');
  const [lotParams, setLotParams] = useState({});
  const [inventoryMenuOpen, setInventoryMenuOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState(INITIAL_MESSAGES);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const handleSyncMcp = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await db.syncFromMcp({ force: true });
      if (result && result.errors && result.errors.length > 0) {
        setSyncResult({ success: false, message: `Đồng bộ lỗi: ${result.errors.join(', ')}` });
      } else {
        setSyncResult({ success: true, message: 'Đồng bộ MCP hoàn tất!' });
      }
      setTimeout(() => setSyncResult(null), 3000);
    } catch (e) {
      console.error(e);
      setSyncResult({ success: false, message: `Đồng bộ MCP thất bại: ${e.message}` });
      setTimeout(() => setSyncResult(null), 5000);
    } finally {
      setSyncing(false);
    }
  };

  const username = sessionStorage.getItem('username') || 'Người dùng';
  const avatarLetter = username.charAt(0).toUpperCase();

  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    if (path === '/' || path === '/lots' || path === '/lots/') {
      setView('lot-list');
      setLotParams({});
    } else if (path === '/lots/new') {
      setView('lot-detail');
      setLotParams({ mode: 'new' });
    } else if (path.startsWith('/lots/detail/')) {
      const id = path.split('/').pop();
      setView('lot-detail');
      setLotParams({ id });
    } else if (path.startsWith('/inventory')) {
      const searchParams = new URLSearchParams(location.search);
      const tab = searchParams.get('tab') || 'WOOD_BLANKS';
      setView('inventory');
      setLotParams({ warehouseTab: tab });
    } else if (path.startsWith('/molding-slip/')) {
      const id = path.split('/').pop();
      setView('molding-slip');
      setLotParams({ lotId: id, id });
    } else if (path.startsWith('/molding-production-slip/')) {
      const id = path.split('/').pop();
      setView('molding-production-slip');
      setLotParams({ lotId: id, id });
    } else if (path.startsWith('/finishing-production-slip/')) {
      const parts = path.split('/');
      const id = parts[parts.length - 1];
      const slipType = parts[parts.length - 2];
      setView('finishing-production-slip');
      setLotParams({ lotId: id, id, slipType });
    }
  }, [location]);

  const handleNavigate = (targetView, params = {}) => {
    if (targetView === 'lot-list') {
      navigate('/lots');
    } else if (targetView === 'lot-detail') {
      if (params.id) {
        navigate(`/lots/detail/${params.id}`);
      } else {
        navigate('/lots/new');
      }
    } else if (targetView === 'inventory') {
      const tab = params.warehouseTab || 'WOOD_BLANKS';
      navigate(`/inventory?tab=${tab}`);
    } else if (targetView === 'molding-slip') {
      navigate(`/molding-slip/${params.lotId || params.id}`);
    } else if (targetView === 'molding-production-slip') {
      navigate(`/molding-production-slip/${params.lotId || params.id}`);
    } else if (targetView === 'finishing-production-slip') {
      const type = params.slipType || 'HOAN_THIEN';
      navigate(`/finishing-production-slip/${type}/${params.lotId || params.id}`);
    } else if (targetView === 'dashboard') {
      navigate('/lots');
    }
  };

  const handleInventoryClick = () => {
    if (location.pathname !== '/inventory') {
      setInventoryMenuOpen(true);
      handleNavigate('inventory', { warehouseTab: lotParams.warehouseTab || 'WOOD_BLANKS' });
      return;
    }
    setInventoryMenuOpen((open) => !open);
  };

  const isProductionActive = view === 'lot-list' || view === 'lot-detail' || view === 'molding-production-slip' || view === 'finishing-production-slip';
  const isInventoryActive = view === 'inventory';

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: 'var(--color-app-bg)' }}>

      {/* ── Sidebar ── */}
      <aside
        className={`hidden md:flex flex-col shrink-0${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}
        style={{
          width: sidebarCollapsed ? '72px' : 'var(--sidebar-w)',
          background: 'var(--color-sidebar-bg)',
          borderRight: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sidebar)',
          zIndex: 10,
          transition: 'width 0.18s ease',
        }}
      >
        {/* Brand */}
        <div
          className="flex items-center gap-3 px-4 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border-light)' }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'var(--color-primary-soft)' }}
          >
            <Factory size={17} style={{ color: 'var(--color-primary)' }} />
          </div>
          {!sidebarCollapsed && (
          <div className="min-w-0 flex-1">
            <div className="font-bold text-[14px] leading-tight" style={{ color: 'var(--color-text-primary)' }}>
              Quản Lý Sản Xuất
            </div>
          </div>
          )}
          <button
            type="button"
            onClick={() => setSidebarCollapsed((value) => !value)}
            title={sidebarCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            className="ml-auto rounded-lg p-1.5 transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-primary)'; e.currentTarget.style.background = 'var(--color-app-bg)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.background = 'transparent'; }}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

          {!sidebarCollapsed && (
          <div
            className="px-3 mb-2 text-[10.5px] font-semibold uppercase tracking-widest"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Điều hướng
          </div>
          )}

          {/* Lệnh Sản Xuất */}
          <button
            onClick={() => handleNavigate('lot-list')}
            title="Lệnh Sản Xuất"
            className={`nav-item${isProductionActive ? ' active' : ''}${sidebarCollapsed ? ' collapsed' : ''}`}
          >
            <LayoutDashboard size={16} />
            Lệnh Sản Xuất
          </button>

          {/* Quản Lý Kho */}
          <button
            onClick={handleInventoryClick}
            title="Quản Lý Kho"
            className={`nav-item${isInventoryActive ? ' active' : ''}${sidebarCollapsed ? ' collapsed' : ''}`}
          >
            <Package size={16} />
            <span className="flex-1 text-left">Quản Lý Kho</span>
            {inventoryMenuOpen
              ? <ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} />
              : <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
            }
          </button>

          {/* Kho sub-items */}
          {isInventoryActive && inventoryMenuOpen && !sidebarCollapsed && (
            <div style={{ marginLeft: 28, display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 2 }}>
              {INVENTORY_SUB_TABS.map((tab) => {
                const isActive = (lotParams.warehouseTab || 'WOOD_BLANKS') === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleNavigate('inventory', { warehouseTab: tab.id })}
                    className={`sub-nav-item${isActive ? ' active' : ''}`}
                  >
                    <span
                      style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: isActive ? 'var(--color-primary)' : 'var(--color-border)',
                        flexShrink: 0,
                      }}
                    />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--color-border-light)', margin: '8px 4px' }} />

          {/* AI Chat toggle */}
          <button
            onClick={() => setChatOpen((v) => !v)}
            title="Trợ lý AI"
            className={`nav-item${chatOpen ? ' active' : ''}${sidebarCollapsed ? ' collapsed' : ''}`}
          >
            <Sparkles size={16} />
            <span className="flex-1 text-left">Trợ lý AI</span>
            {chatOpen && (
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: 'var(--color-primary)', color: 'white' }}
              >
                ON
              </span>
            )}
          </button>

          {/* Sync MCP button */}
          <button
            onClick={handleSyncMcp}
            disabled={syncing}
            title="Đồng bộ từ MCP"
            className={`nav-item${sidebarCollapsed ? ' collapsed' : ''}`}
            style={{
              cursor: syncing ? 'not-allowed' : 'pointer',
              opacity: syncing ? 0.7 : 1,
            }}
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            <span className="flex-1 text-left">Đồng bộ từ MCP</span>
            {syncing && (
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full animate-pulse"
                style={{ background: 'var(--color-warning)', color: 'var(--color-text-primary)' }}
              >
                ...
              </span>
            )}
          </button>

          {/* Sync Result Alert Toast in Sidebar */}
          {syncResult && !sidebarCollapsed && (
            <div
              style={{
                margin: '8px 12px 0 12px',
                padding: '8px 12px',
                fontSize: '11px',
                borderRadius: '8px',
                border: `1px solid ${syncResult.success ? '#bbf7d0' : '#fecaca'}`,
                background: syncResult.success ? '#f0fdf4' : '#fef2f2',
                color: syncResult.success ? '#15803d' : '#b91c1c',
                fontWeight: 500,
                textAlign: 'center',
              }}
            >
              {syncResult.message}
            </div>
          )}
        </nav>

        {/* ── Sidebar Footer: User + Logout ── */}
        <div
          className="px-4 py-3 shrink-0"
          style={{ borderTop: '1px solid var(--color-border-light)' }}
        >
          <div className="flex items-center gap-2.5">
            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[13px] font-bold"
              style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}
            >
              {avatarLetter}
            </div>
            {/* Name */}
            <div className="sidebar-user-details flex-1 min-w-0">
              <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                {username}
              </div>
              <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Quản trị viên</div>
            </div>
            {/* Logout icon button */}
            <button
              onClick={() => setShowLogoutConfirm(true)}
              title="Đăng xuất"
              className="sidebar-logout p-1.5 rounded-lg transition-colors shrink-0"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-danger)'; e.currentTarget.style.background = 'var(--color-danger-soft)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.background = 'transparent'; }}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main
        className="flex-1 min-w-0 overflow-y-auto relative md:pb-0 pb-[68px]"
        style={{ background: 'var(--color-app-bg)' }}
      >
        <Routes>
          <Route path="/" element={<ProductionLotList onNavigate={handleNavigate} />} />
          <Route path="/lots" element={<ProductionLotList onNavigate={handleNavigate} />} />
          <Route path="/lots/new" element={<ProductionLotDetail onNavigate={handleNavigate} mode="new" />} />
          <Route path="/lots/detail/:id" element={<LotDetailWrapper onNavigate={handleNavigate} />} />
          <Route path="/inventory" element={<InventoryWrapper onNavigate={handleNavigate} setLotParams={setLotParams} />} />
          <Route path="/molding-slip/:id" element={<MoldingSlipWrapper onNavigate={handleNavigate} />} />
          <Route path="/molding-production-slip/:id" element={<MoldingProductionWrapper onNavigate={handleNavigate} />} />
          <Route path="/finishing-production-slip/:slipType/:id" element={<FinishingProductionWrapper onNavigate={handleNavigate} />} />
        </Routes>
      </main>

      {/* ── Mobile Bottom Nav ── */}
      {(
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 flex justify-around px-2 py-1 z-40"
          style={{
            background: 'var(--color-sidebar-bg)',
            borderTop: '1px solid var(--color-border)',
            boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
          }}
        >
          <button
            onClick={() => handleNavigate('lot-list')}
            className="flex flex-col items-center gap-1 px-5 py-2 rounded-xl flex-1 transition-colors"
            style={{
              color: view === 'lot-list' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              background: view === 'lot-list' ? 'var(--color-primary-soft)' : 'transparent',
            }}
          >
            <LayoutDashboard size={20} strokeWidth={view === 'lot-list' ? 2.5 : 2} />
            <span className="text-[11px] font-semibold">Sản Xuất</span>
          </button>
          <button
            onClick={() => handleNavigate('inventory')}
            className="flex flex-col items-center gap-1 px-5 py-2 rounded-xl flex-1 transition-colors"
            style={{
              color: view === 'inventory' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              background: view === 'inventory' ? 'var(--color-primary-soft)' : 'transparent',
            }}
          >
            <Warehouse size={20} strokeWidth={view === 'inventory' ? 2.5 : 2} />
            <span className="text-[11px] font-semibold">Kho</span>
          </button>
          <button
            onClick={() => setChatOpen((v) => !v)}
            className="flex flex-col items-center gap-1 px-5 py-2 rounded-xl flex-1 transition-colors"
            style={{
              color: chatOpen ? 'var(--color-primary)' : 'var(--color-text-muted)',
              background: chatOpen ? 'var(--color-primary-soft)' : 'transparent',
            }}
          >
            <Sparkles size={20} strokeWidth={chatOpen ? 2.5 : 2} />
            <span className="text-[11px] font-semibold">AI</span>
          </button>
        </nav>
      )}

      {/* ── Chat Panel ── */}
      <ChatWidget
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        currentView={view}
        currentLotId={lotParams.lotId || lotParams.id}
        messages={chatMessages}
        setMessages={setChatMessages}
        loading={chatLoading}
        setLoading={setChatLoading}
        input={chatInput}
        setInput={setChatInput}
      />

      {/* ── Logout Confirm Modal ── */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="w-full max-w-[380px] rounded-2xl overflow-hidden"
            style={{ background: 'white', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-deep)' }}
          >
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-border-light)' }}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[15px]" style={{ color: 'var(--color-text-primary)' }}>
                  Xác nhận đăng xuất
                </h3>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="p-1 rounded-lg transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-app-bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="px-5 py-5 text-[14px]" style={{ color: 'var(--color-text-secondary)' }}>
              Bạn có chắc muốn đăng xuất không?
            </div>
            <div className="px-5 py-4 flex justify-end gap-2" style={{ borderTop: '1px solid var(--color-border-light)' }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 text-[13px] font-semibold rounded-lg transition-colors"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', background: 'white' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-app-bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}
              >
                Hủy
              </button>
              <button
                onClick={onLogout}
                className="px-4 py-2 text-[13px] font-semibold text-white rounded-lg transition-all active:scale-[0.97]"
                style={{ background: 'var(--color-danger)' }}
                onMouseEnter={e => e.currentTarget.style.background = '#DC2626'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--color-danger)'}
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LotDetailWrapper({ onNavigate }) {
  const { id } = useParams();
  return <ProductionLotDetail onNavigate={onNavigate} lotId={id} />;
}

function InventoryWrapper({ onNavigate, setLotParams }) {
  const [searchParams] = useSearchParams();
  const warehouseTab = searchParams.get('tab') || 'WOOD_BLANKS';
  return (
    <InventoryList
      onNavigate={onNavigate}
      initialTab={warehouseTab}
      onWarehouseTabChange={(tab) => setLotParams((prev) => ({ ...prev, warehouseTab: tab }))}
    />
  );
}

function MoldingSlipWrapper({ onNavigate }) {
  const { id } = useParams();
  return <MoldingSlipDetail onNavigate={onNavigate} lotId={id} />;
}

function MoldingProductionWrapper({ onNavigate }) {
  const { id } = useParams();
  return <MoldingProductionSlip onNavigate={onNavigate} lotId={id} />;
}

function FinishingProductionWrapper({ onNavigate }) {
  const { slipType, id } = useParams();
  return <FinishingProductionSlip onNavigate={onNavigate} lotId={id} slipType={slipType} />;
}
