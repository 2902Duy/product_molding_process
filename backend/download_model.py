"""
Script để download model từ Kaggle

Cách sử dụng:
1. Cài đặt kaggle CLI: pip install kaggle
2. Cấu hình API key:
   - Tạo API token tại https://www.kaggle.com/account
   - Đặt file kaggle.json vào ~/.kaggle/kaggle.json (Linux/Mac)
   - Hoặc Windows: C:\Users\<username>\.kaggle\kaggle.json
3. Chạy script: python download_model.py
"""

import os
import shutil
import kaggle

def download_model():
    # Tạo thư mục models nếu chưa có
    models_dir = os.path.join(os.path.dirname(__file__), "models")
    os.makedirs(models_dir, exist_ok=True)
    
    # Dataset path: trinhkhanhduy2902/notebookb46391a209
    # File cần tải: mo_hinh_hao_hut_final.pkl
    
    print("Đang tải model từ Kaggle...")
    print("Dataset: trinhkhanhduy2902/notebookb46391a209")
    print("File: mo_hinh_hao_hut_final.pkl")
    
    try:
        # Tải file từ Kaggle
        from kaggle.api.kaggle_api_extended import KaggleApi
        api = KaggleApi()
        api.authenticate()
        
        # Tải file cụ thể
        api.dataset_download_file(
            'trinhkhanhduy2902/notebookb46391a209',
            'mo_hinh_hao_hut_final.pkl',
            path=models_dir
        )
        
        # Đổi tên file nếu cần
        downloaded_file = os.path.join(models_dir, "mo_hinh_hao_hut_final.pkl")
        
        if os.path.exists(downloaded_file):
            size = os.path.getsize(downloaded_file) / 1024  # KB
            print(f"Đã tải model thành công!")
            print(f"Đường dẫn: {downloaded_file}")
            print(f"Kích thước: {size:.2f} KB")
            return True
        else:
            print("Lỗi: File không được tải về")
            return False
            
    except Exception as e:
        print(f"Lỗi: {e}")
        print("\nNếu chưa có API key Kaggle, hãy:")
        print("1. Vào https://www.kaggle.com/account")
        print("2. Tạo API Token (Download kaggle.json)")
        print("3. Đặt file vào thư mục phù hợp:")
        print("   - Linux/Mac: ~/.kaggle/kaggle.json")
        print("   - Windows: C:\\Users\\<username>\\.kaggle\\kaggle.json")
        return False

if __name__ == "__main__":
    download_model()
