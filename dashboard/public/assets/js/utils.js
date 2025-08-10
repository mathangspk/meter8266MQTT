const Utils = {
    formatDate: (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString();
    },
    formatPower: (value) => {
        if (typeof value !== 'number' || isNaN(value)) return '0 W';
        return value.toFixed(2) + ' W';
    }
};
