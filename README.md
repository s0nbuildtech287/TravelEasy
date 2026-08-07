# ✈️ TravelEasy — Real-Time Flight & Vessel Radar Monitor

TravelEasy là một hệ thống web giám sát và theo dõi giao thông hàng không (Flight Radar) và hàng hải (Vessel Tracker) thời gian thực trên khu vực Biển Đông và Đông Nam Á. Ứng dụng tích hợp ra-đa thời tiết, bộ đàm không lưu live, hệ thống cảnh báo khẩn cấp tự động và bảng thông tin LED FIDS trực quan.

---

## 🚀 Các Tính Năng Nổi Bật

### 1. 🌤️ Bản đồ Ra-đa Thời tiết & Giao thông Động
*   Bản đồ nền đa dạng: Hỗ trợ chuyển đổi nhanh giữa các kiểu bản đồ như *CartoDB Dark (Tối ưu hóa hiển thị đêm)*, *Google Hybrid (Vệ tinh lai)*, và *Google Streets*.
*   Lớp phủ Ra-đa thời tiết: Tích hợp trực tiếp lớp mây vệ tinh thời gian thực (Live Satellite Clouds qua RainViewer), bản đồ nhiệt độ hồng ngoại toàn cầu (Global IR Thermal) và dữ liệu bão/gió NEXRAD.
*   Kiểm tra thời tiết tại điểm (Open-Meteo): Click trực tiếp vào bất kỳ vị trí nào trên bản đồ để xem nhiệt độ (°C) và hướng/tốc độ gió thực tế tại tọa độ đó.

### 2. 🚨 Cảnh báo Hàng không & Phát hiện Bay vòng (Holding Pattern)
*   Hệ thống Neon Neon Alarm: Tự động phát âm thanh và hiển thị bảng báo neon đỏ khi phát hiện máy bay phát tín hiệu khẩn cấp kỹ thuật (Squawk 7700) hoặc mất liên lạc vô tuyến (Squawk 7600).
*   Phát hiện máy bay bay vòng lượn chờ hạ cánh (Holding Pattern): Nhận diện tự động các tàu bay đang phải bay vòng lặp đi lặp lại ở độ cao thấp (3,000 FT - 14,000 FT) trong phạm vi tiếp cận của sân bay Tân Sơn Nhất (SGN) và Nội Bài (HAN) do tắc nghẽn đường băng hoặc thời tiết xấu.

### 3. 🏢 Bảng Điện tử Sân bay & Cảng biển (Virtual LED FIDS Board)
*   Bảng FIDS Sân bay: Hiển thị danh sách các chuyến bay đến (Arrivals) và đi (Departures) dạng bảng LED điện tử sân bay cổ điển cho các sân bay lớn như Tân Sơn Nhất, Nội Bài, Đà Nẵng, Changi (Singapore)... dữ liệu khớp với thông tin hành trình thực tế.
*   Thống kê Cảng biển: Xem danh sách tàu hàng/tàu dầu đang cập hoặc chờ ngoài khơi các cảng biển chính (Hải Phòng, Cái Mép - Vũng Tàu, Đà Nẵng, Quy Nhơn, Singapore, Hong Kong).

### 4. 🛩️ Đường bay 3D Đổi màu theo Độ cao (Altitude Path)
*   Hiển thị quỹ đạo bay lịch sử của máy bay dưới dạng nét vẽ gradient đổi màu động theo độ cao:
    *   🟢 Xanh lá (Green): Độ cao thấp (Đang cất/hạ cánh hoặc leo độ cao ban đầu).
    *   🟡/🟠 Vàng / Cam (Yellow/Orange): Độ cao trung bình.
    *   🔵 Xanh da trời Neon (Neon Blue): Đang bay ở độ cao ổn định hành trình (Cruising Altitude - ví dụ 38,000 FT).
