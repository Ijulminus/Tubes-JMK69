// graphql-gateway/index.js
const { ApolloServer } = require('apollo-server');
const { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } = require('@apollo/gateway');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'RAHASIA_NEGARA';

// Kelas Custom untuk meneruskan Header Authentication
class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }) {
    // Jika di Gateway sudah berhasil decode user, kirim ID-nya ke service bawahan
    if (context.userId) {
      request.http.headers.set('user-id', context.userId);
    }
    if (context.userRole) {
      request.http.headers.set('user-role', context.userRole);
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
  buildService({ name, url }) {
    return new AuthenticatedDataSource({ url });
  },
});

const server = new ApolloServer({
  gateway,
  subscriptions: false,
  // Context Gateway: Cek Token di sini!
  context: ({ req }) => {
    const token = req.headers.authorization || '';
    if (token) {
      try {
        // Hapus 'Bearer ' jika ada
        const actualToken = token.replace('Bearer ', '');
        const decoded = jwt.verify(actualToken, JWT_SECRET);
        return { 
          userId: decoded.id || decoded.userId,
          userRole: decoded.role,
          username: decoded.username
        };
      } catch (e) {
        // Token tidak valid, biarkan saja (mungkin user tamu)
        console.log('Token verification failed:', e.message);
      }
    }
    return {};
  }
});

server.listen({ port: 4000 }).then(({ url }) => {
  console.log(`🚀 Gateway ready at ${url}`);
});

