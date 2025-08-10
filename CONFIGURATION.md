# Dynamic Configuration System

ESP8266 meter project now supports dynamic configuration without code recompilation!

## 🚀 Features

- **Web Configuration Portal**: Configure device via web interface
- **SPIFFS Storage**: Configuration stored in ESP8266's filesystem
- **MQTT Server Change**: Update MQTT server IP without recompiling
- **Device ID Change**: Change device ID remotely
- **Reading Interval**: Adjust data sending frequency
- **WiFi Credentials**: Store WiFi settings

## 📋 Configuration Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `mqtt_server` | 192.168.1.50 | MQTT broker IP address |
| `mqtt_port` | 1883 | MQTT broker port |
| `device_id` | 1 | Device identifier |
| `serial_number` | SN001 | Device serial number |
| `reading_interval` | 10000 | Data reading interval (ms) |
| `wifi_ssid` | "" | WiFi network name |
| `wifi_password` | "" | WiFi password |
| `mqtt_username` | "" | MQTT username (optional) |
| `mqtt_password` | "" | MQTT password (optional) |

## 🔧 Setup Instructions

### 1. Upload SPIFFS Filesystem
```bash
./upload-spiffs.sh
```

### 2. Upload Firmware
```bash
pio run -t upload
```

### 3. Access Web Configuration
1. Connect to ESP8266's WiFi network (if in AP mode)
2. Open browser and go to: `http://[ESP8266_IP]/config`
3. Update configuration settings
4. Save and reboot

## 🌐 Web Interface

### Configuration Page
- **URL**: `http://[ESP8266_IP]/config`
- **Features**:
  - Update MQTT server settings
  - Change device ID
  - Adjust reading interval
  - Configure WiFi credentials
  - Reset to defaults

### Status Page
- **URL**: `http://[ESP8266_IP]/status`
- **Features**:
  - View current configuration
  - System status
  - WiFi connection info
  - MQTT connection status

## 📡 MQTT Control Commands

Send commands to topic `meter/[device_id]/control`:

### Update MQTT Server
```json
{
  "command": "update_config",
  "key": "mqtt_server",
  "value": "192.168.1.100"
}
```

### Update Device ID
```json
{
  "command": "update_config",
  "key": "device_id",
  "value": "2"
}
```

### Update Reading Interval
```json
{
  "command": "update_config",
  "key": "reading_interval",
  "value": 5000
}
```

### Reset Configuration
```json
{
  "command": "reset_config"
}
```

### Reboot Device
```json
{
  "command": "reboot"
}
```

## 🔄 Configuration Methods

### Method 1: Web Interface (Recommended)
- Easy to use
- No technical knowledge required
- Real-time updates

### Method 2: MQTT Commands
- Remote configuration
- Automated updates
- Integration with existing systems

### Method 3: Serial Commands
- Direct communication
- Debugging purposes
- Development testing

## 📁 File Structure

```
data/
├── config.json          # Default configuration file
└── web/
    ├── config.html      # Configuration page
    └── status.html      # Status page

src/
├── ConfigManager.cpp    # Configuration management
├── ConfigManager.h
├── WebConfig.cpp        # Web interface
├── WebConfig.h
└── main.cpp            # Main application
```

## 🛠️ Development

### Adding New Configuration Parameters

1. Update `Config` struct in `ConfigManager.h`
2. Add default value in `setDefaults()`
3. Add loading/saving logic in `loadConfig()`/`saveConfig()`
4. Add update method in `updateConfig()`
5. Update web interface

### Example:
```cpp
// In ConfigManager.h
struct Config {
    // ... existing fields ...
    String new_parameter;
};

// In ConfigManager.cpp
void ConfigManager::setDefaults() {
    // ... existing defaults ...
    config.new_parameter = "default_value";
}
```

## 🔍 Troubleshooting

### Configuration Not Loading
- Check SPIFFS upload: `pio run -t uploadfs`
- Verify config.json exists: `pio device monitor` and check logs
- Reset to defaults if needed

### Web Interface Not Accessible
- Check WiFi connection
- Verify ESP8266 IP address
- Check firewall settings

### MQTT Connection Issues
- Verify MQTT server IP and port
- Check network connectivity
- Ensure MQTT broker is running

## 📝 Notes

- Configuration changes take effect immediately
- Some changes require device reboot
- Configuration is persistent across reboots
- Default configuration is restored if config file is corrupted 