const socket = new WebSocket("ws://localhost:8080/");

const deviceList = document.getElementById("deviceList");
const voltageEl = document.getElementById("voltage");
const currentEl = document.getElementById("current");
const powerEl = document.getElementById("power");
const energyEl = document.getElementById("energy");
const deviceIdEl = document.getElementById("device_id");
const serialNumberEl = document.getElementById("serial_number");

const devices = {}; // Store latest data for each device

socket.onmessage = (event) => {
    const message = JSON.parse(event.data);

    if (message.type === 'meter_data') {
        const data = message.data;
        const { device_id, serial_number } = data;
        console.log(data);
        // Save or update device data
        devices[device_id] = data;

        updateDeviceList();
        updateLiveStats(data); // optional: you can control which device to show
    }
};

function updateDeviceList() {
    deviceList.innerHTML = '';

    Object.entries(devices).forEach(([id, data]) => {
        const item = document.createElement("li");
        item.className = "bg-gray-100 rounded p-2 hover:bg-blue-100 cursor-pointer";
        item.textContent = `ID: ${data.device_id} | SN: ${data.serial_number}`;

        // Show data on click
        item.onclick = () => updateLiveStats(data);

        deviceList.appendChild(item);
    });
}

function updateLiveStats(data) {
    voltageEl.textContent = data.voltage.toFixed(1);
    currentEl.textContent = data.current.toFixed(2);
    powerEl.textContent = data.power.toFixed(1);
    energyEl.textContent = data.energy.toFixed(2);
    deviceIdEl.textContent = data.device_id;
    serialNumberEl.textContent = data.serial_number;
}
