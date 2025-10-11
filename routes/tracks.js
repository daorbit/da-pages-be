import express from 'express';
import { body, param, validationResult } from 'express-validator';
import Track from '../models/Track.js';

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

// Validation rules for creating/updating tracks
const trackValidationRules = [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title cannot be more than 200 characters'),

  body('author')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Author cannot be more than 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot be more than 500 characters'),

  body('duration')
    .optional()
    .trim(),

  body('listeners')
    .optional()
    .trim(),

  body('date')
    .optional()
    .trim(),

  body('thumbnail')
    .optional()
    .trim()
    .isURL()
    .withMessage('Thumbnail must be a valid URL'),

  body('category')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Category cannot be more than 50 characters'),

  body('audioUrl')
    .optional()
    .trim()
    .isURL()
    .withMessage('Audio URL must be a valid URL'),

  body('playlists')
    .optional()
    .isArray()
    .withMessage('Playlists must be an array')
    .custom((value) => {
      if (value && value.length > 0) {
        // Validate each playlist ID is a valid MongoDB ObjectId
        for (const playlistId of value) {
          if (!/^[0-9a-fA-F]{24}$/.test(playlistId)) {
            throw new Error('Invalid playlist ID format');
          }
        }
      }
      return true;
    })
];

// GET /api/tracks - Get all tracks
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, category, author, search } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    let query = {};

    if (category) {
      query.category = category;
    }

    if (author) {
      query.author = { $regex: author, $options: 'i' };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    // Get tracks with pagination
    const tracks = await Track.find(query)
      .populate('playlists')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Track.countDocuments(query);

    res.json({
      success: true,
      data: {
        tracks,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching tracks:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tracks',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/tracks/:id - Get a single track by ID
router.get('/:id',
  param('id').isMongoId().withMessage('Invalid track ID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      const track = await Track.findById(id).populate('playlists');

      if (!track) {
        return res.status(404).json({
          success: false,
          message: 'Track not found'
        });
      }

      res.json({
        success: true,
        data: track
      });
    } catch (error) {
      console.error('Error fetching track:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching track',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// POST /api/tracks - Create a new track
router.post('/',
  trackValidationRules,
  handleValidationErrors,
  async (req, res) => {
    try {
      const trackData = req.body;

      const track = new Track(trackData);
      await track.save();

      // Add track to playlists if playlistIds are provided
      if (trackData.playlists && trackData.playlists.length > 0) {
        const Playlist = (await import('../models/Playlist.js')).default;
        for (const playlistId of trackData.playlists) {
          try {
            await Playlist.findByIdAndUpdate(
              playlistId,
              { $addToSet: { tracks: track._id } } // $addToSet prevents duplicates
            );
          } catch (playlistError) {
            console.error(`Error adding track to playlist ${playlistId}:`, playlistError);
            // Continue with other playlists
          }
        }
      }

      res.status(201).json({
        success: true,
        message: 'Track created successfully',
        data: track
      });
    } catch (error) {
      console.error('Error creating track:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating track',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// PUT /api/tracks/:id - Update a track
router.put('/:id',
  param('id').isMongoId().withMessage('Invalid track ID'),
  trackValidationRules,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Get the current track to compare playlists
      const currentTrack = await Track.findById(id);
      if (!currentTrack) {
        return res.status(404).json({
          success: false,
          message: 'Track not found'
        });
      }

      const track = await Track.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      // Handle playlist changes
      if (updateData.playlists !== undefined) {
        const Playlist = (await import('../models/Playlist.js')).default;
        const oldPlaylists = currentTrack.playlists || [];
        const newPlaylists = updateData.playlists || [];

        // Remove track from playlists that are no longer selected
        const playlistsToRemove = oldPlaylists.filter(p => !newPlaylists.includes(p.toString()));
        for (const playlistId of playlistsToRemove) {
          try {
            await Playlist.findByIdAndUpdate(
              playlistId,
              { $pull: { tracks: id } }
            );
          } catch (playlistError) {
            console.error(`Error removing track from playlist ${playlistId}:`, playlistError);
          }
        }

        // Add track to new playlists
        const playlistsToAdd = newPlaylists.filter(p => !oldPlaylists.some(op => op.toString() === p));
        for (const playlistId of playlistsToAdd) {
          try {
            await Playlist.findByIdAndUpdate(
              playlistId,
              { $addToSet: { tracks: id } }
            );
          } catch (playlistError) {
            console.error(`Error adding track to playlist ${playlistId}:`, playlistError);
          }
        }
      }

      res.json({
        success: true,
        message: 'Track updated successfully',
        data: track
      });
    } catch (error) {
      console.error('Error updating track:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating track',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// DELETE /api/tracks/:id - Delete a track
router.delete('/:id',
  param('id').isMongoId().withMessage('Invalid track ID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      const track = await Track.findByIdAndDelete(id);

      if (!track) {
        return res.status(404).json({
          success: false,
          message: 'Track not found'
        });
      }

      res.json({
        success: true,
        message: 'Track deleted successfully',
        data: { id: track._id, title: track.title }
      });
    } catch (error) {
      console.error('Error deleting track:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting track',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

export default router;