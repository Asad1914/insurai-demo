import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { validatePlanQuery } from '../middleware/validation.js';

const router = express.Router();

/**
 * GET /api/plans
 * Fetch insurance plans with filtering
 * Query params: type, state_id, max_deductible, max_cost, min_coverage, coverage_type
 */
router.get('/', authenticateToken, validatePlanQuery, async (req, res) => {
  try {
    const {
      type,
      state_id,
      max_deductible,
      max_cost,
      min_coverage,
      coverage_type,
      limit = 50,
      offset = 0
    } = req.query;

    // Use user's state if not specified
    const filterStateId = state_id || req.user.state_id;

    // Build dynamic query
    let queryText = `
      SELECT p.*, pr.name as provider_name, pr.logo_url, s.state_name, s.state_code
      FROM plans p
      JOIN providers pr ON p.provider_id = pr.id
      LEFT JOIN states s ON p.state_id = s.id
      WHERE p.is_active = true
    `;

    const queryParams = [];
    let paramCount = 1;

    // Filter by state
    if (filterStateId) {
      queryText += ` AND p.state_id = $${paramCount}`;
      queryParams.push(filterStateId);
      paramCount++;
    }

    // Filter by plan type
    if (type) {
      queryText += ` AND p.plan_type = $${paramCount}`;
      queryParams.push(type);
      paramCount++;
    }

    // Filter by max deductible
    if (max_deductible) {
      queryText += ` AND p.deductible <= $${paramCount}`;
      queryParams.push(parseFloat(max_deductible));
      paramCount++;
    }

    // Filter by max cost
    if (max_cost) {
      queryText += ` AND p.monthly_cost <= $${paramCount}`;
      queryParams.push(parseFloat(max_cost));
      paramCount++;
    }

    // Filter by minimum coverage
    if (min_coverage) {
      queryText += ` AND p.max_coverage >= $${paramCount}`;
      queryParams.push(parseFloat(min_coverage));
      paramCount++;
    }

    // Filter by coverage type
    if (coverage_type) {
      queryText += ` AND p.coverage_type ILIKE $${paramCount}`;
      queryParams.push(`%${coverage_type}%`);
      paramCount++;
    }

    // Add ordering
    queryText += ` ORDER BY p.monthly_cost ASC`;

    // Add pagination
    queryText += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(parseInt(limit), parseInt(offset));

    // Execute query
    const result = await query(queryText, queryParams);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM plans p
      WHERE p.is_active = true
    `;
    const countParams = [];
    let countParamNum = 1;

    if (filterStateId) {
      countQuery += ` AND p.state_id = $${countParamNum}`;
      countParams.push(filterStateId);
      countParamNum++;
    }

    if (type) {
      countQuery += ` AND p.plan_type = $${countParamNum}`;
      countParams.push(type);
      countParamNum++;
    }

    if (max_deductible) {
      countQuery += ` AND p.deductible <= $${countParamNum}`;
      countParams.push(parseFloat(max_deductible));
      countParamNum++;
    }

    if (max_cost) {
      countQuery += ` AND p.monthly_cost <= $${countParamNum}`;
      countParams.push(parseFloat(max_cost));
      countParamNum++;
    }

    if (min_coverage) {
      countQuery += ` AND p.max_coverage >= $${countParamNum}`;
      countParams.push(parseFloat(min_coverage));
      countParamNum++;
    }

    if (coverage_type) {
      countQuery += ` AND p.coverage_type ILIKE $${countParamNum}`;
      countParams.push(`%${coverage_type}%`);
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      plans: result.rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: parseInt(offset) + result.rows.length < total
      },
      filters_applied: {
        state_id: filterStateId,
        type,
        max_deductible,
        max_cost,
        min_coverage,
        coverage_type
      }
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Failed to fetch insurance plans' });
  }
});

/**
 * GET /api/plans/:id
 * Get a specific plan by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT p.*, pr.name as provider_name, pr.logo_url, pr.description as provider_description,
              s.state_name, s.state_code
       FROM plans p
       JOIN providers pr ON p.provider_id = pr.id
       LEFT JOIN states s ON p.state_id = s.id
       WHERE p.id = $1 AND p.is_active = true`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json({ plan: result.rows[0] });
  } catch (error) {
    console.error('Error fetching plan:', error);
    res.status(500).json({ error: 'Failed to fetch plan details' });
  }
});

/**
 * GET /api/plans/types
 * Get all available plan types
 */
router.get('/meta/types', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT DISTINCT plan_type FROM plans WHERE is_active = true ORDER BY plan_type`
    );

    res.json({
      types: result.rows.map(row => row.plan_type)
    });
  } catch (error) {
    console.error('Error fetching plan types:', error);
    res.status(500).json({ error: 'Failed to fetch plan types' });
  }
});

export default router;
