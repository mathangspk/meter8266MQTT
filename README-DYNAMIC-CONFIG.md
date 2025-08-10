# 🚀 ESP8266 Meter với Cấu hình Động

## ✅ **Đã sửa lỗi build thành công!**

### 🔧 **Các lỗi đã khắc phục:**
1. **Xung đột tên `Config`** → Đổi thành `MeterConfig`
2. **SPIFFS deprecated** → Chuyển sang **LittleFS**
3. **ArduinoJson deprecated** → Sử dụng `JsonDocument`
4. **Sign-compare warning** → Sửa kiểu dữ liệu

### 📋 **Hệ thống cấu hình động:**

#### **1. Cấu hình qua Web Interface**
- URL: `http://[ESP8266_IP]/config`
- Thay đổi MQTT server IP
- Cập nhật Device ID
- Điều chỉnh reading interval

#### **2. Cấu hình qua MQTT Commands**
```json
// Thay đổi MQTT server
{
  "command": "update_config",
  "key": "mqtt_server",
  "value": "192.168.1.100"
}

// Thay đổi Device ID
{
  "command": "update_config", 
  "key": "device_id",
  "value": "2"
}
```

#### **3. Cấu hình qua SPIFFS/LittleFS**
- File: `/config.json`
- Lưu trữ bền vững
- Tự động load khi khởi động

### 🛠️ **Cách sử dụng:**

#### **Upload firmware:**
```bash
./upload-simple.sh
```

#### **Truy cập web config:**
1. Kết nối WiFi với ESP8266
2. Mở browser: `http://[ESP8266_IP]/config`
3. Cập nhật MQTT server IP
4. Lưu và reboot

#### **Cấu hình từ xa qua MQTT:**
```bash
# Gửi command đến topic: meter/[device_id]/control
mosquitto_pub -h localhost -t "meter/1/control" -m '{"command":"update_config","key":"mqtt_server","value":"192.168.1.100"}'
```

### 📊 **Các tham số cấu hình:**

| Tham số | Mặc định | Mô tả |
|---------|----------|-------|
| `mqtt_server` | 192.168.1.50 | IP MQTT broker |
| `mqtt_port` | 1883 | Port MQTT |
| `device_id` | 1 | ID thiết bị |
| `serial_number` | SN001 | Serial number |
| `reading_interval` | 10000 | Chu kỳ đọc (ms) |

### 🎯 **Lợi ích:**

- ✅ **Không cần upload lại code** khi thay đổi MQTT server
- ✅ **Cấu hình từ xa** qua web hoặc MQTT
- ✅ **Lưu trữ bền vững** trong LittleFS
- ✅ **Giao diện web thân thiện**
- ✅ **Hỗ trợ nhiều thiết bị**

### 🔄 **Workflow:**

1. **Upload firmware** → ESP8266 khởi động
2. **Load config** → Từ LittleFS
3. **Kết nối MQTT** → Với server đã cấu hình
4. **Gửi dữ liệu** → Mỗi 10 giây
5. **Cấu hình động** → Qua web hoặc MQTT

### 📝 **Ghi chú:**

- Cấu hình thay đổi có hiệu lực ngay lập tức
- Một số thay đổi cần reboot thiết bị
- Cấu hình được lưu trữ bền vững qua các lần reboot
- Cấu hình mặc định được khôi phục nếu file bị lỗi

---

**🎉 Bây giờ bạn có thể thay đổi MQTT server IP mà không cần upload lại code!** 