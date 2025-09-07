const Utils = {
    formatDate: (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString();
    },

    // Format electrical values with 1 decimal place
    formatValue: (value, decimals = 1) => {
        if (value == null || isNaN(value)) return 'N/A';
        return Number(value).toFixed(decimals);
    },

    // Specific formatters for each electrical parameter
    formatVoltage: (value) => {
        const formatted = Utils.formatValue(value, 1);
        return formatted === 'N/A' ? formatted : `${formatted} V`;
    },

    formatCurrent: (value) => {
        const formatted = Utils.formatValue(value, 1);
        return formatted === 'N/A' ? formatted : `${formatted} A`;
    },

    formatPower: (value) => {
        const formatted = Utils.formatValue(value, 1);
        return formatted === 'N/A' ? formatted : `${formatted} W`;
    },

    formatEnergy: (value) => {
        const formatted = Utils.formatValue(value, 1);
        return formatted === 'N/A' ? formatted : `${formatted} kWh`;
    }
};
