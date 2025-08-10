# ⚡ Electricity Meter Management System

A complete IoT system for monitoring and managing electricity meters using ESP8266, MQTT, and a modern web dashboard.

## 🏗️ System Architecture

```
ESP8266 (PZEM-004T) → MQTT → Node.js Server → Web Dashboard
     ↓                    ↓           ↓              ↓
  Power Data         Real-time    Data Storage   User Interface
  Collection         Messaging    & Analytics    & Management
```

## 🚀 Features

### 📱 ESP8266 Firmware
- **PZEM-004T Integration**: Real-time power measurement
- **WiFi Management**: Easy WiFi configuration with WiFiManager
- **Dynamic Configuration**: Web-based MQTT server configuration
- **Real-time Data**: Continuous power monitoring every 10 seconds
- **Web Interface**: Built-in configuration portal

### 🔌 MQTT Communication
- **Real-time Messaging**: Instant data transmission
- **Reliable Protocol**: Guaranteed message delivery
- **Scalable**: Support for multiple devices
- **Lightweight**: Efficient for IoT devices

### 📊 Web Dashboard
- **Multi-user System**: Role-based access control
- **Device Management**: Add, edit, and assign devices
- **Real-time Monitoring**: Live power consumption data
- **Analytics**: Consumption trends and reports
- **Responsive Design**: Works on desktop and mobile

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm
- PlatformIO (for ESP8266 development)
- MQTT Broker (Mosquitto)

### Quick Start

1. **Clone the repository:**
```bash
git clone <repository-url>
cd meterEsp8266
```

2. **Start the complete system:**
```bash
./start-all.sh
```

3. **Access the dashboard:**
   - URL: http://localhost:3000
   - Username: admin
   - Password: admin123

4. **Upload ESP8266 firmware:**
```bash
./upload-simple.sh
```

## 📁 Project Structure

```
meterEsp8266/
├── src/                    # ESP8266 firmware source
│   ├── main.cpp           # Main firmware logic
│   ├── DataSender.cpp     # MQTT data transmission
│   ├── Meter.cpp          # PZEM-004T integration
│   ├── NetworkManager.cpp # WiFi management
│   ├── ConfigManager.cpp  # Configuration management
│   └── WebConfig.cpp      # Web configuration interface
├── include/               # Header files
├── data/                  # Configuration files
├── dashboard/             # Web dashboard application
│   ├── server.js         # Express.js server
│   ├── public/           # Frontend files
│   └── data/             # SQLite database
├── mqtt-server/          # MQTT server (legacy)
├── platformio.ini        # PlatformIO configuration
├── start-all.sh          # System startup script
├── stop-all.sh           # System shutdown script
└── upload-simple.sh      # ESP8266 upload script
```

## 🔧 Configuration

### ESP8266 Configuration

1. **Upload firmware and filesystem:**
```bash
./upload-simple.sh
```

2. **Connect to ESP8266 WiFi:**
   - SSID: `PZEM_Meter_[MAC]`
   - IP: `192.168.4.1`

3. **Configure MQTT server:**
   - Access: http://192.168.4.1/config
   - Set MQTT server IP and credentials

4. **Monitor serial output:**
```bash
pio device monitor
```

### Dashboard Configuration

1. **Environment variables** (optional):
```env
PORT=3000
SESSION_SECRET=your-secret-key
MQTT_BROKER_URL=mqtt://localhost:1883
```

2. **Database initialization:**
```bash
cd dashboard
npm run init-db
```

## 📊 Dashboard Features

### User Management
- **Admin Role**: Full system access
- **User Role**: Limited to assigned devices
- **Secure Authentication**: bcrypt password hashing

### Device Management
- **Serial Number Tracking**: Unique device identification
- **Location Management**: Device placement tracking
- **Status Monitoring**: Real-time device status
- **User Assignment**: Device access control

