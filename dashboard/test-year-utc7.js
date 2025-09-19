// Test script for Year Mode UTC+7 functionality
// Run with: node test-year-utc7.js

const testYearMode = () => {
    console.log('🧪 Testing Year Mode UTC+7 Functionality\n');

    // Test Case 1: Regular year (2024)
    console.log('📅 Test Case 1: Regular Year (2024)');
    const year2024Date = new Date('2024-06-15T00:00:00'); // Middle of 2024
    testYearCalculation(year2024Date, '2024');

    // Test Case 2: Year boundary (December 2024)
    console.log('\n📅 Test Case 2: Year Boundary (December 2024)');
    const dec2024Date = new Date('2024-12-15T00:00:00'); // Late December 2024
    testYearCalculation(dec2024Date, 'December 2024');

    // Test Case 3: Year boundary (January 2025)
    console.log('\n📅 Test Case 3: Year Boundary (January 2025)');
    const jan2025Date = new Date('2025-01-15T00:00:00'); // Early January 2025
    testYearCalculation(jan2025Date, 'January 2025');

    // Test Case 4: Leap year (2024)
    console.log('\n📅 Test Case 4: Leap Year (2024)');
    const leapYearDate = new Date('2024-02-29T00:00:00'); // Leap day
    testYearCalculation(leapYearDate, 'Leap Year 2024');
};

const testYearCalculation = (startDate, testName) => {
    console.log(`Input Date: ${startDate.toISOString().split('T')[0]} (${startDate.toLocaleDateString('en-US', { year: 'numeric' })})`);

    // Calculate year boundaries (same logic as in readings.js)
    const endDate = new Date(startDate.getFullYear() + 1, 0, 1);

    console.log(`Year Start (Local): ${startDate.toISOString().split('T')[0]}`);
    console.log(`Year End (Local): ${endDate.toISOString().split('T')[0]}`);

    // UTC+7 conversion for bucket generation (NEW: consistent with data processing)
    const utc7StartDate = new Date(startDate.getTime() + 7 * 60 * 60 * 1000);
    const utc7EndDate = new Date(endDate.getTime() + 7 * 60 * 60 * 1000);

    console.log(`UTC+7 Year Start: ${utc7StartDate.toISOString().split('T')[0]}`);
    console.log(`UTC+7 Year End: ${utc7EndDate.toISOString().split('T')[0]}`);

    // Generate bucket labels (same logic as updated readings.js)
    const pad2 = (n) => String(n).padStart(2, '0');
    const year = utc7StartDate.getFullYear();

    const bucketLabels = [];
    for (let m = 1; m <= 12; m++) {
        bucketLabels.push(`${pad2(m)}/${year}`);
    }

    console.log(`Bucket Labels: [${bucketLabels.join(', ')}]`);
    console.log(`Year for Labels: ${year}`);

    // Query range calculation (same as in readings.js)
    const queryStart = new Date(startDate.getTime() - 7 * 60 * 60 * 1000);
    const queryEnd = new Date(endDate.getTime() - 7 * 60 * 60 * 1000);

    console.log(`Query Range: ${queryStart.toISOString()} to ${queryEnd.toISOString()}`);
    console.log(`Query Range (Local): ${queryStart.toLocaleString()} to ${queryEnd.toLocaleString()}`);
    console.log('✅ Test completed\n');
};

// Run the tests
testYearMode();