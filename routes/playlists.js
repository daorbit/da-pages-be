import express from 'express';
import { body, param, validationResult } from 'express-validator';
import Playlist from '../models/Playlist.js';

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

// Validation rules for creating/updating playlists
const playlistValidationRules = [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title cannot be more than 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot be more than 500 characters'),

  body('duration')
    .optional()
    .trim(),

  body('thumbnail')
    .optional()
    .trim()
    .isURL()
    .withMessage('Thumbnail must be a valid URL'),

  body('createdBy')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Created by cannot be more than 100 characters'),

  body('tracks')
    .optional()
    .isArray()
    .withMessage('Tracks must be an array')
    .custom((value) => {
      if (value && value.length > 0) {
        // Validate each track ID is a valid MongoDB ObjectId
        for (const trackId of value) {
          if (!/^[0-9a-fA-F]{24}$/.test(trackId)) {
            throw new Error('Invalid track ID format');
          }
        }
      }
      return true;
    }),

  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
    .custom((value) => {
      if (value && value.length > 20) {
        throw new Error('Cannot have more than 20 tags');
      }
      return true;
    })
];

// GET /api/playlists - Get all playlists
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, createdBy, isPublic, search, tag } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    let query = {};

    if (createdBy) {
      query.createdBy = createdBy;
    }

    if (isPublic !== undefined) {
      query.isPublic = isPublic === 'true';
    }

    if (tag) {
      query.tags = { $in: [tag] };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { createdBy: { $regex: search, $options: 'i' } }
      ];
    }

    // Get playlists with pagination and populate tracks
    const playlists = await Playlist.find(query)
      .populate('tracks')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Playlist.countDocuments(query);

    res.json({
      success: true,
      data: {
        playlists,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching playlists:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching playlists',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/playlists/:id - Get a single playlist by ID
router.get('/:id',
  param('id').isMongoId().withMessage('Invalid playlist ID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      const playlist = await Playlist.findById(id).populate('tracks');

      if (!playlist) {
        return res.status(404).json({
          success: false,
          message: 'Playlist not found'
        });
      }

      res.json({
        success: true,
        data: playlist
      });
    } catch (error) {
      console.error('Error fetching playlist:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching playlist',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// POST /api/playlists - Create a new playlist
router.post('/',
  playlistValidationRules,
  handleValidationErrors,
  async (req, res) => {
    try {
      const playlistData = req.body;

      const playlist = new Playlist(playlistData);
      await playlist.save();

      // Populate tracks in the response
      await playlist.populate('tracks');

      res.status(201).json({
        success: true,
        message: 'Playlist created successfully',
        data: playlist
      });
    } catch (error) {
      console.error('Error creating playlist:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating playlist',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// PUT /api/playlists/:id - Update a playlist
router.put('/:id',
  param('id').isMongoId().withMessage('Invalid playlist ID'),
  playlistValidationRules,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const playlist = await Playlist.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).populate('tracks');

      if (!playlist) {
        return res.status(404).json({
          success: false,
          message: 'Playlist not found'
        });
      }

      res.json({
        success: true,
        message: 'Playlist updated successfully',
        data: playlist
      });
    } catch (error) {
      console.error('Error updating playlist:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating playlist',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// DELETE /api/playlists/:id - Delete a playlist
router.delete('/:id',
  param('id').isMongoId().withMessage('Invalid playlist ID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      const playlist = await Playlist.findByIdAndDelete(id);

      if (!playlist) {
        return res.status(404).json({
          success: false,
          message: 'Playlist not found'
        });
      }

      res.json({
        success: true,
        message: 'Playlist deleted successfully',
        data: { id: playlist._id, title: playlist.title }
      });
    } catch (error) {
      console.error('Error deleting playlist:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting playlist',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// PUT /api/playlists/:id/tracks - Add tracks to playlist
router.put('/:id/tracks',
  param('id').isMongoId().withMessage('Invalid playlist ID'),
  body('trackIds').isArray().withMessage('Track IDs must be an array'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { trackIds } = req.body;

      // Validate track IDs
      for (const trackId of trackIds) {
        if (!/^[0-9a-fA-F]{24}$/.test(trackId)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid track ID format'
          });
        }
      }

      const playlist = await Playlist.findById(id);

      if (!playlist) {
        return res.status(404).json({
          success: false,
          message: 'Playlist not found'
        });
      }

      // Add tracks to playlist (avoid duplicates)
      for (const trackId of trackIds) {
        if (!playlist.tracks.includes(trackId)) {
          playlist.tracks.push(trackId);
        }
      }

      await playlist.save();
      await playlist.populate('tracks');

      res.json({
        success: true,
        message: 'Tracks added to playlist successfully',
        data: playlist
      });
    } catch (error) {
      console.error('Error adding tracks to playlist:', error);
      res.status(500).json({
        success: false,
        message: 'Error adding tracks to playlist',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// DELETE /api/playlists/:id/tracks/:trackId - Remove track from playlist
router.delete('/:id/tracks/:trackId',
  param('id').isMongoId().withMessage('Invalid playlist ID'),
  param('trackId').isMongoId().withMessage('Invalid track ID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id, trackId } = req.params;

      const playlist = await Playlist.findById(id);

      if (!playlist) {
        return res.status(404).json({
          success: false,
          message: 'Playlist not found'
        });
      }

      // Remove track from playlist
      playlist.tracks = playlist.tracks.filter(track => track.toString() !== trackId);

      await playlist.save();
      await playlist.populate('tracks');

      res.json({
        success: true,
        message: 'Track removed from playlist successfully',
        data: playlist
      });
    } catch (error) {
      console.error('Error removing track from playlist:', error);
      res.status(500).json({
        success: false,
        message: 'Error removing track from playlist',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

export default router;