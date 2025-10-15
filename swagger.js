import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'DA Pages Backend API',
      version: '1.0.0',
      description: 'Backend API for DA Dynamic Pages system',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
      {
        url: 'https://da-pages-be.vercel.app',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    paths: {
      '/api/test': {
        get: {
          summary: 'Test API endpoint',
          description: 'Returns a test message to verify API is working',
          responses: {
            200: {
              description: 'API is working successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'API is working!'
                      },
                      data: {
                        type: 'object',
                        properties: {
                          timestamp: {
                            type: 'string',
                            format: 'date-time'
                          },
                          method: {
                            type: 'string',
                            example: 'GET'
                          },
                          path: {
                            type: 'string',
                            example: '/api/test'
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/data': {
        post: {
          summary: 'Receive data',
          description: 'Accepts and returns posted data',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  description: 'Any JSON data'
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Data received successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'Data received successfully'
                      },
                      receivedData: {
                        type: 'object',
                        description: 'The data that was sent'
                      },
                      timestamp: {
                        type: 'string',
                        format: 'date-time'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/pages': {
        get: {
          summary: 'Get all pages',
          description: 'Retrieves a list of all dynamic pages',
          responses: {
            200: {
              description: 'Pages retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'Pages retrieved successfully'
                      },
                      pages: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: {
                              type: 'integer',
                              example: 1
                            },
                            title: {
                              type: 'string',
                              example: 'Home Page'
                            },
                            slug: {
                              type: 'string',
                              example: 'home'
                            },
                            content: {
                              type: 'string',
                              example: 'Welcome to our dynamic pages system'
                            },
                            createdAt: {
                              type: 'string',
                              format: 'date-time'
                            }
                          }
                        }
                      },
                      total: {
                        type: 'integer',
                        example: 2
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/pages/{id}': {
        get: {
          summary: 'Get page by ID',
          description: 'Retrieves a specific page by its ID',
          parameters: [
            {
              in: 'path',
              name: 'id',
              required: true,
              schema: {
                type: 'integer'
              },
              description: 'The page ID'
            }
          ],
          responses: {
            200: {
              description: 'Page retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'Page retrieved successfully'
                      },
                      page: {
                        type: 'object',
                        properties: {
                          id: {
                            type: 'integer',
                            example: 1
                          },
                          title: {
                            type: 'string',
                            example: 'Page 1'
                          },
                          slug: {
                            type: 'string',
                            example: 'page-1'
                          },
                          content: {
                            type: 'string',
                            example: 'This is the content for page 1'
                          },
                          createdAt: {
                            type: 'string',
                            format: 'date-time'
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/images': {
        get: {
          summary: 'Get uploaded images',
          description: 'Retrieves uploaded images from Cloudinary',
          parameters: [
            {
              in: 'query',
              name: 'limit',
              schema: {
                type: 'integer',
                default: 10
              },
              description: 'Number of images to retrieve'
            },
            {
              in: 'query',
              name: 'next_cursor',
              schema: {
                type: 'string'
              },
              description: 'Cursor for pagination'
            }
          ],
          responses: {
            200: {
              description: 'Images retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'Images retrieved successfully'
                      },
                      images: {
                        type: 'array',
                        items: {
                          type: 'object',
                          description: 'Cloudinary image resource'
                        }
                      },
                      next_cursor: {
                        type: 'string',
                        nullable: true
                      },
                      has_more: {
                        type: 'boolean'
                      }
                    }
                  }
                }
              }
            },
            500: {
              description: 'Server error',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: {
                        type: 'string',
                        example: 'Failed to fetch images'
                      },
                      message: {
                        type: 'string'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/images/{publicId}': {
        delete: {
          summary: 'Delete image',
          description: 'Deletes an image from Cloudinary by public ID',
          parameters: [
            {
              in: 'path',
              name: 'publicId',
              required: true,
              schema: {
                type: 'string'
              },
              description: 'The public ID of the image to delete'
            }
          ],
          responses: {
            200: {
              description: 'Image deleted successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'Image deleted successfully'
                      },
                      publicId: {
                        type: 'string'
                      }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Delete operation failed'
            },
            500: {
              description: 'Server error'
            }
          }
        }
      },
      '/api/audios': {
        get: {
          summary: 'Get uploaded audios',
          description: 'Retrieves uploaded audio files from Cloudinary (requires authentication)',
          security: [
            {
              bearerAuth: []
            }
          ],
          parameters: [
            {
              in: 'query',
              name: 'limit',
              schema: {
                type: 'integer',
                default: 10
              },
              description: 'Number of audio files to retrieve'
            },
            {
              in: 'query',
              name: 'next_cursor',
              schema: {
                type: 'string'
              },
              description: 'Cursor for pagination'
            }
          ],
          responses: {
            200: {
              description: 'Audios retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      audios: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            public_id: {
                              type: 'string'
                            },
                            secure_url: {
                              type: 'string'
                            },
                            created_at: {
                              type: 'string',
                              format: 'date-time'
                            },
                            name: {
                              type: 'string',
                              nullable: true
                            }
                          }
                        }
                      },
                      nextCursor: {
                        type: 'string',
                        nullable: true
                      },
                      hasMore: {
                        type: 'boolean'
                      }
                    }
                  }
                }
              }
            },
            401: {
              description: 'Unauthorized'
            },
            500: {
              description: 'Server error'
            }
          }
        }
      },
      '/api/audios/{publicId}': {
        delete: {
          summary: 'Delete audio',
          description: 'Deletes an audio file from Cloudinary by public ID (requires authentication)',
          security: [
            {
              bearerAuth: []
            }
          ],
          parameters: [
            {
              in: 'path',
              name: 'publicId',
              required: true,
              schema: {
                type: 'string'
              },
              description: 'The public ID of the audio file to delete'
            }
          ],
          responses: {
            200: {
              description: 'Audio deleted successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'Audio deleted successfully'
                      },
                      publicId: {
                        type: 'string'
                      }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Delete operation failed'
            },
            401: {
              description: 'Unauthorized'
            },
            500: {
              description: 'Server error'
            }
          }
        }
      }
    }
  },
  apis: [], // Empty since we're defining paths manually
};

const specs = swaggerJSDoc(options);

export { swaggerUi, specs };