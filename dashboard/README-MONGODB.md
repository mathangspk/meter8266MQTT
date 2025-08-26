# Chuyển đổi từ SQLite sang MongoDB

## Cài đặt MongoDB

### 1. Cài đặt MongoDB Community Edition

**macOS (sử dụng Homebrew):**
```bash
brew tap mongodb/brew
brew install mongodb-community
```

**Ubuntu/Debian:**
```bash
sudo apt-get install mongodb
```

**Windows:**
Tải và cài đặt từ [MongoDB Download Center](https://www.mongodb.com/try/download/community)

### 2. Khởi động MongoDB

**macOS:**
```bash
brew services start mongodb-community
```

**Ubuntu/Debian:**
```bash
sudo systemctl start mongodb
```

**Windows:**
MongoDB sẽ tự động chạy như một service.

## Cấu hình

### 1. Tạo file .env

Tạo file `.env` trong thư mục `dashboard/` với nội dung:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
DB_NAME=meter_dashboard

# MQTT Configuration
MQTT_IP=localhost
MQTT_PORT=1883
MQTT_USERNAME=
MQTT_PASSWORD=

# Server Configuration
HTTP_PORT=3000
WS_PORT=8080
```

### 2. Cài đặt dependencies

```bash
cd dashboard
npm install
```

## Migration dữ liệu

### 1. Backup dữ liệu SQLite (khuyến nghị)

```bash
cp db/meter_data.db db/meter_data_backup.db
```

### 2. Chạy script migration

```bash
npm run migrate
```

Script này sẽ:
- Kết nối đến MongoDB
- Migrate tất cả users từ SQLite
- Migrate tất cả devices từ SQLite  
- Migrate tất cả meter readings từ SQLite
- Tạo indexes cho performance

## Khởi động ứng dụng

```bash
npm start
```

hoặc để development:

```bash
npm run dev
```

## Cấu trúc dữ liệu MongoDB

### Collection: users
```javascript
{
  _id: ObjectId,
  username: String,
  email: String,
  password: String,
  created_at: Date
}
```

### Collection: devices
```javascript
{
  _id: ObjectId,
  serial_number: String,
  device_id: String,
  name: String,
  location: String,
  status: String,
  username: String,
  last_seen: Date,
  created_at: Date
}
```

### Collection: meter_readings
```javascript
{
  _id: ObjectId,
  device_id: String,
  serial_number: String,
  voltage: Number,
  current: Number,
  power: Number,
  energy: Number,
  timestamp: Date
}
```

## Indexes

Các indexes sau đã được tạo tự động:

- `users`: username (unique), email (unique)
- `devices`: serial_number (unique), username, last_seen
- `meter_readings`: device_id + timestamp, serial_number + timestamp, timestamp

## Lợi ích của MongoDB

1. **Scalability**: Dễ dàng scale horizontal
2. **Flexibility**: Schema linh hoạt, dễ thêm/sửa fields
3. **Performance**: Aggregation pipeline mạnh mẽ cho analytics
4. **JSON Native**: Dữ liệu được lưu dưới dạng JSON, dễ xử lý
5. **Sharding**: Hỗ trợ phân tán dữ liệu trên nhiều server

## Troubleshooting

### Lỗi kết nối MongoDB
- Kiểm tra MongoDB đã được khởi động chưa
- Kiểm tra MONGODB_URI trong file .env
- Kiểm tra firewall/network

### Lỗi migration
- Đảm bảo MongoDB đang chạy
- Kiểm tra quyền ghi vào database
- Backup dữ liệu SQLite trước khi migrate

### Performance issues
- Kiểm tra indexes đã được tạo chưa
- Monitor MongoDB performance với MongoDB Compass
- Xem xét tối ưu queries
