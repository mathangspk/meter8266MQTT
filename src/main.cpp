#include <Arduino.h>
#include "Meter.h"
#include "NetworkManager.h"
#include "DataSender.h"
#include "ConfigManager.h"
#include "WebConfig.h"
#include "WiFiLedStatus.h"
// #include <WiFiManager.h>

// Define your RX and TX pins here (adjust as needed for your hardware)
#define RX_PIN D5
#define TX_PIN D6

Meter meter(RX_PIN, TX_PIN);
NetworkManager networkManager;
DataSender dataSender;
ConfigManager configManager;
WebConfig webConfig(configManager);
WiFiLedStatus wifiLedStatus(LED_BUILTIN); // Sử dụng LED tích hợp trên ESP8266

unsigned long lastWifiCheck = 0;
unsigned long lastSendData = 0;
const unsigned long WIFI_CHECK_INTERVAL = 10000; // Kiểm tra WiFi mỗi 10 giây
const unsigned long SEND_INTERVAL = 10000;       // 10 giây

void setup()
{
    wifiLedStatus.begin();
    wifiLedStatus.setState(WiFiLedStatus::OFF);
    wifiLedStatus.update();
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

WiFiLedStatus::LedState currentLedState = WiFiLedStatus::OFF;

void loop()
{
    dataSender.loop();
    webConfig.handle();

    unsigned long now = millis();

    // Kiểm tra WiFi định kỳ
    if (now - lastWifiCheck > WIFI_CHECK_INTERVAL)
    {
        Serial.println("🔄 Kiểm tra kết nối WiFi...");
        if (!networkManager.isConnected())
        {
            if (currentLedState != WiFiLedStatus::OFF)
            {
                wifiLedStatus.setState(WiFiLedStatus::OFF);
                currentLedState = WiFiLedStatus::OFF;
                wifiLedStatus.update();
            }
            Serial.println("⚠️ Mất kết nối WiFi! Đang thử kết nối lại...");
            networkManager.reconnect();
        }
        else
        {
            if (currentLedState != WiFiLedStatus::ON)
            {
                wifiLedStatus.setState(WiFiLedStatus::ON);
                currentLedState = WiFiLedStatus::ON;
            }
            Serial.println("✅ Kết nối WiFi ổn định.");
        }
        lastWifiCheck = now;
    }

    MeterReadings readings = meter.getReadings();

    if (!isnan(readings.voltage))
    {
        // Serial.printf("V: %.1f | I: %.2f | P: %.1f | E: %.2f\n", readings.voltage, readings.current, readings.power, readings.energy);

        // Gửi dữ liệu định kỳ, không delay trong loop
        if (now - lastSendData > SEND_INTERVAL)
        {
            dataSender.sendData(readings.voltage, readings.current, readings.power, readings.energy);
            lastSendData = now;
        }

        // Nếu trước đó là lỗi, chuyển lại LED ON
        // if (currentLedState != WiFiLedStatus::ON)
        //{
        //    wifiLedStatus.setState(WiFiLedStatus::ON);
        //    currentLedState = WiFiLedStatus::ON;
        //}
    }
    else
    {
        Serial.println("⚠️ Không đọc được dữ liệu từ PZEM");
        if (currentLedState != WiFiLedStatus::BLINK_SLOW)
        {
            wifiLedStatus.setState(WiFiLedStatus::BLINK_SLOW);
            currentLedState = WiFiLedStatus::BLINK_SLOW;
        }
    }

    wifiLedStatus.update();

    // Không delay để LED update mượt
}

/*
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
            wifiLedStatus.setState(WiFiLedStatus::BLINK_FAST);
            Serial.println("⚠️ Mất kết nối WiFi! Đang thử kết nối lại...");
            networkManager.reconnect();
        }
        else
        {
            wifiLedStatus.setState(WiFiLedStatus::ON);
            Serial.println("✅ Kết nối WiFi ổn định.");
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
        wifiLedStatus.setState(WiFiLedStatus::BLINK_SLOW);
    }
    wifiLedStatus.update();
    delay(10000); // Gửi mỗi 10 giây
}
    */