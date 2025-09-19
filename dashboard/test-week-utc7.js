// Test script for Week Mode UTC+7 functionality
// Run with: node test-week-utc7.js

const testWeekMode = () => {
    console.log('🧪 Testing Week Mode UTC+7 Functionality\n');

    // Test Case 1: Monday selection
    console.log('📅 Test Case 1: Monday Selection');
    const mondayDate = new Date('2024-01-15T00:00:00'); // Monday
    testWeekCalculation(mondayDate, 'Monday');

    // Test Case 2: Wednesday selection
    console.log('\n📅 Test Case 2: Wednesday Selection');
    const wednesdayDate = new Date('2024-01-17T00:00:00'); // Wednesday
    testWeekCalculation(wednesdayDate, 'Wednesday');

    // Test Case 3: Sunday selection
    console.log('\n📅 Test Case 3: Sunday Selection');
    const sundayDate = new Date('2024-01-21T00:00:00'); // Sunday
    testWeekCalculation(sundayDate, 'Sunday');

    // Test Case 4: Month boundary
    console.log('\n📅 Test Case 4: Month Boundary (Jan 31)');
    const monthEndDate = new Date('2024-01-31T00:00:00'); // Wednesday, last day of January
    testWeekCalculation(monthEndDate, 'Month Boundary');

    // Test Case 5: Year boundary
    console.log('\n📅 Test Case 5: Year Boundary (Dec 30)');
    const yearEndDate = new Date('2024-12-30T00:00:00'); // Monday
    testWeekCalculation(yearEndDate, 'Year Boundary');
};

const testWeekCalculation = (startDate, testName) => {
    console.log(`Input Date: ${startDate.toISOString().split('T')[0]} (${startDate.toLocaleDateString('en-US', { weekday: 'long' })})`);

    // Calculate week boundaries (same logic as in readings.js)
    const weekStart = new Date(startDate);
    const dayOfWeek = startDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Adjust to Monday of the selected week
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    weekStart.setDate(startDate.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);

    // End date is Sunday of the same week
    const endDate = new Date(weekStart);
    endDate.setDate(weekStart.getDate() + 7);
    endDate.setHours(0, 0, 0, 0);

    console.log(`Week Start (Local): ${weekStart.toISOString().split('T')[0]} (${weekStart.toLocaleDateString('en-US', { weekday: 'long' })})`);
    console.log(`Week End (Local): ${endDate.toISOString().split('T')[0]} (${endDate.toLocaleDateString('en-US', { weekday: 'long' })})`);

    // UTC+7 conversion for bucket generation
    const utc7WeekStart = new Date(weekStart.getTime() + 7 * 60 * 60 * 1000);
    console.log(`UTC+7 Week Start: ${utc7WeekStart.toISOString().split('T')[0]} (${utc7WeekStart.toLocaleDateString('en-US', { weekday: 'long' })})`);

    // Generate bucket labels
    const bucketLabels = [];
    const pad2 = (n) => String(n).padStart(2, '0');

    for (let i = 0; i < 7; i++) {
        const d = new Date(utc7WeekStart.getTime() + i * 24 * 3600 * 1000);
        bucketLabels.push(`${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`);
    }

    console.log(`Bucket Labels: [${bucketLabels.join(', ')}]`);

    // Query range calculation
    const queryStart = new Date(weekStart.getTime() - 7 * 60 * 60 * 1000);
    const queryEnd = new Date(endDate.getTime() - 7 * 60 * 60 * 1000);

    console.log(`Query Range: ${queryStart.toISOString()} to ${queryEnd.toISOString()}`);
    console.log(`Query Range (Local): ${queryStart.toLocaleString()} to ${queryEnd.toLocaleString()}`);
    console.log('✅ Test completed\n');
};

// Run the tests
testWeekMode();