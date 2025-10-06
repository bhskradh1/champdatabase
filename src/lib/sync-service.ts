import { supabase } from '@/integrations/supabase/client';
import { offlineDb, Student, FeePayment, AttendanceRecord } from './offline-db';

export interface SyncStatus {
  isOnline: boolean;
  lastSync: string | null;
  pendingChanges: number;
  isSyncing: boolean;
}

class SyncService {
  private isOnline = navigator.onLine;
  private syncInProgress = false;
  private syncListeners: ((status: SyncStatus) => void)[] = [];

  constructor() {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    if (this.isOnline) {
      this.startPeriodicSync();
    }
  }

  private handleOnline() {
    this.isOnline = true;
    this.startPeriodicSync();
    this.syncAllData();
    this.notifyListeners();
  }

  private handleOffline() {
    this.isOnline = false;
    this.notifyListeners();
  }

  private startPeriodicSync() {
    setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.syncAllData();
      }
    }, 30000);
  }

  public addSyncListener(listener: (status: SyncStatus) => void) {
    this.syncListeners.push(listener);
    return () => {
      const index = this.syncListeners.indexOf(listener);
      if (index > -1) this.syncListeners.splice(index, 1);
    };
  }

  private notifyListeners() {
    const status: SyncStatus = {
      isOnline: this.isOnline,
      lastSync: localStorage.getItem('lastSync'),
      pendingChanges: 0,
      isSyncing: this.syncInProgress
    };

    offlineDb.getPendingSyncRecords().then(pending => {
      status.pendingChanges = 
        pending.students.length + 
        pending.payments.length + 
        pending.attendance.length;

      this.syncListeners.forEach(listener => listener(status));
    });
  }

  public async syncAllData() {
    if (!this.isOnline || this.syncInProgress) return;

    this.syncInProgress = true;
    this.notifyListeners();

    try {
      await this.syncStudents();
      await this.syncFeePayments();
      await this.syncAttendanceRecords();

      localStorage.setItem('lastSync', new Date().toISOString());
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.syncInProgress = false;
      this.notifyListeners();
    }
  }

  private async syncStudents() {
    const pendingStudents = await offlineDb.students.where('_sync_pending').equals(true).toArray();

    for (const student of pendingStudents) {
      try {
        if (student._offline_created) {
          const { data, error } = await supabase
            .from('students')
            .insert({
              id: student.id,
              student_id: student.student_id,
              name: student.name,
              roll_number: student.roll_number,
              class: student.class,
              section: student.section,
              contact: student.contact,
              address: student.address,
              total_fee: student.total_fee,
              fee_paid: student.fee_paid,
              attendance_percentage: student.attendance_percentage,
              remarks: student.remarks,
              created_by: student.created_by
            })
            .select()
            .single();

          if (error) throw error;

          await offlineDb.markAsSynced('students', student.id);
        } else if (student._offline_updated) {
          const { error } = await supabase
            .from('students')
            .update({
              name: student.name,
              roll_number: student.roll_number,
              class: student.class,
              section: student.section,
              contact: student.contact,
              address: student.address,
              total_fee: student.total_fee,
              fee_paid: student.fee_paid,
              attendance_percentage: student.attendance_percentage,
              remarks: student.remarks,
              updated_at: new Date().toISOString()
            })
            .eq('id', student.id);

          if (error) throw error;

          await offlineDb.markAsSynced('students', student.id);
        }
      } catch (error) {
        console.error(`Failed to sync student ${student.id}:`, error);
      }
    }
  }

  private async syncFeePayments() {
    const pendingPayments = await offlineDb.feePayments.where('_sync_pending').equals(true).toArray();

    for (const payment of pendingPayments) {
      try {
        if (payment._offline_created) {
          const { data, error } = await supabase
            .from('fee_payments')
            .insert({
              id: payment.id,
              student_id: payment.student_id,
              amount: payment.amount,
              payment_date: payment.payment_date,
              payment_method: payment.payment_method,
              remarks: payment.remarks,
              created_by: payment.created_by
            })
            .select()
            .single();

          if (error) throw error;

          await offlineDb.markAsSynced('feePayments', payment.id);
        }
      } catch (error) {
        console.error(`Failed to sync payment ${payment.id}:`, error);
      }
    }
  }

  private async syncAttendanceRecords() {
    const pendingAttendance = await offlineDb.attendanceRecords.where('_sync_pending').equals(true).toArray();

    for (const record of pendingAttendance) {
      try {
        if (record._offline_created) {
          const { data, error } = await supabase
            .from('attendance_records')
            .insert({
              id: record.id,
              student_id: record.student_id,
              date: record.date,
              status: record.status,
              remarks: record.remarks,
              created_by: record.created_by
            })
            .select()
            .single();

          if (error) throw error;

          await offlineDb.markAsSynced('attendanceRecords', record.id);
        }
      } catch (error) {
        console.error(`Failed to sync attendance record ${record.id}:`, error);
      }
    }
  }

  public getStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      lastSync: localStorage.getItem('lastSync'),
      pendingChanges: 0,
      isSyncing: this.syncInProgress
    };
  }
}

export const syncService = new SyncService();