### Real-time Monitoring
- **Live Data**: Instant power readings
- **Multiple Metrics**: Voltage, Current, Power, Energy
- **Interactive Charts**: Historical data visualization
- **WebSocket Updates**: Real-time dashboard updates

### Analytics & Reports
- **Consumption Trends**: Daily, weekly, monthly views
- **Energy Statistics**: Usage patterns and insights
- **Device Performance**: Efficiency monitoring
- **Export Capabilities**: Data export functionality

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Device Management
- `GET /api/devices` - List user's devices
- `POST /api/devices` - Add new device (Admin)
- `PUT /api/devices/:id` - Update device (Admin)
- `POST /api/devices/:deviceId/assign` - Assign device to user (Admin)

### Data Access
- `GET /api/readings/:serialNumber` - Get device readings
- `GET /api/readings/:serialNumber/summary` - Get consumption summary
- `GET /api/dashboard/stats` - Get dashboard statistics

## 📱 ESP8266 Web Interface

### Configuration Pages
- **Main Config**: http://[ESP8266_IP]/
- **MQTT Settings**: http://[ESP8266_IP]/config
- **Network Info**: http://[ESP8266_IP]/ip
- **System Status**: http://[ESP8266_IP]/status

### Features
- **WiFi Configuration**: Easy network setup
- **MQTT Settings**: Server and credential management
- **System Reset**: Factory reset capability
- **Network Information**: IP, Gateway, DNS details

## 🚀 Deployment

### Development
```bash
# Start all services
./start-all.sh

# Stop all services
./stop-all.sh

# Monitor logs
tail -f dashboard/dashboard.log
```

### Production
1. **Set up reverse proxy (nginx)**
2. **Enable HTTPS**
3. **Configure environment variables**
4. **Set up database backups**
5. **Use PM2 for process management**

### Docker Deployment
```dockerfile
# Dashboard
FROM node:16-alpine
WORKDIR /app
COPY dashboard/package*.json ./
RUN npm install
COPY dashboard/ .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔒 Security

- **Session-based authentication**
- **Password hashing** with bcrypt
- **Role-based access control**
- **SQL injection protection**
- **CORS configuration**
- **Input validation**

## 📊 Data Flow

1. **ESP8266** reads power data from PZEM-004T
2. **MQTT** transmits data to server
3. **Node.js** processes and stores data
4. **WebSocket** pushes updates to dashboard
5. **Dashboard** displays real-time information

## 🐛 Troubleshooting

### ESP8266 Issues
- **WiFi Connection**: Check WiFi credentials
- **MQTT Connection**: Verify server IP and port
- **Data Transmission**: Check serial monitor for errors
- **Web Config**: Ensure filesystem is uploaded

### Dashboard Issues
- **Database Errors**: Check file permissions
- **MQTT Connection**: Verify broker is running
- **WebSocket Issues**: Check port availability
- **Authentication**: Verify user credentials

### Common Commands
```bash
# Check MQTT broker status
brew services list | grep mosquitto

# Monitor ESP8266 serial output
pio device monitor

# Check dashboard logs
tail -f dashboard/dashboard.log

# Restart all services
./stop-all.sh && ./start-all.sh
```

## 📈 Performance

- **ESP8266**: 10-second reading intervals
- **MQTT**: Sub-second message delivery
- **Dashboard**: Real-time updates via WebSocket
- **Database**: Optimized queries with indexes

## 🔄 Updates

### Firmware Updates
```bash
# Upload new firmware
./upload-simple.sh

# Monitor for issues
pio device monitor
```

### Dashboard Updates
```bash
# Stop services
./stop-all.sh

# Update code
git pull

# Restart services
./start-all.sh
```

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Check browser console for errors
4. Verify MQTT broker connectivity
5. Monitor system logs

## 📄 License

This project is licensed under the MIT License.

---

**Happy Monitoring! ⚡📊**

*Built with ❤️ for efficient power management* # meter8266MQTT
