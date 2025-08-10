#ifndef CONFIGMANAGER_H
#define CONFIGMANAGER_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include <LittleFS.h>

struct MeterConfig {
    String mqtt_server;
    int mqtt_port;
    String device_id;
    String serial_number;
    int reading_interval;
    String wifi_ssid;
    String wifi_password;
    String mqtt_username;
    String mqtt_password;
};

class ConfigManager {
public:
    ConfigManager();
    bool loadConfig();
    bool saveConfig();
    bool updateConfig(const String& key, const String& value);
    bool updateConfig(const String& key, int value);
    MeterConfig getConfig();
    void printConfig();
    bool resetToDefaults();
    
    // Helper methods
    String getMqttServer() { return config.mqtt_server; }
    int getMqttPort() { return config.mqtt_port; }
    String getDeviceId() { return config.device_id; }
    String getSerialNumber() { return config.serial_number; }
    int getReadingInterval() { return config.reading_interval; }

private:
    MeterConfig config;
    const char* CONFIG_FILE = "/config.json";
    
    void setDefaults();
};

#endif // CONFIGMANAGER_H 