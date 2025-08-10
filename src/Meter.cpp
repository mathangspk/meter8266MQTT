#include <Arduino.h>
#include <SoftwareSerial.h>
#include <PZEM004Tv30.h>
#include "Meter.h"
#include "types/DataTypes.h"

Meter::Meter(int rxPin, int txPin)
    : pzemSerial(rxPin, txPin), pzem(pzemSerial)
{
    pzemSerial.begin(9600);
}

MeterReadings Meter::getReadings()
{
    MeterReadings readings;
    readings.voltage = pzem.voltage();
    readings.current = pzem.current();
    readings.power = pzem.power();
    readings.energy = pzem.energy();
    // Kiểm tra giá trị trả về
    if (isnan(readings.voltage) || isnan(readings.current) || isnan(readings.power) || isnan(readings.energy)) {
        readings.voltage = readings.current = readings.power = readings.energy = NAN;
    }
    return readings;
}

void Meter::syncTime()
{
    configTime(0, 0, "pool.ntp.org", "time.nist.gov"); // Set NTP servers
    Serial.print("Syncing time");
    time_t now = time(nullptr);
    int retry = 0;
    const int retry_count = 10;
    while (now < 8 * 3600 * 2 && retry < retry_count)
    {
        delay(500);
        Serial.print(".");
        now = time(nullptr);
        retry++;
    }
    Serial.println();
    if (now < 8 * 3600 * 2)
    {
        Serial.println("Failed to sync time");
    }
    else
    {
        Serial.println("Time synced!");
    }
}