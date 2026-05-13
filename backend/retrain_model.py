"""
Script train lại model với sklearn 1.8.0
Dùng synthetic data dựa trên loss ranges thực tế
"""
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, r2_score
import joblib
import os

# =============================================================================
# CẤU HÌNH
# =============================================================================
LOSS_RANGES = {
    'THÔNG': (35, 40),
    'DẺ GAI': (30, 40),
    'HỒ ĐÀO': (40, 50),
}

# =============================================================================
# TẠO DỮ LIỆU MẪU (Dựa trên định mức thực tế của xưởng)
# =============================================================================
def create_training_data():
    """
    Tạo dữ liệu huấn luyện dựa trên định mức hao hụt thực tế
    Logic: Khối lượng nhỏ -> hao hụt cao, Khối lượng lớn -> hao hụt thấp
    """
    data = []
    np.random.seed(42)
    
    for wood_type, (min_loss, max_loss) in LOSS_RANGES.items():
        # Tạo các mẫu với khối lượng khác nhau
        for _ in range(200):  # 200 samples per wood type
            # Khối lượng ngẫu nhiên từ 0.1 đến 5 m³
            volume = np.random.uniform(0.1, 5.0)
            
            # Hao hụt: khối nhỏ gần max, khối lớn gần min (như Random Forest đã học)
            volume_factor = min(volume / 2.0, 1.0)  # 0.5 -> 1.0
            base_loss = max_loss - (max_loss - min_loss) * volume_factor
            
            # Thêm noise nhỏ để mô phỏng thực tế
            noise = np.random.normal(0, 1.5)
            loss = np.clip(base_loss + noise, min_loss - 3, max_loss + 3)
            
            data.append({
                'Nguyen_Lieu': wood_type,
                'Tong_Khoi_Vao': round(volume, 3),
                'Std_Min': min_loss,
                'Std_Max': max_loss,
                'Hao_Hut_Target': round(loss, 2)
            })
    
    return pd.DataFrame(data)

# =============================================================================
# TẠO DATASET BỔ SUNG (tương tự data augmentation trong notebook)
# =============================================================================
def augment_data(df, multiplier=30):
    """Data augmentation - tăng số lượng mẫu huấn luyện"""
    aug_data = []
    
    for _, row in df.iterrows():
        for _ in range(multiplier):
            v_in = row['Tong_Khoi_Vao'] * np.random.uniform(0.85, 1.15)
            h_real = np.random.normal(row['Hao_Hut_Target'], 2.0)
            
            # Clip để đảm bảo nằm trong khoảng hợp lý
            h_real = np.clip(h_real, 20, 60)
            
            aug_data.append({
                'Nguyen_Lieu': row['Nguyen_Lieu'],
                'Tong_Khoi_Vao': round(v_in, 3),
                'Std_Min': row['Std_Min'],
                'Std_Max': row['Std_Max'],
                'Hao_Hut_Target': round(h_real, 2)
            })
    
    return pd.concat([df, pd.DataFrame(aug_data)], ignore_index=True)

# =============================================================================
# TRAIN MODEL
# =============================================================================
def train_model():
    print("=" * 60)
    print("TRAIN MODEL VỚI SKLEARN HIỆN TẠI")
    print("=" * 60)
    
    # 1. Tạo dữ liệu
    print("\n[1/5] Tạo dữ liệu huấn luyện...")
    df = create_training_data()
    print(f"   - Số mẫu ban đầu: {len(df)}")
    
    # 2. Augment data
    print("\n[2/5] Data augmentation (30x)...")
    df_aug = augment_data(df, multiplier=30)
    print(f"   - Số mẫu sau augmentation: {len(df_aug)}")
    
    # 3. Chuẩn bị features
    print("\n[3/5] Chuẩn bị features...")
    X = df_aug[['Nguyen_Lieu', 'Tong_Khoi_Vao', 'Std_Min', 'Std_Max']]
    y = df_aug['Hao_Hut_Target'] / 100.0  # Chuyển về tỷ lệ 0-1
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    print(f"   - Train size: {len(X_train)}, Test size: {len(X_test)}")
    
    # 4. Train model
    print("\n[4/5] Train model...")
    
    preprocessor = ColumnTransformer([
        ('num', StandardScaler(), ['Tong_Khoi_Vao', 'Std_Min', 'Std_Max']),
        ('cat', OneHotEncoder(handle_unknown='ignore'), ['Nguyen_Lieu'])
    ])
    
    # So sánh 2 model
    models = {
        "Random Forest": RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42),
        "Gradient Boosting": GradientBoostingRegressor(n_estimators=100, learning_rate=0.1, max_depth=4, random_state=42),
    }
    
    results = []
    best_model = None
    best_r2 = -999
    
    for name, model in models.items():
        pipeline = Pipeline([('prep', preprocessor), ('reg', model)])
        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)
        
        mae = mean_absolute_error(y_test, y_pred) * 100
        r2 = r2_score(y_test, y_pred) * 100
        
        results.append({"Model": name, "MAE (%)": round(mae, 2), "R2 (%)": round(r2, 2)})
        
        if r2 > best_r2:
            best_r2 = r2
            best_model = pipeline
            best_name = name
        
        print(f"   - {name}: MAE={mae:.2f}%, R2={r2:.2f}%")
    
    print(f"\n   >>> Best Model: {best_name} (R2={best_r2:.2f}%)")
    
    # 5. Train trên toàn bộ data
    print("\n[5/5] Train trên toàn bộ data...")
    best_model.fit(X, y)
    
    # Test prediction
    test_cases = [
        {'Nguyen_Lieu': 'THÔNG', 'Tong_Khoi_Vao': 2.5, 'Std_Min': 35, 'Std_Max': 40},
        {'Nguyen_Lieu': 'DẺ GAI', 'Tong_Khoi_Vao': 3.0, 'Std_Min': 30, 'Std_Max': 40},
        {'Nguyen_Lieu': 'HỒ ĐÀO', 'Tong_Khoi_Vao': 1.5, 'Std_Min': 40, 'Std_Max': 50},
    ]
    
    print("\n[KẾT QUẢ TEST]")
    for tc in test_cases:
        pred = best_model.predict(pd.DataFrame([tc]))[0] * 100
        print(f"   - {tc['Nguyen_Lieu']} ({tc['Tong_Khoi_Vao']} m³): {pred:.2f}%")
    
    # Lưu model
    model_package = {
        'model': best_model,
        'loss_ranges': LOSS_RANGES,
        'features': list(X.columns),
        'sklearn_version': '1.8.0',
        'trained_with': 'synthetic_data'
    }
    
    output_dir = os.path.join(os.path.dirname(__file__), 'models')
    os.makedirs(output_dir, exist_ok=True)
    
    output_path = os.path.join(output_dir, 'mo_hinh_hao_hut_final.pkl')
    joblib.dump(model_package, output_path)
    print(f"\n>>> Model đã lưu: {output_path}")
    
    return model_package

if __name__ == "__main__":
    train_model()
