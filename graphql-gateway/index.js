// graphql-gateway/index.js
const { ApolloServer } = require('apollo-server');
const { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } = require('@apollo/gateway');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'RAHASIA_NEGARA';

// Custom DataSource untuk meneruskan header auth (Authorization) + x-api-key ke semua subgraph
class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }) {
    // Forward Authorization (JWT)
    if (context.authorization) {
      request.http.headers.set('authorization', context.authorization);
    }

    // Forward partner key jika ada
    if (context.apiKey) {
      request.http.headers.set('x-api-key', context.apiKey);
    }

    // Backward compatibility: forward user-id/user-role juga (beberapa service lama pakai ini)
    if (context.userId !== undefined && context.userId !== null) {
      request.http.headers.set('user-id', String(context.userId));
    }
    if (context.userRole) {
      request.http.headers.set('user-role', String(context.userRole));
    }
  }
}

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { name: 'auth', url: 'http://auth-service:4001' },
      { name: 'flightSchedule', url: 'http://flight-schedule-service:4002' },
      { name: 'flightBooking', url: 'http://flight-booking-service:4003' },
      { name: 'parcel', url: 'http://parcel-service:4004' },
      { name: 'onboard', url: 'http://onboard-service:4005' },
    ],
  }),
  buildService({ url }) {
    return new AuthenticatedDataSource({ url });
  },
});

const server = new ApolloServer({
  gateway,
  subscriptions: false,
  context: ({ req }) => {
    const authorization = req.headers.authorization || '';
    const apiKey = req.headers['x-api-key'] || '';

    let userId = null;
    let userRole = null;
    let username = null;

    if (authorization) {
      try {
        const actualToken = authorization.replace(/^Bearer\s+/i, '');
        const decoded = jwt.verify(actualToken, JWT_SECRET);
        userId = decoded.id ?? decoded.userId ?? null;
        userRole = decoded.role ?? null;
        username = decoded.username ?? null;
      } catch (e) {
        // token invalid -> subgraph akan handle unauthorized
        console.log('Token verification failed at gateway:', e.message);
      }
    }

    return {
      authorization,
      apiKey,
      userId,
      userRole,
      username
    };
  }
});

server.listen({ port: 4000, host: '0.0.0.0' }).then(({ url }) => {
  console.log(`🚀 Gateway ready at ${url}`);
});