*   Giả lập Buồng lái (3D Cockpit Simulator): Chế độ camera tự động bám đuổi (flyTo) tọa độ máy bay theo chu kỳ cập nhật, mang lại góc nhìn mô phỏng từ khoang lái.

### 5. 📻 Bộ đàm Không lưu Live & Audio Visualizer (Live ATC Scanner)
*   Cho phép nghe trực tiếp các kênh đàm thoại không lưu thực tế giữa Kiểm soát viên không lưu và Phi công (Tân Sơn Nhất Tower/Ground, Nội Bài Tower, Đà Nẵng Tower, Changi Tower...) lấy nguồn từ LiveATC.
*   Bypass CORS Proxy: Backend FastAPI đóng vai trò proxy chuyển tiếp luồng âm thanh giúp khắc phục triệt để lỗi chặn CORS từ trình duyệt.
*   Hiệu ứng sóng nhạc: Đi kèm hiệu ứng hiển thị phổ tần âm thanh động (Audio Spectrum Visualizer) vẽ bằng HTML5 Canvas.

### 6. ⛴️ Theo dõi Tàu biển thời gian thực (AIS Vessel Tracker)
*   Tích hợp bộ kết nối WebSocket trực tiếp đến dịch vụ AISStream.io để nhận các gói tin vị trí tàu biển (Automatic Identification System - AIS) trên Biển Đông.
*   Tự động lọc các tàu không hoạt động để tối ưu bộ nhớ, đi kèm hệ thống tàu dự phòng (default fallback list) để đảm bảo bản đồ luôn sống động trong trường hợp mất kết nối.

### 7. 🧠 Module RAG Travel Planner (Kiến trúc sẵn sàng)
*   Mã nguồn đi kèm hệ thống RAG phục vụ tìm kiếm thông tin điểm đến du lịch, ẩm thực và khách sạn tại Việt Nam:
    *   Embedder: Sử dụng mô hình dịch thuật đa ngôn ngữ `intfloat/multilingual-e5-small` qua thư viện `sentence-transformers`.
    *   Vector Store: Quản lý chỉ mục vector bằng thư viện FAISS (`faiss-cpu`) lưu trữ trực tiếp dưới đĩa cứng (`backend/app/rag_store`).

---

## 🛠️ Kiến Trúc Công Nghệ

### Frontend
*   Framework: React 19, Vite (Javascript ES Modules)
*   Bản đồ: Leaflet.js (thông qua CDN tải nhanh và tối ưu nhẹ)
*   Icons & Fonts: FontAwesome 6, Google Fonts (Outfit & Inter)
*   Styling: CSS thuần (Vanilla CSS) với cấu trúc Glassmorphic UI (HUD của trạm điều khiển không lưu chuyên nghiệp), hiệu ứng Neon, mờ đục và thiết kế Responsive.

### Backend
*   Core: FastAPI (Python >= 3.10)
*   HTTP Client: `httpx` (hỗ trợ request bất đồng bộ async để cào cấp tốc Flightradar24 Feed và proxy âm thanh ATC)
*   WebSocket Client: `websockets` (kết nối trực tiếp luồng stream AIS của AISStream)
*   Server: Uvicorn

---

## 📁 Cấu Trúc Thư Mục Dự Án

```text
TravelEasy/
├── frontend/                # Giao diện người dùng (React + Vite)
│   ├── src/
│   │   ├── App.jsx          # Component chính chứa bản đồ, các widget HUD, ATC, FIDS
│   │   ├── index.css        # CSS định hình giao diện và hoạt ảnh
│   │   └── main.jsx
│   ├── dist/                # Bản build tĩnh của React sau khi compile
│   ├── package.json
│   └── vite.config.js
├── backend/                 # API Server (FastAPI)
│   ├── app/
│   │   ├── api/
│   │   │   └── main.py      # FastAPI Server chính
│   │   ├── rag_module/      # Xử lý RAG (Loader, Embedder, FAISS Store, Generator)
│   │   └── rag_store/       # File chỉ mục vector đã lưu (.pkl & .index)
│   ├── scripts/             # Script nạp dữ liệu vào CSDL
│   ├── utils/               # Khởi tạo DB schema cho du lịch, ẩm thực
│   ├── .env                 # Cấu hình API Keys (OpenAI, Google Places...)
│   └── requirements.txt
├── run_dev.ps1              # Script PowerShell khởi chạy 1-Click
└── README.md                # Tài liệu hướng dẫn (File này)
```

