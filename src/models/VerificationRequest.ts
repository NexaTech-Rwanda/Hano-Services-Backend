import pool from '../config/database';
import { VerificationStatus } from '../types';

export interface VerificationRequest {
  id: string;
  providerId: string;
  idDocument?: string;
  certificates?: string[];
  references?: string[];
  status: VerificationStatus;
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class VerificationRequestModel {
  /**
   * Create a verification request
   */
  static async create(
    providerId: string,
    data: {
      idDocument?: string;
      certificates?: string[];
      references?: string[];
    }
  ): Promise<VerificationRequest> {
    const result = await pool.query(
      `INSERT INTO verification_requests (
        provider_id, id_document, certificates, provider_references
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [
        providerId,
        data.idDocument || null,
        data.certificates || [],
        data.references || [],
      ]
    );

    return this.mapRowToRequest(result.rows[0]);
  }

  /**
   * Find verification request by ID
   */
  static async findById(id: string): Promise<VerificationRequest | null> {
    const result = await pool.query(
      'SELECT * FROM verification_requests WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToRequest(result.rows[0]);
  }

  /**
   * Find verification request by provider ID
   */
  static async findByProviderId(
    providerId: string
  ): Promise<VerificationRequest | null> {
    const result = await pool.query(
      `SELECT * FROM verification_requests
       WHERE provider_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [providerId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToRequest(result.rows[0]);
  }

  /**
   * Get all pending verification requests
   */
  static async findPending(): Promise<VerificationRequest[]> {
    const result = await pool.query(
      `SELECT * FROM verification_requests
       WHERE status = 'pending'
       ORDER BY created_at ASC`
    );

    return result.rows.map((row) => this.mapRowToRequest(row));
  }

  /**
   * Get all verification requests by status
   */
  static async findByStatus(
    status: VerificationStatus
  ): Promise<VerificationRequest[]> {
    const result = await pool.query(
      `SELECT * FROM verification_requests
       WHERE status = $1
       ORDER BY created_at DESC`,
      [status]
    );

    return result.rows.map((row) => this.mapRowToRequest(row));
  }

  /**
   * Get all verification requests
   */
  static async findAll(): Promise<VerificationRequest[]> {
    const result = await pool.query(
      `SELECT * FROM verification_requests
       ORDER BY created_at DESC`
    );

    return result.rows.map((row) => this.mapRowToRequest(row));
  }

  /**
   * Update verification request status (Admin only)
   */
  static async updateStatus(
    id: string,
    status: VerificationStatus,
    adminId: string,
    adminNotes?: string
  ): Promise<VerificationRequest | null> {
    const result = await pool.query(
      `UPDATE verification_requests
       SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP,
           admin_notes = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, adminId, adminNotes || null, id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToRequest(result.rows[0]);
  }

  private static mapRowToRequest(row: any): VerificationRequest {
    return {
      id: row.id,
      providerId: row.provider_id,
      idDocument: row.id_document,
      certificates: row.certificates || [],
      references: row.provider_references || [],
      status: row.status as VerificationStatus,
      adminNotes: row.admin_notes,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
