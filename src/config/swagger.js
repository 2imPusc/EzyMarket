import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EzyMarket API Documentation',
      version: '1.0.0',
      description: 'API documentation for EzyMarket application',
      contact: {
        name: 'EzyMarket Team',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'User ID',
            },
            userName: {
              type: 'string',
              description: 'Username',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email',
            },
            phone: {
              type: 'string',
              description: 'User phone number',
            },
            role: {
              type: 'string',
              enum: ['user', 'admin'],
              description: 'User role',
            },
            emailVerified: {
              type: 'boolean',
              description: 'Email verification status',
            },
          },
        },
        Group: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Group ID',
            },
            name: {
              type: 'string',
              description: 'Group name',
            },
            description: {
              type: 'string',
              description: 'Group description',
            },
            owner: {
              type: 'string',
              description: 'Owner user ID',
            },
            members: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Array of member user IDs',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Error message',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.js'], // Path to the API routes
};

const swaggerSpec = swaggerJsdoc(options);

export { swaggerUi, swaggerSpec };
