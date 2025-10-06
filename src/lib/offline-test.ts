// Test file for offline functionality
import { offlineDb } from './offline-db';
import { dataService } from './data-service';
import { syncService } from './sync-service';

export const testOfflineFunctionality = async () => {
  console.log('🧪 Testing offline functionality...');

  try {
    // Test 1: Create a test student offline
    console.log('📝 Creating test student...');
    const testStudent = await dataService.createStudent({
      student_id: 'TEST001',
      name: 'Test Student',
      roll_number: 'TEST001',
      class: 'Test Class',
      section: 'A',
      contact: '1234567890',
      address: 'Test Address',
      total_fee: 1000,
      fee_paid: 0,
      attendance_percentage: 0,
      remarks: 'Test student for offline functionality',
      created_by: 'test-user-id'
    });

    console.log('✅ Test student created:', testStudent);

    // Test 2: Create a test payment offline
    console.log('💰 Creating test payment...');
    const testPayment = await dataService.createFeePayment({
      student_id: testStudent.id,
      amount: 500,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'Cash',
      remarks: 'Test payment for offline functionality',
      created_by: 'test-user-id'
    });

    console.log('✅ Test payment created:', testPayment);

    // Test 3: Create a test attendance record offline
    console.log('📅 Creating test attendance record...');
    const testAttendance = await dataService.createAttendanceRecord({
      student_id: testStudent.id,
      date: new Date().toISOString().split('T')[0],
      status: 'Present',
      remarks: 'Test attendance for offline functionality',
      created_by: 'test-user-id'
    });

    console.log('✅ Test attendance record created:', testAttendance);

    // Test 4: Verify data is stored offline
    console.log('🔍 Verifying offline data...');
    const students = await dataService.getStudents();
    const payments = await dataService.getFeePayments();
    const attendance = await dataService.getAttendanceRecords();

    console.log('📊 Offline data summary:');
    console.log(`- Students: ${students.length}`);
    console.log(`- Payments: ${payments.length}`);
    console.log(`- Attendance: ${attendance.length}`);

    // Test 5: Check sync status
    console.log('🔄 Checking sync status...');
    const syncStatus = syncService.getStatus();
    console.log('📡 Sync status:', syncStatus);

    // Test 6: Get pending sync records
    console.log('⏳ Getting pending sync records...');
    const pendingRecords = await offlineDb.getPendingSyncRecords();
    console.log('📋 Pending records:', pendingRecords);

    console.log('🎉 Offline functionality test completed successfully!');
    
    return {
      success: true,
      testStudent,
      testPayment,
      testAttendance,
      studentsCount: students.length,
      paymentsCount: payments.length,
      attendanceCount: attendance.length,
      syncStatus,
      pendingRecords
    };

  } catch (error) {
    console.error('❌ Offline functionality test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Export for use in browser console
(window as any).testOfflineFunctionality = testOfflineFunctionality;
