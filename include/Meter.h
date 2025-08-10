#ifndef METER_H
#define METER_H

#include <PZEM004Tv30.h>
#include <SoftwareSerial.h>
#include <time.h>
#include "types/DataTypes.h"

class Meter
{
public:
    Meter(int rxPin, int txPin);
    void syncTime(); // Add this line
    MeterReadings getReadings();
private:
    SoftwareSerial pzemSerial;
    PZEM004Tv30 pzem;
};

#endif // METER_H