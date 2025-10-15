import express from 'express';
import axios from 'axios';
import { authenticate } from '../middleware/index.js';

const router = express.Router();

// Sample API endpoints
router.get('/test', (req, res) => {
  res.json({
    message: 'API is working!',
    data: {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path
    }
  });
});

// Sample POST endpoint
router.post('/data', (req, res) => {
  const { body } = req;
  
  res.json({
    message: 'Data received successfully',
    receivedData: body,
    timestamp: new Date().toISOString()
  });
});

// Sample dynamic pages endpoint
router.get('/pages', (req, res) => {
  // This would typically fetch from a database
  const samplePages = [
    {
      id: 1,
      title: 'Home Page',
      slug: 'home',
      content: 'Welcome to our dynamic pages system',
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      title: 'About Page',
      slug: 'about',
      content: 'Learn more about our company',
      createdAt: new Date().toISOString()
    }
  ];

  res.json({
    message: 'Pages retrieved successfully',
    pages: samplePages,
    total: samplePages.length
  });
});

// Get specific page by ID
router.get('/pages/:id', (req, res) => {
  const { id } = req.params;
  
  // Sample page data - would typically come from database
  const page = {
    id: parseInt(id),
    title: `Page ${id}`,
    slug: `page-${id}`,
    content: `This is the content for page ${id}`,
    createdAt: new Date().toISOString()
  };

  res.json({
    message: 'Page retrieved successfully',
    page
  });
});

// Get uploaded images from Cloudinary
router.get('/images', async (req, res) => {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(500).json({
        error: 'Cloudinary configuration missing',
        message: 'Server configuration error'
      });
    }

    const { limit = 10, next_cursor } = req.query;

    const response = await axios.get(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/image`,
      {
        params: {
          max_results: parseInt(limit),
          next_cursor: next_cursor || undefined,
          type: 'upload'
        },
        auth: {
          username: apiKey,
          password: apiSecret
        }
      }
    );

    res.json({
      message: 'Images retrieved successfully',
      images: response.data.resources || [],
      next_cursor: response.data.next_cursor,
      has_more: !!response.data.next_cursor
    });
  } catch (error) {
    console.error('Failed to fetch images from Cloudinary:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to fetch images',
      message: error.response?.data?.message || 'Internal server error'
    });
  }
});

// Delete image from Cloudinary
router.delete('/images/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(500).json({
        error: 'Cloudinary configuration missing',
        message: 'Server configuration error'
      });
    }

    const response = await axios.delete(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload/${publicId}`,
      {
        auth: {
          username: apiKey,
          password: apiSecret
        }
      }
    );

    if (response.status === 200) {
      res.json({
        message: 'Image deleted successfully',
        publicId
      });
    } else {
      res.status(400).json({
        error: 'Failed to delete image',
        message: 'Cloudinary delete operation failed'
      });
    }
  } catch (error) {
    console.error('Failed to delete image from Cloudinary:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to delete image',
      message: error.response?.data?.message || 'Internal server error'
    });
  }
});

// Rename image in Cloudinary
router.put('/images/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;
    const { newName, invalidate = false } = req.body;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(500).json({
        error: 'Cloudinary configuration missing',
        message: 'Server configuration error'
      });
    }

    if (!newName) {
      return res.status(400).json({
        error: 'New name is required',
        message: 'Please provide a new name for the image'
      });
    }

    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/rename`,
      {
        from_public_id: publicId,
        to_public_id: newName,
        invalidate: invalidate
      },
      {
        auth: {
          username: apiKey,
          password: apiSecret
        }
      }
    );

    res.json({
      message: 'Image renamed successfully',
      oldPublicId: publicId,
      newPublicId: newName,
      url: response.data.secure_url
    });
  } catch (error) {
    console.error('Failed to rename image in Cloudinary:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to rename image',
      message: error.response?.data?.message || 'Internal server error'
    });
  }
});

// Get uploaded audios from Cloudinary
router.get('/audios', authenticate, async (req, res) => {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(500).json({
        error: 'Cloudinary configuration missing',
        message: 'Server configuration error',
      });
    }

    const limit = parseInt(req.query.limit) || 10;
    const nextCursor = req.query.next_cursor;

    // ✅ Cloudinary Search API uses "expression"
    const params = new URLSearchParams({
      expression: 'folder:da-orbit-audio/*', // 👈 filter only files inside this folder
      resource_type: 'video',                // 👈 audio files are stored as "video"
      max_results: limit.toString(),
      with_field: 'context',                 // 👈 include context field in response
    });

    if (nextCursor) {
      params.append('next_cursor', nextCursor);
    }

    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

    const response = await axios.get(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/search`,
      {
        params,
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    const audios = response.data.resources.map(resource => ({
      public_id: resource.public_id,
      secure_url: resource.secure_url,
      created_at: resource.created_at,
      name: resource.context?.custom_name || null,
    }));

    res.json({
      audios,
      nextCursor: response.data.next_cursor,
      hasMore: !!response.data.next_cursor,
    });
  } catch (error) {
    console.error('❌ Failed to fetch audios from Cloudinary:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to fetch audios',
      message: error.response?.data?.message || 'Internal server error',
    });
  }
});

 router.delete('/audios/:publicId', authenticate, async (req, res) => {
  try {
    const { publicId } = req.params;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(500).json({
        error: 'Cloudinary configuration missing',
        message: 'Server configuration error'
      });
    }

    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

    const response = await axios.delete(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/video/upload/${publicId}`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    if (response.data.result === 'ok') {
      res.json({
        message: 'Audio deleted successfully',
        publicId: publicId
      });
    } else {
      res.status(400).json({
        error: 'Failed to delete audio',
        message: 'Cloudinary delete operation failed'
      });
    }
  } catch (error) {
    console.error('Failed to delete audio from Cloudinary:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to delete audio',
      message: error.response?.data?.message || 'Internal server error'
    });
  }
});

// Rename audio in Cloudinary
router.put('/audios/:publicId', authenticate, async (req, res) => {
  try {
    const { publicId } = req.params;
    const { newName, invalidate = false } = req.body;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(500).json({
        error: 'Cloudinary configuration missing',
        message: 'Server configuration error'
      });
    }

    if (!newName) {
      return res.status(400).json({
        error: 'New name is required',
        message: 'Please provide a new name for the audio'
      });
    }

    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloudName}/video/rename`,
      {
        from_public_id: publicId,
        to_public_id: newName,
        invalidate: invalidate
      },
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    res.json({
      message: 'Audio renamed successfully',
      oldPublicId: publicId,
      newPublicId: newName,
      url: response.data.secure_url
    });
  } catch (error) {
    console.error('Failed to rename audio in Cloudinary:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to rename audio',
      message: error.response?.data?.message || 'Internal server error'
    });
  }
});

export default router;