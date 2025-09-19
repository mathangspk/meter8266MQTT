// Test script for Month Mode UTC+7 functionality
// Run with: node test-month-utc7.js

const testMonthMode = () => {
    console.log('🧪 Testing Month Mode UTC+7 Functionality\n');

    // Test Case 1: Regular month (January)
    console.log('📅 Test Case 1: Regular Month (January 2024)');
    const janDate = new Date('2024-01-15T00:00:00'); // Middle of January
    testMonthCalculation(janDate, 'January');

    // Test Case 2: February (non-leap year)
    console.log('\n📅 Test Case 2: February (Non-leap year)');
    const febDate = new Date('2024-02-15T00:00:00'); // Middle of February
    testMonthCalculation(febDate, 'February');

    // Test Case 3: February (leap year)
    console.log('\n📅 Test Case 3: February (Leap year)');
    const febLeapDate = new Date('2024-02-15T00:00:00'); // 2024 is leap year
    testMonthCalculation(febLeapDate, 'February Leap');

    // Test Case 4: December (year boundary)
    console.log('\n📅 Test Case 4: December (Year boundary)');
    const decDate = new Date('2024-12-15T00:00:00'); // Middle of December
    testMonthCalculation(decDate, 'December');

    // Test Case 5: March (31 days)
    console.log('\n📅 Test Case 5: March (31 days)');
    const marDate = new Date('2024-03-15T00:00:00'); // Middle of March
    testMonthCalculation(marDate, 'March');
};

const testMonthCalculation = (startDate, testName) => {
    console.log(`Input Date: ${startDate.toISOString().split('T')[0]} (${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})`);

    // Calculate month boundaries (same logic as in readings.js)
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);

    console.log(`Month Start (Local): ${startDate.toISOString().split('T')[0]}`);
    console.log(`Month End (Local): ${endDate.toISOString().split('T')[0]}`);

    // UTC+7 conversion for bucket generation (NEW: consistent with data processing)
    const utc7StartDate = new Date(startDate.getTime() + 7 * 60 * 60 * 1000);
    const utc7EndDate = new Date(endDate.getTime() + 7 * 60 * 60 * 1000);

    console.log(`UTC+7 Month Start: ${utc7StartDate.toISOString().split('T')[0]}`);
    console.log(`UTC+7 Month End: ${utc7EndDate.toISOString().split('T')[0]}`);

    // Generate bucket labels (same logic as updated readings.js)
    const pad2 = (n) => String(n).padStart(2, '0');
    const year = utc7StartDate.getFullYear();
    const month = utc7StartDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const bucketLabels = [];
    for (let d = 1; d <= daysInMonth; d++) {
        bucketLabels.push(`${pad2(d)}/${pad2(month + 1)}`);
    }

    console.log(`Days in Month: ${daysInMonth}`);
    console.log(`Bucket Labels: [${bucketLabels.slice(0, 5).join(', ')}${bucketLabels.length > 5 ? '...' : ''}] (${bucketLabels.length} days)`);

    // Query range calculation (same as in readings.js)
    const queryStart = new Date(startDate.getTime() - 7 * 60 * 60 * 1000);
    const queryEnd = new Date(endDate.getTime() - 7 * 60 * 60 * 1000);

    console.log(`Query Range: ${queryStart.toISOString()} to ${queryEnd.toISOString()}`);
    console.log(`Query Range (Local): ${queryStart.toLocaleString()} to ${queryEnd.toLocaleString()}`);
    console.log('✅ Test completed\n');
};

// Run the tests
testMonthMode();