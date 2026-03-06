import { Router } from 'express';
import { ServiceCategoryModel } from '../models/ServiceCategory';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';
import { upload } from '../middleware/upload';
import crypto from 'crypto';
import path from 'path';
import { StorageService } from '../services/storage.service';

const router = Router();

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all service categories
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: List of all categories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ServiceCategory'
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
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   $ref: '#/components/schemas/ServiceCategory'
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a new category (Admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Plumbing"
 *               description:
 *                 type: string
 *                 example: "Plumbing services and repairs"
 *               icon:
 *                 type: string
 *                 format: binary
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Plumbing"
 *               description:
 *                 type: string
 *                 example: "Plumbing services and repairs"
 *               icon:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   $ref: '#/components/schemas/ServiceCategory'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN),
  upload.single('icon'),
  async (req, res) => {
    try {
      const uploadedIcon = (req as any).file as Express.Multer.File | undefined;
      const { name, description, icon } = req.body;

      const category = await ServiceCategoryModel.create(
        name,
        description,
        uploadedIcon ? undefined : icon
      );

      if (uploadedIcon) {
        if (!uploadedIcon.mimetype?.toLowerCase().startsWith('image/')) {
          return res.status(400).json({
            status: 'error',
            message: 'Uploaded icon must be an image',
          });
        }

        const ext = path.extname(uploadedIcon.originalname || '').toLowerCase();
        const namePart = crypto.randomBytes(8).toString('hex');
        const filePath = `categories/${category.id}/icon-${Date.now()}-${namePart}${ext}`;
        const { url } = await StorageService.uploadImage({
          path: filePath,
          contentType: uploadedIcon.mimetype,
          file: uploadedIcon.buffer,
        });

        const updated = await ServiceCategoryModel.update(category.id, undefined, undefined, url);
        if (updated) {
          return res.status(201).json({
            status: 'success',
            data: updated,
          });
        }
      }
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
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Update category (Admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Plumbing"
 *               description:
 *                 type: string
 *                 example: "Plumbing services and repairs"
 *               icon:
 *                 type: string
 *                 format: binary
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Plumbing"
 *               description:
 *                 type: string
 *                 example: "Plumbing services and repairs"
 *               icon:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   $ref: '#/components/schemas/ServiceCategory'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  upload.single('icon'),
  async (req, res) => {
    try {
      const uploadedIcon = (req as any).file as Express.Multer.File | undefined;
      const { name, description, icon } = req.body;

      let finalIcon = icon;
      if (uploadedIcon) {
        if (!uploadedIcon.mimetype?.toLowerCase().startsWith('image/')) {
          return res.status(400).json({
            status: 'error',
            message: 'Uploaded icon must be an image',
          });
        }

        const existing = await ServiceCategoryModel.findById(req.params.id);
        if (!existing) {
          return res.status(404).json({
            status: 'error',
            message: 'Category not found',
          });
        }

        const ext = path.extname(uploadedIcon.originalname || '').toLowerCase();
        const namePart = crypto.randomBytes(8).toString('hex');
        const filePath = `categories/${req.params.id}/icon-${Date.now()}-${namePart}${ext}`;
        const { url } = await StorageService.uploadImage({
          path: filePath,
          contentType: uploadedIcon.mimetype,
          file: uploadedIcon.buffer,
        });
        finalIcon = url;
      }

      const category = await ServiceCategoryModel.update(req.params.id, name, description, finalIcon);
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
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete category (Admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Category deleted successfully"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
