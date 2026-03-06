import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HanoServices API',
      version: '1.0.0',
      description: 'Backend API for HanoServices - Local Service Finder & Tracker Platform',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from login/register endpoints',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'error',
            },
            message: {
              type: 'string',
              example: 'Error message description',
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'success',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            username: {
              type: 'string',
              example: 'john_doe',
            },
            phone: {
              type: 'string',
              example: '+250788123456',
            },
            email: {
              type: 'string',
              format: 'email',
              nullable: true,
              example: 'user@example.com',
            },
            role: {
              type: 'string',
              enum: ['customer', 'provider', 'admin'],
              example: 'customer',
            },
            isPhoneVerified: {
              type: 'boolean',
              example: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        AuthTokens: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            refreshToken: {
              type: 'string',
              example: 'a3f3d0c2b6...',
            },
            user: {
              $ref: '#/components/schemas/User',
            },
          },
        },
        ServiceCategory: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
              example: 'Plumbing',
            },
            description: {
              type: 'string',
              nullable: true,
              example: 'Plumbing services and repairs',
            },
            icon: {
              type: 'string',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Provider: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            userId: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
              example: 'John Doe',
            },
            photo: {
              type: 'string',
              format: 'uri',
              nullable: true,
            },
            serviceCategoryId: {
              type: 'string',
              format: 'uuid',
            },
            priceRangeMin: {
              type: 'number',
              nullable: true,
              example: 10000,
            },
            priceRangeMax: {
              type: 'number',
              nullable: true,
              example: 50000,
            },
            yearsOfExperience: {
              type: 'integer',
              nullable: true,
              example: 5,
            },
            availability: {
              type: 'string',
              enum: ['available', 'busy', 'offline'],
              example: 'available',
            },
            verificationStatus: {
              type: 'string',
              enum: ['pending', 'approved', 'rejected'],
              example: 'pending',
            },
            isVerified: {
              type: 'boolean',
              example: false,
            },
            location: {
              type: 'object',
              nullable: true,
              properties: {
                latitude: {
                  type: 'number',
                  example: -1.9441,
                },
                longitude: {
                  type: 'number',
                  example: 30.0619,
                },
                address: {
                  type: 'string',
                  nullable: true,
                  example: 'Kigali, Rwanda',
                },
              },
            },
            categoryName: {
              type: 'string',
              nullable: true,
              example: 'Plumbing',
            },
            averageRating: {
              type: 'number',
              example: 4.6,
            },
            totalReviews: {
              type: 'integer',
              example: 25,
            },
            portfolioCount: {
              type: 'integer',
              example: 8,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        PortfolioImage: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            providerId: {
              type: 'string',
              format: 'uuid',
            },
            imageUrl: {
              type: 'string',
              format: 'uri',
            },
            description: {
              type: 'string',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        VerificationRequest: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            providerId: {
              type: 'string',
              format: 'uuid',
            },
            idDocument: {
              type: 'string',
              format: 'uri',
              nullable: true,
            },
            certificates: {
              type: 'array',
              items: {
                type: 'string',
                format: 'uri',
              },
              nullable: true,
            },
            references: {
              type: 'array',
              items: {
                type: 'string',
              },
              nullable: true,
            },
            status: {
              type: 'string',
              enum: ['pending', 'approved', 'rejected'],
              example: 'pending',
            },
            adminNotes: {
              type: 'string',
              nullable: true,
            },
            reviewedBy: {
              type: 'string',
              format: 'uuid',
              nullable: true,
            },
            reviewedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Review: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            bookingId: {
              type: 'string',
              format: 'uuid',
            },
            customerId: {
              type: 'string',
              format: 'uuid',
            },
            providerId: {
              type: 'string',
              format: 'uuid',
            },
            rating: {
              type: 'integer',
              minimum: 1,
              maximum: 5,
              example: 5,
            },
            comment: {
              type: 'string',
              nullable: true,
              example: 'Great service!',
            },
            proofImages: {
              type: 'array',
              items: {
                type: 'string',
                format: 'uri',
              },
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Booking: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            customerId: {
              type: 'string',
              format: 'uuid',
            },
            providerId: {
              type: 'string',
              format: 'uuid',
            },
            serviceCategoryId: {
              type: 'string',
              format: 'uuid',
            },
            status: {
              type: 'string',
              enum: ['pending', 'accepted', 'declined', 'completed', 'cancelled'],
              example: 'pending',
            },
            scheduledDate: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            description: {
              type: 'string',
              nullable: true,
            },
            location: {
              type: 'object',
              nullable: true,
              properties: {
                latitude: {
                  type: 'number',
                  example: -1.9441,
                },
                longitude: {
                  type: 'number',
                  example: 30.0619,
                },
                address: {
                  type: 'string',
                  nullable: true,
                  example: 'Kigali, Rwanda',
                },
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        DashboardSummary: {
          type: 'object',
          properties: {
            users: {
              type: 'object',
              properties: {
                total: {
                  type: 'integer',
                  example: 150,
                },
                customers: {
                  type: 'integer',
                  example: 100,
                },
                providers: {
                  type: 'integer',
                  example: 45,
                },
                admins: {
                  type: 'integer',
                  example: 5,
                },
              },
            },
            providers: {
              type: 'object',
              properties: {
                total: {
                  type: 'integer',
                  example: 50,
                },
                verified: {
                  type: 'integer',
                  example: 20,
                },
              },
            },
            bookings: {
              type: 'object',
              properties: {
                total: {
                  type: 'integer',
                  example: 200,
                },
                byStatus: {
                  type: 'object',
                  properties: {
                    pending: {
                      type: 'integer',
                      example: 60,
                    },
                    accepted: {
                      type: 'integer',
                      example: 40,
                    },
                    declined: {
                      type: 'integer',
                      example: 10,
                    },
                    completed: {
                      type: 'integer',
                      example: 70,
                    },
                    cancelled: {
                      type: 'integer',
                      example: 20,
                    },
                  },
                },
              },
            },
            reviews: {
              type: 'object',
              properties: {
                total: {
                  type: 'integer',
                  example: 80,
                },
                averageRating: {
                  type: 'number',
                  example: 4.2,
                },
              },
            },
            verifications: {
              type: 'object',
              properties: {
                byStatus: {
                  type: 'object',
                  properties: {
                    pending: {
                      type: 'integer',
                      example: 10,
                    },
                    approved: {
                      type: 'integer',
                      example: 30,
                    },
                    rejected: {
                      type: 'integer',
                      example: 5,
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        BadRequest: {
          description: 'Bad request',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        Unauthorized: {
          description: 'Unauthorized - Missing or invalid token',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        Forbidden: {
          description: 'Forbidden - Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts', './src/index.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