---

## ⚙️ Cài Đặt & Khởi Chạy

### Yêu cầu hệ thống
*   Python: Phiên bản `>= 3.10`
*   Node.js: Phiên bản `>= 18`
*   Hệ điều hành: Windows (khuyên dùng PowerShell) hoặc macOS/Linux.

### 1. Chuẩn bị môi trường ảo Python (Virtual Environment)
Mã nguồn khởi chạy mặc định sử dụng thư mục môi trường ảo tên là `venv` nằm tại thư mục gốc của dự án.
Nếu chưa có, hãy tạo và cài đặt các phụ thuộc:
```powershell
# Tạo môi trường ảo
python -m venv venv

# Kích hoạt môi trường ảo
.\venv\Scripts\Activate.ps1

# Cài đặt các thư viện cần thiết cho Backend
pip install -r backend/requirements.txt
```

### 2. Cài đặt các gói thư viện Frontend
```bash
cd frontend
npm install
cd ..
```

### 3. Cấu hình biến môi trường
Tạo hoặc chỉnh sửa file `backend/.env` với các nội dung khóa API (nếu cần sử dụng module mở rộng OpenAI / Google Places / Foursquare):
```ini
GOOGLE_PLACES_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
FOURSQUARE_API_KEY=your_key_here
```

### 4. Khởi chạy 1-Click bằng script PowerShell
Dự án đã tích hợp sẵn tập lệnh khởi chạy tự động `run_dev.ps1`. Tập lệnh này sẽ thực hiện:
1. Biên dịch toàn bộ Frontend React (`npm run build`).
2. Tự động di chuyển các file tĩnh vào thư mục phân phối để FastAPI phục vụ.
3. Kích hoạt môi trường ảo Python và khởi chạy server Uvicorn tại địa chỉ `http://localhost:8000`.

Mở PowerShell tại thư mục gốc của dự án và chạy:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
.\run_dev.ps1
```

Sau khi khởi chạy thành công, truy cập trình duyệt tại địa chỉ: [http://localhost:8000](http://localhost:8000) để trải nghiệm giao diện trạm radar giám sát.

---

## 🔌 Danh Sách Các Endpoints API Chính

Khi server hoạt động, bạn có thể xem tài liệu tương tác Swagger UI tại: [http://localhost:8000/docs](http://localhost:8000/docs).

*   `GET /` : Phục vụ giao diện người dùng tĩnh (React App).
*   `GET /api/flights` : Lấy danh sách máy bay đang bay trên không phận Việt Nam (tải động từ Flightradar24) đi kèm cảnh báo sự cố khẩn cấp kỹ thuật & bay vòng.
*   `GET /api/flights/{icao}/track` : Lấy dữ liệu tọa độ đường bay lịch sử phục vụ hiển thị vạch đường đi 3D trên bản đồ.
*   `GET /api/airports/{code}/fids` : Lấy danh sách các chuyến bay đến/đi cho bảng thông tin LED của sân bay tương ứng.
*   `GET /api/ships` : Lấy danh sách vị trí các tàu hàng ngoài khơi thông qua bộ thu sóng AIS thời gian thực.
*   `GET /api/atc/channels` : Lấy danh sách tần số và thông tin các trạm bộ đàm không lưu.
*   `GET /api/atc/stream/{channel_id}` : Proxy chuyển hướng luồng âm thanh đàm thoại không lưu thực tế từ LiveATC giúp vượt qua bảo mật CORS.