import { Router } from 'express';
import { ServiceCategoryModel } from '../models/ServiceCategory';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';

const router = Router();

/**
 * GET /api/categories
 * Get all service categories
 */
router.get('/', async (_req, res) => {
  try {
    const categories = await ServiceCategoryModel.findAll();
    return res.json({
      status: 'success',
      data: categories,
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * GET /api/categories/:id
 * Get category by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const category = await ServiceCategoryModel.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        status: 'error',
        message: 'Category not found',
      });
    }
    return res.json({
      status: 'success',
      data: category,
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * POST /api/categories
 * Create a new category (Admin only)
 */
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN),
  async (req, res) => {
    try {
      const { name, description, icon } = req.body;
      const category = await ServiceCategoryModel.create(name, description, icon);
      return res.status(201).json({
        status: 'success',
        data: category,
      });
    } catch (error: any) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }
  }
);

/**
 * PUT /api/categories/:id
 * Update category (Admin only)
 */
router.put(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  async (req, res) => {
    try {
      const { name, description, icon } = req.body;
      const category = await ServiceCategoryModel.update(
        req.params.id,
        name,
        description,
        icon
      );
      if (!category) {
        return res.status(404).json({
          status: 'error',
          message: 'Category not found',
        });
      }
      return res.json({
        status: 'success',
        data: category,
      });
    } catch (error: any) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }
  }
);

/**
 * DELETE /api/categories/:id
 * Delete category (Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  async (req, res) => {
    try {
      const deleted = await ServiceCategoryModel.delete(req.params.id);
      if (!deleted) {
        return res.status(404).json({
          status: 'error',
          message: 'Category not found',
        });
      }
      return res.json({
        status: 'success',
        message: 'Category deleted successfully',
      });
    } catch (error: any) {
      return res.status(500).json({
        status: 'error',
        message: error.message,
      });
    }
  }
);

export default router;
