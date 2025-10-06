import Dexie, { Table } from 'dexie';

// Define the database schema
export interface Student {
  id: string;
  student_id: string;
  name: string;
  roll_number: string;
  class: string;
  section?: string;
  contact?: string;
  address?: string;
  total_fee?: number;
  fee_paid?: number;
  attendance_percentage?: number;
  remarks?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  // Offline sync fields
  _offline_created?: boolean;
  _offline_updated?: boolean;
  _offline_deleted?: boolean;
  _sync_pending?: boolean;
  _last_sync?: string;
}

export interface FeePayment {
  id: string;
  student_id: string;
  amount: number;
  payment_date: string;
  payment_method?: string;
  remarks?: string;
  created_at: string;
  created_by: string;
  // Offline sync fields
  _offline_created?: boolean;
  _offline_updated?: boolean;
  _offline_deleted?: boolean;
  _sync_pending?: boolean;
  _last_sync?: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  date: string;
  status: string;
  remarks?: string;
  created_at: string;
  created_by: string;
  // Offline sync fields
  _offline_created?: boolean;
  _offline_updated?: boolean;
  _offline_deleted?: boolean;
  _sync_pending?: boolean;
  _last_sync?: string;
}

export interface SyncQueue {
  id?: number;
  table: string;
  record_id: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: string;
  retry_count: number;
}

export class OfflineDatabase extends Dexie {
  students!: Table<Student>;
  feePayments!: Table<FeePayment>;
  attendanceRecords!: Table<AttendanceRecord>;
  syncQueue!: Table<SyncQueue>;

  constructor() {
    super('ChampDatabaseOffline');
    
    this.version(1).stores({
      students: 'id, student_id, roll_number, class, section, created_at, _sync_pending',
      feePayments: 'id, student_id, payment_date, created_at, _sync_pending',
      attendanceRecords: 'id, student_id, date, created_at, _sync_pending',
      syncQueue: '++id, table, record_id, operation, timestamp, retry_count'
    });

    // Add hooks for automatic sync tracking
    this.students.hook('creating', (primKey, obj, trans) => {
      (obj as any)._offline_created = true;
      (obj as any)._sync_pending = true;
      (obj as any)._last_sync = new Date().toISOString();
    });

    this.students.hook('updating', (modifications, primKey, obj, trans) => {
      (modifications as any)._offline_updated = true;
      (modifications as any)._sync_pending = true;
      (modifications as any)._last_sync = new Date().toISOString();
    });

    this.feePayments.hook('creating', (primKey, obj, trans) => {
      (obj as any)._offline_created = true;
      (obj as any)._sync_pending = true;
      (obj as any)._last_sync = new Date().toISOString();
    });

    this.feePayments.hook('updating', (modifications, primKey, obj, trans) => {
      (modifications as any)._offline_updated = true;
      (modifications as any)._sync_pending = true;
      (modifications as any)._last_sync = new Date().toISOString();
    });

    this.attendanceRecords.hook('creating', (primKey, obj, trans) => {
      (obj as any)._offline_created = true;
      (obj as any)._sync_pending = true;
      (obj as any)._last_sync = new Date().toISOString();
    });

    this.attendanceRecords.hook('updating', (modifications, primKey, obj, trans) => {
      (modifications as any)._offline_updated = true;
      (modifications as any)._sync_pending = true;
      (modifications as any)._last_sync = new Date().toISOString();
    });
  }

  // Helper methods for sync operations
  async getPendingSyncRecords() {
    const pendingStudents = await this.students.where('_sync_pending').equals(1).toArray();
    const pendingPayments = await this.feePayments.where('_sync_pending').equals(1).toArray();
    const pendingAttendance = await this.attendanceRecords.where('_sync_pending').equals(1).toArray();
    
    return {
      students: pendingStudents,
      payments: pendingPayments,
      attendance: pendingAttendance
    };
  }

  async markAsSynced(table: string, recordId: string) {
    const tableRef = this.table(table as any);
    await tableRef.update(recordId, {
      _sync_pending: 0,
      _last_sync: new Date().toISOString()
    });
  }

  async addToSyncQueue(table: string, recordId: string, operation: 'create' | 'update' | 'delete', data: any) {
    await this.syncQueue.add({
      table,
      record_id: recordId,
      operation,
      data,
      timestamp: new Date().toISOString(),
      retry_count: 0
    });
  }

  async getSyncQueue() {
    return await this.syncQueue.orderBy('timestamp').toArray();
  }

  async clearSyncQueue() {
    await this.syncQueue.clear();
  }
}

// Create and export the database instance
export const offlineDb = new OfflineDatabase();
