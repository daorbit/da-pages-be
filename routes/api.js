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

// Get audio folders from Cloudinary
router.get('/audios/folders', authenticate, async (req, res) => {
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

    // Use Cloudinary Search API (POST) to get all resources in da-orbit-audio
    const body = {
      expression: 'folder:da-orbit-audio/*',
      resource_type: 'video',
      max_results: 500, // Get more results to find all folders
      with_field: 'context',
    };

    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/search`,
      body,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Extract unique folders from public_ids
    const folders = new Set();
    response.data.resources.forEach(resource => {
      const publicId = resource.public_id;
      // public_id format: da-orbit-audio/folder-name/filename
      const parts = publicId.split('/');
      if (parts.length >= 3) {
        folders.add(parts[1]); // folder name is the second part
      }
    });

    res.json({
      folders: Array.from(folders).sort(),
    });
  } catch (error) {
    console.error('❌ Failed to fetch audio folders from Cloudinary:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to fetch audio folders',
      message: error.response?.data?.message || 'Internal server error',
    });
  }
});

// Get all audio folders recursively from Cloudinary
router.get('/audios/folders/all', authenticate, async (req, res) => {
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

    // Recursive function to get all folders
    const getAllFolders = async (currentPath = 'da-orbit-audio') => {
      const allFolders = [];

      try {
        const response = await axios.get(
          `https://api.cloudinary.com/v1_1/${cloudName}/folders/${currentPath}`,
          {
            auth: {
              username: apiKey,
              password: apiSecret,
            },
          }
        );

        for (const folder of response.data.folders || []) {
          const folderPath = `${currentPath}/${folder.name}`;
          allFolders.push({
            name: folder.name,
            path: folderPath,
          });

          // Recursively get subfolders
          const subFolders = await getAllFolders(folderPath);
          allFolders.push(...subFolders);
        }
      } catch (error) {
        // If folder doesn't exist or has no subfolders, continue
        console.log(`No subfolders found for ${currentPath}`);
      }

      return allFolders;
    };

    const allFolders = await getAllFolders();

    res.json({
      folders: allFolders,
    });
  } catch (error) {
    console.error('❌ Failed to fetch all audio folders from Cloudinary:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to fetch all audio folders',
      message: error.response?.data?.message || 'Internal server error',
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
    const folder = req.query.folder || 'da-orbit-audio'; // Default to da-orbit-audio

    // ✅ Cloudinary Search API uses "expression"
    let expression = `folder:${folder}/*`;

    const body = {
      expression,
      resource_type: 'video',                // 👈 audio files are stored as "video"
      max_results: limit,
      with_field: 'context',                 // 👈 include context field in response
    };

    if (nextCursor) {
      body.next_cursor = nextCursor;
    }

    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

    // Fetch audios using Search API
    const audioResponse = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/search`,
      body,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Recursive function to get all subfolders
    const getAllSubfolders = async (currentFolder) => {
      const allFolders = [];
      
      try {
        const folderResponse = await axios.get(
          `https://api.cloudinary.com/v1_1/${cloudName}/folders/${currentFolder}`,
          {
            auth: {
              username: apiKey,
              password: apiSecret,
            },
          }
        );

        const directSubfolders = folderResponse.data.folders || [];
        
        for (const subfolder of directSubfolders) {
          allFolders.push({
            name: subfolder.name,
            path: subfolder.path,
          });
          
          // Recursively get subfolders of this subfolder
          const nestedFolders = await getAllSubfolders(subfolder.path);
          allFolders.push(...nestedFolders);
        }
      } catch (error) {
        // If folder doesn't exist or has no subfolders, continue
        console.log(`No subfolders found for ${currentFolder}`);
      }
      
      return allFolders;
    };

    // Fetch all subfolders recursively
    const subfolders = await getAllSubfolders(folder);

    const audios = audioResponse.data.resources.map(resource => ({
      public_id: resource.public_id,
      secure_url: resource.secure_url,
      created_at: resource.created_at,
      name: resource.display_name || null,
    }));

    res.json({
      subfolders,
      audios,
      nextCursor: audioResponse.data.next_cursor,
      hasMore: !!audioResponse.data.next_cursor,
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

export default router;