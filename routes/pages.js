import express from 'express';
import { body, param, validationResult } from 'express-validator';
import Page from '../models/Page.js';

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Validation rules for creating/updating pages
const pageValidationRules = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot be more than 200 characters'),
  
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 500 })
    .withMessage('Description cannot be more than 500 characters'),
  
  body('imageUrl')
    .trim()
    .notEmpty()
    .withMessage('Image URL is required')
    .isURL()
    .withMessage('Image URL must be a valid URL'),
  
  body('thumbnailUrl')
    .trim()
    .notEmpty()
    .withMessage('Thumbnail URL is required')
    .isURL()
    .withMessage('Thumbnail URL must be a valid URL'),
  
  body('groups')
    .optional()
    .isArray()
    .withMessage('Groups must be an array')
    .custom((value) => {
      if (value && value.length > 10) {
        throw new Error('Cannot have more than 10 groups');
      }
      return true;
    }),
  
  body('editorType')
    .notEmpty()
    .withMessage('Editor type is required')
    .isIn(['markdown', 'wysiwyg'])
    .withMessage('Editor type must be either markdown or wysiwyg'),
  
  body('slug')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Slug cannot be more than 100 characters'),
  
  body('content')
    .notEmpty()
    .withMessage('Content is required')
];

// GET /api/pages - Get all pages
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, group, search } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    let query = {};
    
    if (group) {
      query.groups = { $in: [group] };
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    // Get pages with pagination
    const pages = await Page.find(query)
      .select('-content') // Exclude content for list view (performance)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Page.countDocuments(query);

    res.json({
      success: true,
      data: {
        pages,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching pages:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'Error fetching pages',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/pages/:slug - Get a single page by slug
router.get('/:slug', 
  param('slug').trim().notEmpty().withMessage('Slug is required'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { slug } = req.params;
      
      const page = await Page.findOne({ slug });
      
      if (!page) {
        return res.status(404).json({
          success: false,
          message: 'Page not found'
        });
      }

      res.json({
        success: true,
        data: page
      });
    } catch (error) {
      console.error('Error fetching page:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching page',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// POST /api/pages - Create a new page
router.post('/', 
  pageValidationRules,
  handleValidationErrors,
  async (req, res) => {
    try {
      const pageData = req.body;
      
      // Check if slug already exists
      if (pageData.slug) {
        const existingPage = await Page.findOne({ slug: pageData.slug });
        if (existingPage) {
          return res.status(400).json({
            success: false,
            message: 'A page with this slug already exists'
          });
        }
      }

      const page = new Page(pageData);
      await page.save();

      res.status(201).json({
        success: true,
        message: 'Page created successfully',
        data: page
      });
    } catch (error) {
      console.error('Error creating page:', error);
      
      // Handle duplicate slug error
      if (error.code === 11000 && error.keyPattern?.slug) {
        return res.status(400).json({
          success: false,
          message: 'A page with this slug already exists'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error creating page',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// PUT /api/pages/:id - Update a page
router.put('/:id',
  param('id').isMongoId().withMessage('Invalid page ID'),
  pageValidationRules,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Check if slug already exists (if updating slug)
      if (updateData.slug) {
        const existingPage = await Page.findOne({ 
          slug: updateData.slug, 
          _id: { $ne: id } 
        });
        if (existingPage) {
          return res.status(400).json({
            success: false,
            message: 'A page with this slug already exists'
          });
        }
      }

      const page = await Page.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!page) {
        return res.status(404).json({
          success: false,
          message: 'Page not found'
        });
      }

      res.json({
        success: true,
        message: 'Page updated successfully',
        data: page
      });
    } catch (error) {
      console.error('Error updating page:', error);
      
      // Handle duplicate slug error
      if (error.code === 11000 && error.keyPattern?.slug) {
        return res.status(400).json({
          success: false,
          message: 'A page with this slug already exists'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error updating page',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// DELETE /api/pages/:id - Delete a page
router.delete('/:id',
  param('id').isMongoId().withMessage('Invalid page ID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const page = await Page.findByIdAndDelete(id);
      
      if (!page) {
        return res.status(404).json({
          success: false,
          message: 'Page not found'
        });
      }

      res.json({
        success: true,
        message: 'Page deleted successfully',
        data: { id: page._id, title: page.title }
      });
    } catch (error) {
      console.error('Error deleting page:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting page',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// GET /api/pages/by-id/:id - Get a single page by ID (for admin editing)
router.get('/by-id/:id',
  param('id').isMongoId().withMessage('Invalid page ID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const page = await Page.findById(id);
      
      if (!page) {
        return res.status(404).json({
          success: false,
          message: 'Page not found'
        });
      }

      res.json({
        success: true,
        data: page
      });
    } catch (error) {
      console.error('Error fetching page by ID:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching page',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

export default router;