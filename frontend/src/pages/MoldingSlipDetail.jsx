import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Check, Plus, Trash2, Settings, Package } from 'lucide-react';
import { db } from '../services/db';

const STAGES = [
  { id: 'vao-dinh-hinh', name: 'Vào định hình', order: 1 },
  { id: 'dinh-hinh-2-dau', name: 'Định hình 2 đầu', order: 2 },
  { id: 'dinh-hinh-mat', name: 'Định hình mặt', order: 3 },
  { id: 'dong-bo-dinh-hinh', name: 'Đồng bộ định hình', order: 4 }
];

const createDetailRow = () => ({
  id: `DETAIL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  productId: '',
  productName: '',
  semiFinishedId: '',
  semiFinishedName: '',
  thickness: '',
  width: '',
  length: '',
  quantity: '',
  stage: 'vao-dinh-hinh',
  completed: false,
  completedDate: ''
});

export default function MoldingSlipDetail({ onNavigate, lotId }) {
  const [lotData, setLotData] = useState(null);
  const [slipName, setSlipName] = useState('');
  const [slipDate, setSlipDate] = useState(new Date().toISOString().split('T')[0]);
  const [detailRows, setDetailRows] = useState([createDetailRow()]);
  const [showProductSelect, setShowProductSelect] = useState(false);
  const [showSemiSelect, setShowSemiSelect] = useState(false);
  const [activeRowId, setActiveRowId] = useState(null);
  const [currentStep, setCurrentStep] = useState('products'); // 'products' | 'semi' | 'details'
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  useEffect(() => {
    if (lotId) {
      const lot = db.getLot(lotId);
      if (lot) {
        setLotData(lot);
        setSlipName(`Phiếu định hình - ${lot.name}`);
      }
    }
  }, [lotId]);

  const closeModal = () => setModal((prev) => ({ ...prev, isOpen: false }));

  // Get target products from lot
  const targetProducts = lotData?.targetProducts || [];

  // Get semi-finished goods from inventory (type: SEMIFINISHED)
  const semiFinishedInventory = db.getInventory().filter(item => item.type === 'SEMIFINISHED');

  const handleAddProductToSelection = (product) => {
    const exists = selectedProducts.find(p => p.id === product.id);
    if (!exists) {
      setSelectedProducts([...selectedProducts, { ...product, selectedQuantity: product.quantity_produce }]);
    }
  };

  const handleRemoveProductFromSelection = (productId) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== productId));
  };

  const handleProductQuantityChange = (productId, qty) => {
    setSelectedProducts(selectedProducts.map(p =>
      p.id === productId ? { ...p, selectedQuantity: qty } : p
    ));
  };

  // Step 2: Add semi-finished to products
  const [semiAssignments, setSemiAssignments] = useState({}); // productId -> semi[]

  const handleAddSemiToProduct = (productId, semi) => {
    const current = semiAssignments[productId] || [];
    const exists = current.find(s => s.id === semi.id);
    if (!exists) {
      setSemiAssignments({ ...semiAssignments, [productId]: [...current, { ...semi, quantity: 1 }] });
    }
  };

  const handleRemoveSemiFromProduct = (productId, semiId) => {
    const current = semiAssignments[productId] || [];
    setSemiAssignments({
      ...semiAssignments,
      [productId]: current.filter(s => s.id !== semiId)
    });
  };

  const handleSemiQuantityChange = (productId, semiId, qty) => {
    const current = semiAssignments[productId] || [];
    setSemiAssignments({
      ...semiAssignments,
      [productId]: current.map(s => s.id === semiId ? { ...s, quantity: qty } : s)
    });
  };

  // Generate detail rows from selections
  const handleGenerateDetails = () => {
    const rows = [];
    selectedProducts.forEach(product => {
      const semis = semiAssignments[product.id] || [];
      if (semis.length === 0) {
        // Create 1 row with product only
        rows.push({
          id: `DETAIL-${Date.now()}-${product.id}`,
          productId: product.id,
          productName: product.name,
          semiFinishedId: '',
          semiFinishedName: '',
          thickness: '',
          width: '',
          length: '',
          quantity: product.selectedQuantity,
          stage: 'vao-dinh-hinh',
          completed: false,
          completedDate: ''
        });
      } else {
        // Create row for each semi
        semis.forEach(semi => {
          rows.push({
            id: `DETAIL-${Date.now()}-${product.id}-${semi.id}`,
            productId: product.id,
            productName: product.name,
            semiFinishedId: semi.id,
            semiFinishedName: semi.name,
            thickness: String(semi.thickness || ''),
            width: String(semi.width || ''),
            length: String(semi.length || ''),
            quantity: semi.quantity,
            stage: 'vao-dinh-hinh',
            completed: false,
            completedDate: ''
          });
        });
      }
    });
    setDetailRows(rows.length > 0 ? rows : [createDetailRow()]);
    setCurrentStep('details');
  };

  // Detail editing (step 3)
  const handleAddRow = () => {
    setDetailRows([...detailRows, createDetailRow()]);
  };

  const handleRowChange = (id, field, value) => {
    setDetailRows(detailRows.map(row =>
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const handleSelectProduct = (rowId, product) => {
    handleRowChange(rowId, 'productId', product.id);
    handleRowChange(rowId, 'productName', product.name);
    setShowProductSelect(false);
    setActiveRowId(null);
  };

  const handleSelectSemiFinished = (rowId, item) => {
    handleRowChange(rowId, 'semiFinishedId', item.id);
    handleRowChange(rowId, 'semiFinishedName', item.name);
    handleRowChange(rowId, 'thickness', String(item.thickness || ''));
    handleRowChange(rowId, 'width', String(item.width || ''));
    handleRowChange(rowId, 'length', String(item.length || ''));
    setShowSemiSelect(false);
    setActiveRowId(null);
  };

  const handleToggleComplete = (id) => {
    setDetailRows(detailRows.map(row => {
      if (row.id !== id) return row;
      const newCompleted = !row.completed;
      return {
        ...row,
        completed: newCompleted,
        completedDate: newCompleted ? new Date().toISOString().split('T')[0] : ''
      };
    }));
  };

  const handleSave = () => {
    // Validate
    const invalidRow = detailRows.find(row => {
      if (!row.productName && !row.semiFinishedName) return true;
      if (!row.quantity || Number(row.quantity) <= 0) return true;
      return false;
    });

    if (invalidRow) {
      setModal({
        isOpen: true,
        title: 'Lỗi dữ liệu',
        message: 'Mỗi dòng phải có sản phẩm hoặc phôi, và số lượng lớn hơn 0.'
      });
      return;
    }

    const slipData = {
      id: `MOLD-${Date.now()}`,
      lotId,
      name: slipName,
      date: slipDate,
      details: detailRows,
      status: 'draft'
    };

    console.log('Saving molding slip:', slipData);
    
    setModal({
      isOpen: true,
      title: 'Thành công',
      message: 'Đã lưu phiếu định hình.'
    });
  };

  const completedCount = detailRows.filter(r => r.completed).length;

  return (
    <div className="w-full min-h-screen bg-warm-white text-notion-black font-sans pb-8">
      {/* Header */}
      <nav className="flex justify-between items-center h-[48px] px-3 md:px-5 border-b border-whisper bg-notion-white sticky top-0 z-40">
        <button
          onClick={() => onNavigate('lot-detail', { id: lotId })}
          className="flex items-center gap-1.5 text-[14px] font-medium text-warm-gray-500 hover:text-notion-black transition"
        >
          <ArrowLeft size={15} /> Quay lại
        </button>
        <span className="text-xs font-medium text-gray-400">Phiếu định hình</span>
      </nav>

      <div className="max-w-[1060px] mx-auto px-3 md:px-5 py-6 md:py-8">
        {/* Lot info banner */}
        {lotData && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="text-xs font-medium text-blue-600 mb-1">Lệnh sản xuất</div>
            <div className="font-semibold text-gray-800">{lotData.name}</div>
          </div>
        )}

        {/* Slip info */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-gray-800 text-sm mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4 text-indigo-500" />
            Thông tin phiếu
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tên phiếu</label>
              <input
                type="text"
                value={slipName}
                onChange={(e) => setSlipName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ngày lập phiếu</label>
              <input
                type="date"
                value={slipDate}
                onChange={(e) => setSlipDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400"
              />
            </div>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${currentStep === 'products' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-white/20 text-xs font-bold">1</span>
            <span className="text-sm font-medium">Chọn sản phẩm</span>
          </div>
          <div className="w-8 h-px bg-gray-300"></div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${currentStep === 'semi' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-white/20 text-xs font-bold">2</span>
            <span className="text-sm font-medium">Chọn phôi</span>
          </div>
          <div className="w-8 h-8 px-8 h-px bg-gray-300"></div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${currentStep === 'details' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-white/20 text-xs font-bold">3</span>
            <span className="text-sm font-medium">Chi tiết</span>
          </div>
        </div>

        {/* STEP 1: Select Products */}
        {currentStep === 'products' && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-500" />
                Chọn sản phẩm mục tiêu
              </h3>
            </div>

            {selectedProducts.length > 0 && (
              <div className="px-4 py-3 bg-green-50 border-b border-green-100">
                <div className="text-xs font-medium text-green-700 mb-2">Đã chọn ({selectedProducts.length})</div>
                <div className="space-y-2">
                  {selectedProducts.map(product => (
                    <div key={product.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-green-200">
                      <div className="flex-1">
                        <div className="font-medium text-gray-800 text-sm">{product.name}</div>
                        <div className="text-xs text-gray-500">Mã: {product.id}</div>
                      </div>
                      <input
                        type="number"
                        value={product.selectedQuantity}
                        onChange={(e) => handleProductQuantityChange(product.id, Number(e.target.value))}
                        className="w-20 px-2 py-1 text-sm border border-gray-200 rounded text-center"
                        min="1"
                      />
                      <button
                        onClick={() => handleRemoveProductFromSelection(product.id)}
                        className="p-1 text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4">
              <div className="text-xs font-medium text-gray-500 mb-3">Danh sách sản phẩm có thể chọn:</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {targetProducts.map(product => {
                  const isSelected = selectedProducts.find(p => p.id === product.id);
                  return (
                    <div
                      key={product.id}
                      className={`p-3 border rounded-lg cursor-pointer transition ${
                        isSelected
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                      }`}
                      onClick={() => !isSelected && handleAddProductToSelection(product)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-gray-800">{product.name}</div>
                          <div className="text-xs text-gray-500">SL yêu cầu: {product.quantity_produce}</div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {targetProducts.length === 0 && (
                <div className="text-center py-8 text-gray-400">Không có sản phẩm mục tiêu nào</div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: Select Semi-finished */}
        {currentStep === 'semi' && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-500" />
                Chọn phôi bán thành phẩm cho từng sản phẩm
              </h3>
            </div>

            <div className="p-4 space-y-6">
              {selectedProducts.map(product => (
                <div key={product.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <div className="font-semibold text-gray-800">{product.name}</div>
                    <div className="text-xs text-gray-500">SL: {product.selectedQuantity}</div>
                  </div>

                  {/* Selected semis */}
                  {(semiAssignments[product.id] || []).length > 0 && (
                    <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                      <div className="text-xs font-medium text-blue-700 mb-2">Đã chọn phôi:</div>
                      <div className="space-y-2">
                        {(semiAssignments[product.id] || []).map(semi => (
                          <div key={semi.id} className="flex items-center gap-3 p-2 bg-white rounded border border-blue-200">
                            <div className="flex-1">
                              <div className="font-medium text-gray-800 text-sm">{semi.name}</div>
                              <div className="text-xs text-gray-500">
                                {semi.thickness} x {semi.width} x {semi.length} mm
                              </div>
                            </div>
                            <input
                              type="number"
                              value={semi.quantity}
                              onChange={(e) => handleSemiQuantityChange(product.id, semi.id, Number(e.target.value))}
                              className="w-16 px-2 py-1 text-sm border border-gray-200 rounded text-center"
                              min="1"
                            />
                            <button
                              onClick={() => handleRemoveSemiFromProduct(product.id, semi.id)}
                              className="p-1 text-red-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Available semis */}
                  <div className="p-4">
                    <div className="text-xs font-medium text-gray-500 mb-3">Chọn phôi từ kho:</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {semiFinishedInventory.map(semi => {
                        const isAssigned = (semiAssignments[product.id] || []).find(s => s.id === semi.id);
                        return (
                          <button
                            key={semi.id}
                            onClick={() => !isAssigned && handleAddSemiToProduct(product.id, semi)}
                            disabled={!!isAssigned}
                            className={`p-3 border rounded-lg text-left transition ${
                              isAssigned
                                ? 'border-green-300 bg-green-50 cursor-default'
                                : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                            }`}
                          >
                            <div className="font-medium text-gray-800 text-sm">{semi.name}</div>
                            <div className="text-xs text-gray-500">
                              {semi.thickness} x {semi.width} x {semi.length} mm | Kho: {semi.quantity}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {semiFinishedInventory.length === 0 && (
                      <div className="text-center py-4 text-gray-400 text-sm">Không có phôi bán thành phẩm nào</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: Details table */}
        {currentStep === 'details' && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
            <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-500" />
                Chi tiết các bước định hình
              </h3>
              <div className="text-xs text-gray-500">
                {completedCount}/{detailRows.length} hoàn thành
              </div>
            </div>

          {/* Table header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-100 text-xs font-medium text-gray-600">
            <div className="col-span-2">Sản phẩm</div>
            <div className="col-span-2">Phôi (bán TP)</div>
            <div className="col-span-2">Kích thước</div>
            <div className="col-span-1">SL</div>
            <div className="col-span-2">Công đoạn</div>
            <div className="col-span-1 text-center">✓</div>
            <div className="col-span-2">Ngày HT</div>
          </div>

          {/* Table rows */}
          {detailRows.map((row) => (
            <div
              key={row.id}
              className={`grid grid-cols-12 gap-2 px-4 py-2 items-center border-b border-gray-100 ${
                row.completed ? 'bg-green-50' : ''
              }`}
            >
              {/* Product selector */}
              <div className="col-span-2">
                <button
                  onClick={() => {
                    setActiveRowId(row.id);
                    setShowProductSelect(true);
                    setShowSemiSelect(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 text-xs border rounded transition truncate ${
                    row.productName
                      ? 'border-green-300 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-indigo-300'
                  }`}
                >
                  {row.productName || 'Chọn sản phẩm...'}
                </button>
              </div>

              {/* Semi-finished selector */}
              <div className="col-span-2">
                <button
                  onClick={() => {
                    setActiveRowId(row.id);
                    setShowSemiSelect(true);
                    setShowProductSelect(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 text-xs border rounded transition truncate ${
                    row.semiFinishedName
                      ? 'border-blue-300 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-indigo-300'
                  }`}
                >
                  {row.semiFinishedName || 'Chọn phôi...'}
                </button>
              </div>

              {/* Dimensions */}
              <div className="col-span-2">
                <div className="flex gap-1">
                  <input
                    type="number"
                    value={row.thickness}
                    onChange={(e) => handleRowChange(row.id, 'thickness', e.target.value)}
                    placeholder="D"
                    className="w-8 px-1 py-1.5 text-xs border border-gray-200 rounded text-center focus:outline-none focus:border-indigo-400"
                  />
                  <input
                    type="number"
                    value={row.width}
                    onChange={(e) => handleRowChange(row.id, 'width', e.target.value)}
                    placeholder="R"
                    className="w-8 px-1 py-1.5 text-xs border border-gray-200 rounded text-center focus:outline-none focus:border-indigo-400"
                  />
                  <input
                    type="number"
                    value={row.length}
                    onChange={(e) => handleRowChange(row.id, 'length', e.target.value)}
                    placeholder="D"
                    className="w-10 px-1 py-1.5 text-xs border border-gray-200 rounded text-center focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              {/* Quantity */}
              <div className="col-span-1">
                <input
                  type="number"
                  value={row.quantity}
                  onChange={(e) => handleRowChange(row.id, 'quantity', e.target.value)}
                  placeholder="0"
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded text-center focus:outline-none focus:border-indigo-400"
                />
              </div>

              {/* Stage */}
              <div className="col-span-2">
                <select
                  value={row.stage}
                  onChange={(e) => handleRowChange(row.id, 'stage', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-indigo-400"
                >
                  {STAGES.map(stage => (
                    <option key={stage.id} value={stage.id}>{stage.name}</option>
                  ))}
                </select>
              </div>

              {/* Complete checkbox */}
              <div className="col-span-1 flex justify-center">
                <button
                  onClick={() => handleToggleComplete(row.id)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
                    row.completed
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                  }`}
                >
                  {row.completed && <Check className="w-4 h-4" />}
                </button>
              </div>

              {/* Date */}
              <div className="col-span-2">
                <input
                  type="date"
                  value={row.completedDate}
                  onChange={(e) => handleRowChange(row.id, 'completedDate', e.target.value)}
                  disabled={!row.completed}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-indigo-400 disabled:bg-gray-100 disabled:text-gray-400"
                />
              </div>
            </div>
          ))}

          {/* Add row button */}
          <div className="px-4 py-3 bg-gray-50">
            <button
              onClick={handleAddRow}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm dòng
            </button>
          </div>
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="bg-white border-t border-gray-200 p-3 md:p-4">
        <div className="max-w-[600px] mx-auto flex gap-2 md:gap-3">
          {currentStep === 'products' && (
            <>
              <button
                onClick={() => onNavigate('lot-detail', { id: lotId })}
                className="flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-3 py-2.5 md:py-3 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:scale-[0.98] transition"
              >
                Huỷ bỏ
              </button>
              <button
                onClick={() => setCurrentStep('semi')}
                disabled={selectedProducts.length === 0}
                className="flex-[2] md:flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-3 py-2.5 md:py-3 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98] transition disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Tiếp tục
              </button>
            </>
          )}

          {currentStep === 'semi' && (
            <>
              <button
                onClick={() => setCurrentStep('products')}
                className="flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-3 py-2.5 md:py-3 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:scale-[0.98] transition"
              >
                Quay lại
              </button>
              <button
                onClick={handleGenerateDetails}
                className="flex-[2] md:flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-3 py-2.5 md:py-3 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98] transition"
              >
                Tạo chi tiết
              </button>
            </>
          )}

          {currentStep === 'details' && (
            <>
              <button
                onClick={() => setCurrentStep('semi')}
                className="flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-3 py-2.5 md:py-3 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:scale-[0.98] transition"
              >
                Quay lại
              </button>
              <button
                onClick={handleSave}
                className="flex-[2] md:flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-3 py-2.5 md:py-3 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98] transition"
              >
                <Save className="w-4 h-4" />
                Lưu phiếu
              </button>
            </>
          )}
        </div>
      </div>

      {/* Product Selection Modal */}
      {showProductSelect && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[500px] max-h-[70vh] overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Chọn sản phẩm</h3>
              <button onClick={() => setShowProductSelect(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              {targetProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Không có sản phẩm mục tiêu nào
                </div>
              ) : (
                <div className="space-y-2">
                  {targetProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => handleSelectProduct(activeRowId, product)}
                      className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition"
                    >
                      <div className="font-medium text-gray-800">{product.name}</div>
                      <div className="text-xs text-gray-500">Mã: {product.id} | SL: {product.quantity_produce}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Semi-finished Selection Modal */}
      {showSemiSelect && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[500px] max-h-[70vh] overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Chọn phôi bán thành phẩm</h3>
              <button onClick={() => setShowSemiSelect(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              {semiFinishedInventory.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Không có phôi bán thành phẩm nào trong kho
                </div>
              ) : (
                <div className="space-y-2">
                  {semiFinishedInventory.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectSemiFinished(activeRowId, item)}
                      className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition"
                    >
                      <div className="font-medium text-gray-800">{item.name}</div>
                      <div className="text-xs text-gray-500">
                        {item.thickness} x {item.width} x {item.length} mm | SL: {item.quantity} | Khối: {item.volume} m³
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[400px] overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">{modal.title}</h3>
            </div>
            <div className="px-5 py-6 text-gray-600 text-sm">
              {modal.message}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
