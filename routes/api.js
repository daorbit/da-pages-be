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
    const { displayName } = req.body;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(500).json({
        error: 'Cloudinary configuration missing',
        message: 'Server configuration error'
      });
    }

    if (!displayName) {
      return res.status(400).json({
        error: 'Display name is required',
        message: 'Please provide a display name for the image'
      });
    }

    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload/${publicId}`,
      {
        display_name: displayName
      },
      {
        auth: {
          username: apiKey,
          password: apiSecret
        }
      }
    );

    res.json({
      message: 'Image display name updated successfully',
      publicId,
      displayName,
      resource: response.data
    });
  } catch (error) {
    console.error('Failed to update image display name in Cloudinary:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to update image display name',
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
      expression: 'folder:da-orbit-audio*', // 👈 filter files in da-orbit-audio and all subfolders
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
      name: resource.display_name || null,
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
    const { displayName } = req.body;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(500).json({
        error: 'Cloudinary configuration missing',
        message: 'Server configuration error'
      });
    }

    if (!displayName) {
      return res.status(400).json({
        error: 'Display name is required',
        message: 'Please provide a display name for the audio'
      });
    }

    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/video/upload/${publicId}`,
      {
        display_name: displayName
      },
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    res.json({
      message: 'Audio display name updated successfully',
      publicId,
      displayName,
      resource: response.data
    });
  } catch (error) {
    console.error('Failed to update audio display name in Cloudinary:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to update audio display name',
      message: error.response?.data?.message || 'Internal server error'
    });
  }
});

// Get audio folders structure from Cloudinary
router.get('/audio-folders', authenticate, async (req, res) => {
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

    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

    // Helper function to fetch all resources with pagination
    const fetchAllResources = async (expression) => {
      let allResources = [];
      let nextCursor = null;

      do {
        const params = new URLSearchParams({
          expression,
          resource_type: 'video',
          max_results: '500',
          with_field: 'context',
        });

        if (nextCursor) {
          params.append('next_cursor', nextCursor);
        }

        const response = await axios.get(
          `https://api.cloudinary.com/v1_1/${cloudName}/resources/search`,
          {
            params,
            headers: {
              Authorization: `Basic ${auth}`,
            },
          }
        );

        allResources = allResources.concat(response.data.resources || []);
        nextCursor = response.data.next_cursor;
      } while (nextCursor);

      return allResources;
    };

    // First, get all folders under da-orbit-audio
    const foldersResponse = await axios.get(
      `https://api.cloudinary.com/v1_1/${cloudName}/folders/da-orbit-audio`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    const folders = foldersResponse.data.folders || [];

    // For each folder, get the audios
    const folderStructure = await Promise.all(
      folders.map(async (folder) => {
        const folderPath = folder.path;
        const folderName = folder.name;

        // Get audios in this specific folder
        const allAudios = await fetchAllResources(`folder:${folderPath}`);

        const audios = allAudios.map(resource => ({
          public_id: resource.public_id,
          secure_url: resource.secure_url,
          created_at: resource.created_at,
          name: resource.display_name || resource.public_id.split('/').pop(),
          folder: folderPath,
        }));

        return {
          name: folderName,
          path: folderPath,
          audios: audios,
          audioCount: audios.length,
        };
      })
    );

    // Also get audios directly in the root da-orbit-audio folder
    const rootAudios = await fetchAllResources(`folder:da-orbit-audio`);

    const rootAudiosMapped = rootAudios.map(resource => ({
      public_id: resource.public_id,
      secure_url: resource.secure_url,
      created_at: resource.created_at,
      name: resource.display_name || resource.public_id.split('/').pop(),
      folder: 'da-orbit-audio',
    }));

    if (rootAudiosMapped.length > 0) {
      folderStructure.unshift({
        name: 'Root',
        path: 'da-orbit-audio',
        audios: rootAudiosMapped,
        audioCount: rootAudiosMapped.length,
      });
    }

    res.json({
      folders: folderStructure,
      totalFolders: folderStructure.length,
      totalAudios: folderStructure.reduce((sum, folder) => sum + folder.audioCount, 0),
    });
  } catch (error) {
    console.error('❌ Failed to fetch audio folders from Cloudinary:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to fetch audio folders',
      message: error.response?.data?.message || 'Internal server error',
    });
  }
});

export default router;