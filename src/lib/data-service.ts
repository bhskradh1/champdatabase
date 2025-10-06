import { supabase } from '@/integrations/supabase/client';
import { offlineDb, Student, FeePayment, AttendanceRecord } from './offline-db';
import { syncService } from './sync-service';

export interface DataServiceConfig {
  useOffline: boolean;
  autoSync: boolean;
}

class DataService {
  private config: DataServiceConfig = {
    useOffline: true,
    autoSync: true
  };

  constructor() {
    // Initialize with current online status
    this.config.useOffline = !navigator.onLine;
  }

  // Student operations
  async getStudents(): Promise<Student[]> {
    if (this.config.useOffline || !navigator.onLine) {
      return await offlineDb.students.orderBy('created_at').toArray();
    }

    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch students online, falling back to offline:', error);
      return await offlineDb.students.orderBy('created_at').toArray();
    }
  }

  async createStudent(student: Omit<Student, 'id' | 'created_at' | 'updated_at'>): Promise<Student> {
    const newStudent: Student = {
      ...student,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      _offline_created: true,
      _sync_pending: 1,
      _last_sync: new Date().toISOString()
    };

    // Always save to offline database first
    await offlineDb.students.add(newStudent);

    // If online, try to sync immediately
    if (navigator.onLine && this.config.autoSync) {
      try {
        const { data, error } = await supabase
          .from('students')
          .insert({
            id: newStudent.id,
            student_id: newStudent.student_id,
            name: newStudent.name,
            roll_number: newStudent.roll_number,
            class: newStudent.class,
            section: newStudent.section,
            contact: newStudent.contact,
            address: newStudent.address,
            total_fee: newStudent.total_fee,
            fee_paid: newStudent.fee_paid,
            attendance_percentage: newStudent.attendance_percentage,
            remarks: newStudent.remarks,
            created_by: newStudent.created_by
          })
          .select()
          .single();

        if (error) throw error;

        // Mark as synced
        await offlineDb.markAsSynced('students', newStudent.id);
        return { ...newStudent, _sync_pending: 0 };
      } catch (error) {
        console.error('Failed to sync student creation:', error);
        // Student is saved offline, will sync later
      }
    }

    return newStudent;
  }

  async updateStudent(id: string, updates: Partial<Student>): Promise<Student> {
    const updatedStudent = {
      ...updates,
      id,
      updated_at: new Date().toISOString(),
      _offline_updated: true,
      _sync_pending: 1,
      _last_sync: new Date().toISOString()
    };

    // Update offline database
    await offlineDb.students.update(id, updatedStudent);

    // If online, try to sync immediately
    if (navigator.onLine && this.config.autoSync) {
      try {
        const { error } = await supabase
          .from('students')
          .update({
            name: updatedStudent.name,
            roll_number: updatedStudent.roll_number,
            class: updatedStudent.class,
            section: updatedStudent.section,
            contact: updatedStudent.contact,
            address: updatedStudent.address,
            total_fee: updatedStudent.total_fee,
            fee_paid: updatedStudent.fee_paid,
            attendance_percentage: updatedStudent.attendance_percentage,
            remarks: updatedStudent.remarks,
            updated_at: updatedStudent.updated_at
          })
          .eq('id', id);

        if (error) throw error;

        // Mark as synced
        await offlineDb.markAsSynced('students', id);
        return { ...updatedStudent, _sync_pending: 0 };
      } catch (error) {
        console.error('Failed to sync student update:', error);
        // Update is saved offline, will sync later
      }
    }

    return updatedStudent as Student;
  }

  async deleteStudent(id: string): Promise<void> {
    // Mark as deleted in offline database
    await offlineDb.students.update(id, {
      _offline_deleted: true,
      _sync_pending: 1,
      _last_sync: new Date().toISOString()
    });

    // If online, try to sync immediately
    if (navigator.onLine && this.config.autoSync) {
      try {
        const { error } = await supabase
          .from('students')
          .delete()
          .eq('id', id);

        if (error) throw error;

        // Remove from offline database
        await offlineDb.students.delete(id);
      } catch (error) {
        console.error('Failed to sync student deletion:', error);
        // Deletion is queued offline, will sync later
      }
    }
  }

  // Fee Payment operations
  async getFeePayments(studentId?: string): Promise<FeePayment[]> {
    if (this.config.useOffline || !navigator.onLine) {
      if (studentId) {
        return await offlineDb.feePayments
          .where('student_id')
          .equals(studentId)
          .orderBy('created_at')
          .toArray();
      }
      return await offlineDb.feePayments.orderBy('created_at').toArray();
    }

    try {
      let query = supabase.from('fee_payments').select('*');
      
      if (studentId) {
        query = query.eq('student_id', studentId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch payments online, falling back to offline:', error);
      if (studentId) {
        return await offlineDb.feePayments
          .where('student_id')
          .equals(studentId)
          .orderBy('created_at')
          .toArray();
      }
      return await offlineDb.feePayments.orderBy('created_at').toArray();
    }
  }

  async createFeePayment(payment: Omit<FeePayment, 'id' | 'created_at'>): Promise<FeePayment> {
    const newPayment: FeePayment = {
      ...payment,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      _offline_created: true,
      _sync_pending: 1,
      _last_sync: new Date().toISOString()
    };

    // Always save to offline database first
    await offlineDb.feePayments.add(newPayment);

    // If online, try to sync immediately
    if (navigator.onLine && this.config.autoSync) {
      try {
        const { data, error } = await supabase
          .from('fee_payments')
          .insert({
            id: newPayment.id,
            student_id: newPayment.student_id,
            amount: newPayment.amount,
            payment_date: newPayment.payment_date,
            payment_method: newPayment.payment_method,
            remarks: newPayment.remarks,
            created_by: newPayment.created_by
          })
          .select()
          .single();

        if (error) throw error;

        // Mark as synced
        await offlineDb.markAsSynced('feePayments', newPayment.id);
        return { ...newPayment, _sync_pending: 0 };
      } catch (error) {
        console.error('Failed to sync payment creation:', error);
        // Payment is saved offline, will sync later
      }
    }

    return newPayment;
  }

  // Attendance operations
  async getAttendanceRecords(studentId?: string, date?: string): Promise<AttendanceRecord[]> {
    if (this.config.useOffline || !navigator.onLine) {
      let query = offlineDb.attendanceRecords.orderBy('created_at');
      
      if (studentId) {
        query = offlineDb.attendanceRecords
          .where('student_id')
          .equals(studentId)
          .orderBy('created_at');
      }
      
      return await query.toArray();
    }

    try {
      let query = supabase.from('attendance_records').select('*');
      
      if (studentId) {
        query = query.eq('student_id', studentId);
      }
      
      if (date) {
        query = query.eq('date', date);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch attendance online, falling back to offline:', error);
      let query = offlineDb.attendanceRecords.orderBy('created_at');
      
      if (studentId) {
        query = offlineDb.attendanceRecords
          .where('student_id')
          .equals(studentId)
          .orderBy('created_at');
      }
      
      return await query.toArray();
    }
  }

  async createAttendanceRecord(record: Omit<AttendanceRecord, 'id' | 'created_at'>): Promise<AttendanceRecord> {
    const newRecord: AttendanceRecord = {
      ...record,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      _offline_created: true,
      _sync_pending: 1,
      _last_sync: new Date().toISOString()
    };

    // Always save to offline database first
    await offlineDb.attendanceRecords.add(newRecord);

    // If online, try to sync immediately
    if (navigator.onLine && this.config.autoSync) {
      try {
        const { data, error } = await supabase
          .from('attendance_records')
          .insert({
            id: newRecord.id,
            student_id: newRecord.student_id,
            date: newRecord.date,
            status: newRecord.status,
            remarks: newRecord.remarks,
            created_by: newRecord.created_by
          })
          .select()
          .single();

        if (error) throw error;

        // Mark as synced
        await offlineDb.markAsSynced('attendanceRecords', newRecord.id);
        return { ...newRecord, _sync_pending: 0 };
      } catch (error) {
        console.error('Failed to sync attendance creation:', error);
        // Record is saved offline, will sync later
      }
    }

    return newRecord;
  }

  // Sync operations
  async syncAllData() {
    if (navigator.onLine) {
      await syncService.syncAllData();
    }
  }

  async downloadAllData() {
    if (navigator.onLine) {
      await syncService.downloadAllData();
    }
  }

  // Configuration
  setConfig(config: Partial<DataServiceConfig>) {
    this.config = { ...this.config, ...config };
  }

  getConfig(): DataServiceConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const dataService = new DataService();
