#include <Arduino.h>
#include "Meter.h"
#include "NetworkManager.h"
#include "DataSender.h"
#include "ConfigManager.h"
#include "WebConfig.h"
// #include <WiFiManager.h>

// Define your RX and TX pins here (adjust as needed for your hardware)
#define RX_PIN D5
#define TX_PIN D6

Meter meter(RX_PIN, TX_PIN);
NetworkManager networkManager;
DataSender dataSender;
ConfigManager configManager;
WebConfig webConfig(configManager);

unsigned long lastWifiCheck = 0;
const unsigned long WIFI_CHECK_INTERVAL = 10000; // Kiểm tra WiFi mỗi 10 giây

void setup()
{
    Serial.begin(115200);
    // WiFiManager wifiManager;
    // wifiManager.resetSettings();

    // Load configuration
    configManager.loadConfig();

    // Update DataSender with loaded config
    dataSender.updateConfig(

        configManager.getMqttServer().c_str(),
        configManager.getMqttPort(),
        configManager.getDeviceId().c_str(),
        configManager.getSerialNumber().c_str(),
        configManager.getConfig().mqtt_password.c_str(),
        configManager.getConfig().mqtt_username.c_str());

    networkManager.connect();
    meter.syncTime();
    dataSender.setup();
    webConfig.begin();
    delay(1000);
    Serial.println("SSID đang kết nối: " + WiFi.SSID());
    Serial.println("IP Address: " + WiFi.localIP().toString());
    Serial.println("Web config available at: http://" + WiFi.localIP().toString());
    Serial.println("MAC Address: " + WiFi.macAddress());
    Serial.println("==================================================");
    Serial.println("CONNECTION INFO:");
    Serial.println("WiFi SSID: " + WiFi.SSID());
    Serial.println("IP Address: " + WiFi.localIP().toString());
    Serial.println("Gateway: " + WiFi.gatewayIP().toString());
    Serial.println("Subnet: " + WiFi.subnetMask().toString());
    Serial.println("DNS: " + WiFi.dnsIP().toString());
    Serial.println("==================================================");
}

void loop()
{
    // Handle MQTT connection and messages
    dataSender.loop();

    // Handle web config
    webConfig.handle();

    // Kiểm tra WiFi định kỳ và tự động reconnect
    if (millis() - lastWifiCheck > WIFI_CHECK_INTERVAL)
    {
        Serial.println("🔄 Kiểm tra kết nối WiFi...");
        if (!networkManager.isConnected())
        {
            Serial.println("⚠️ Mất kết nối WiFi! Đang thử kết nối lại...");
            networkManager.reconnect();
        }
        lastWifiCheck = millis();
    }

    MeterReadings readings = meter.getReadings();

    if (!isnan(readings.voltage))
    {
        Serial.printf("V: %.1f | I: %.2f | P: %.1f | E: %.2f\n", readings.voltage, readings.current, readings.power, readings.energy);

        // Luôn gửi dữ liệu, DataSender sẽ tự xử lý MQTT và buffer
        dataSender.sendData(readings.voltage, readings.current, readings.power, readings.energy);
    }
    else
    {
        Serial.println("⚠️ Không đọc được dữ liệu từ PZEM");
    }

    delay(10000); // Gửi mỗi 10 giây
}