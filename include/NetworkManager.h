#ifndef NETWORKMANAGER_H
#define NETWORKMANAGER_H

#include <WiFiManager.h>

class NetworkManager {
public:
    NetworkManager();
    bool connect();
    bool isConnected();
    bool reconnect();
    bool ensureConnection();

private:
    WiFiManager wm;
};

#endif // NETWORKMANAGER_H