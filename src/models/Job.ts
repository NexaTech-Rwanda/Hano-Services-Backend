import pool from '../config/database';

export type JobStatus = 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export interface Job {
  id: string;
  customerId: string;
  serviceCategoryId: string;
  title: string;
  description: string;
  budget: number;
  locationAddress?: string;
  latitude?: number;
  longitude?: number;
  deadline?: Date;
  status: JobStatus;
  assignedProviderId?: string;
  assignedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobWithDetails extends Job {
  categoryName?: string;
  customerName?: string;
  providerName?: string;
  distanceKm?: number;
}

export class JobModel {
  static async create(data: {
    customerId: string;
    serviceCategoryId: string;
    title: string;
    description: string;
    budget: number;
    locationAddress?: string;
    latitude?: number;
    longitude?: number;
    deadline?: Date;
  }): Promise<Job> {
    const result = await pool.query(
      `INSERT INTO jobs (customer_id, service_category_id, title, description, budget, location_address, latitude, longitude, deadline)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.customerId,
        data.serviceCategoryId,
        data.title,
        data.description,
        data.budget,
        data.locationAddress,
        data.latitude,
        data.longitude,
        data.deadline,
      ]
    );

    return JobModel.mapRowToJob(result.rows[0]);
  }

  static async findById(id: string): Promise<Job | null> {
    const result = await pool.query('SELECT * FROM jobs WHERE id = $1', [id]);
    return result.rows.length ? JobModel.mapRowToJob(result.rows[0]) : null;
  }

  static async update(
    id: string,
    data: Partial<{
      title: string;
      description: string;
      budget: number;
      locationAddress: string;
      latitude: number;
      longitude: number;
      deadline: Date;
      status: JobStatus;
      assignedProviderId: string;
      assignedAt: Date;
      completedAt: Date;
    }>
  ): Promise<Job | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(data.description);
    }
    if (data.budget !== undefined) {
      updates.push(`budget = $${paramCount++}`);
      values.push(data.budget);
    }
    if (data.locationAddress !== undefined) {
      updates.push(`location_address = $${paramCount++}`);
      values.push(data.locationAddress);
    }
    if (data.latitude !== undefined) {
      updates.push(`latitude = $${paramCount++}`);
      values.push(data.latitude);
    }
    if (data.longitude !== undefined) {
      updates.push(`longitude = $${paramCount++}`);
      values.push(data.longitude);
    }
    if (data.deadline !== undefined) {
      updates.push(`deadline = $${paramCount++}`);
      values.push(data.deadline);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(data.status);
    }
    if (data.assignedProviderId !== undefined) {
      updates.push(`assigned_provider_id = $${paramCount++}`);
      values.push(data.assignedProviderId);
    }
    if (data.assignedAt !== undefined) {
      updates.push(`assigned_at = $${paramCount++}`);
      values.push(data.assignedAt);
    }
    if (data.completedAt !== undefined) {
      updates.push(`completed_at = $${paramCount++}`);
      values.push(data.completedAt);
    }

    if (updates.length === 0) return JobModel.findById(id);

    values.push(id);
    const result = await pool.query(
      `UPDATE jobs SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows.length ? JobModel.mapRowToJob(result.rows[0]) : null;
  }

  static async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM jobs WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  static async findByCustomerId(customerId: string, filters?: {
    status?: JobStatus;
    limit?: number;
    offset?: number;
    cursor?: string;
  }): Promise<JobWithDetails[]> {
    const values: any[] = [customerId];
    let paramCount = 2;
    let query = `
      SELECT
        j.*,
        sc.name as category_name,
        u.username as customer_name,
        p.name as provider_name
      FROM jobs j
      LEFT JOIN service_categories sc ON j.service_category_id = sc.id
      LEFT JOIN users u ON j.customer_id = u.id
      LEFT JOIN providers p ON j.assigned_provider_id = p.id
      WHERE j.customer_id = $1
    `;

    const conditions: string[] = [];
    if (filters?.status) {
      conditions.push(`j.status = $${paramCount++}`);
      values.push(filters.status);
    }
    if (conditions.length) query += ' AND ' + conditions.join(' AND ');

    query += ' ORDER BY j.created_at DESC';

    if (filters?.limit) {
      query += ` LIMIT $${paramCount++}`;
      values.push(filters.limit);
    }

    const result = await pool.query(query, values);
    return result.rows.map(JobModel.mapRowToJobWithDetails);
  }

  static async listForProviders(filters: {
    serviceCategoryId?: string;
    latitude?: number;
    longitude?: number;
    maxDistanceKm?: number;
    minBudget?: number;
    maxBudget?: number;
    status?: JobStatus;
    limit?: number;
    offset?: number;
    cursor?: string;
  }): Promise<JobWithDetails[]> {
    const values: any[] = [];
    let paramCount = 1;
    const hasLocation = filters.latitude != null && filters.longitude != null;
    let userPointExpr = '';
    if (hasLocation) {
      const lonParam = paramCount++;
      values.push(filters.longitude);
      const latParam = paramCount++;
      values.push(filters.latitude);
      userPointExpr = `ST_SetSRID(ST_MakePoint($${lonParam}, $${latParam}), 4326)::geography`;
    }

    let query = `
      SELECT
        j.*,
        sc.name as category_name,
        u.username as customer_name,
        p.name as provider_name
    `;

    if (hasLocation) {
      query += `,
        (ST_Distance(j.geo_location, ${userPointExpr}) / 1000.0) as distance_km
      `;
    }

    query += `
      FROM jobs j
      LEFT JOIN service_categories sc ON j.service_category_id = sc.id
      LEFT JOIN users u ON j.customer_id = u.id
      LEFT JOIN providers p ON j.assigned_provider_id = p.id
      WHERE 1=1
    `;

    const conditions: string[] = [];
    if (filters.serviceCategoryId) {
      conditions.push(`j.service_category_id = $${paramCount++}`);
      values.push(filters.serviceCategoryId);
    }
    if (filters.status) {
      conditions.push(`j.status = $${paramCount++}`);
      values.push(filters.status);
    }
    if (filters.minBudget !== undefined) {
      conditions.push(`j.budget >= $${paramCount++}`);
      values.push(filters.minBudget);
    }
    if (filters.maxBudget !== undefined) {
      conditions.push(`j.budget <= $${paramCount++}`);
      values.push(filters.maxBudget);
    }
    if (hasLocation && filters.maxDistanceKm != null) {
      const maxDistanceMeters = filters.maxDistanceKm * 1000;
      conditions.push(`j.geo_location IS NOT NULL AND ST_DWithin(j.geo_location, ${userPointExpr}, $${paramCount++})`);
      values.push(maxDistanceMeters);
    }
    if (conditions.length) query += ' AND ' + conditions.join(' AND ');

    query += ' ORDER BY j.created_at DESC';

    if (filters.limit) {
      query += ` LIMIT $${paramCount++}`;
      values.push(filters.limit);
    }

    const result = await pool.query(query, values);
    return result.rows.map(JobModel.mapRowToJobWithDetails);
  }

  private static mapRowToJob(row: any): Job {
    return {
      id: row.id,
      customerId: row.customer_id,
      serviceCategoryId: row.service_category_id,
      title: row.title,
      description: row.description,
      budget: parseFloat(row.budget),
      locationAddress: row.location_address,
      latitude: row.latitude ? parseFloat(row.latitude) : undefined,
      longitude: row.longitude ? parseFloat(row.longitude) : undefined,
      deadline: row.deadline,
      status: row.status,
      assignedProviderId: row.assigned_provider_id,
      assignedAt: row.assigned_at,
      completedAt: row.completed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static mapRowToJobWithDetails(row: any): JobWithDetails {
    const job = JobModel.mapRowToJob(row);
    return {
      ...job,
      categoryName: row.category_name,
      customerName: row.customer_name,
      providerName: row.provider_name,
      distanceKm: row.distance_km ? parseFloat(row.distance_km) : undefined,
    };
  }
}
