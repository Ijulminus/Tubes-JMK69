# Template Integrasi Lintas Kelompok

## 📋 Template Koordinasi dengan Kelompok Lain

### Template 1: Email/Pesan Koordinasi

```
Subject: Koordinasi Integrasi Service - JMK AIR

Halo [Nama Kelompok],

Kami dari kelompok JMK AIR ingin melakukan integrasi dengan service Anda.

═══════════════════════════════════════════════════════════
SEBAGAI PROVIDER (Service yang Kami Sediakan):
═══════════════════════════════════════════════════════════

1. Auth Service (Identity Provider)
   - URL: http://auth-service:4001
   - Port: 4001
   - Network: jmkair-network (Docker) atau http://localhost:4001 (Host)
   
   Query yang Tersedia:
   - userById(id: ID!): User
   - me: User (requires JWT token)
   
   Mutation yang Tersedia:
   - register(...): User
   - login(username: String!, password: String!): AuthPayload
   
   Authentication:
   - userById: No auth required
   - me: Requires JWT token in Authorization header
   - JWT Secret: RAHASIA_NEGARA (untuk development)
   
   Schema GraphQL: [Lampirkan file schemas/auth.graphql]

2. Flight Booking Service
   - URL: http://flight-booking-service:4003
   - Port: 4003
   
   Query yang Tersedia:
   - bookingById(id: ID!): Booking
   - myBookings: [Booking]
   
   Authentication:
   - Requires JWT token (via Gateway)
   - Gateway URL: http://graphql-gateway:4000

═══════════════════════════════════════════════════════════
SEBAGAI CONSUMER (Service yang Kami Ingin Konsumsi):
═══════════════════════════════════════════════════════════

Kami ingin mengkonsumsi service berikut dari Anda:

1. [Nama Service]
   - URL yang diharapkan: [URL service Anda]
   - Port: [Port]
   
   Query/Mutation yang dibutuhkan:
   - [Query/Mutation name]: [Description]
   
   Contoh:
   - bookingById(id: ID!): Booking
   - createPayment(...): Payment

═══════════════════════════════════════════════════════════
INFORMASI YANG KAMI BUTUHKAN:
═══════════════════════════════════════════════════════════

1. URL endpoint GraphQL yang dapat kami akses
2. Schema GraphQL lengkap (file .graphql atau dokumentasi)
3. Method authentication (JWT, API Key, atau tidak ada)
4. JWT secret (jika menggunakan JWT)
5. Network configuration (Docker network name atau IP)
6. Contoh query/mutation yang dapat digunakan
7. Port yang digunakan

═══════════════════════════════════════════════════════════
TESTING:
═══════════════════════════════════════════════════════════

Kami siap untuk testing bersama. Mari kita tentukan:
- Waktu testing
- Test cases yang akan diuji
- Environment (Docker atau host)

Terima kasih!
Tim JMK AIR
```

---

## 🔧 Template Konfigurasi Docker Compose

### Template 2: Menambahkan Service Kelompok Lain ke docker-compose.yml

```yaml
# Tambahkan di docker-compose.yml

services:
  # Service dari kelompok lain
  external-service-name:
    image: kelompok-lain/service-name:latest
    # atau
    # build: ../path-to-external-service
    ports:
      - "5000:4000"  # Map port sesuai kebutuhan
    environment:
      # Environment variables yang diperlukan
      DB_HOST: external-db
      DB_NAME: external_db
      # ... lainnya
    networks:
      - jmkair-network  # Pastikan di network yang sama
    # depends_on:
    #   - external-db

  # Update service yang akan mengkonsumsi
  flight-booking-service:
    # ... existing config
    environment:
      EXTERNAL_SERVICE_URL: http://external-service-name:4000
    networks:
      - jmkair-network
    depends_on:
      - external-service-name  # Jika perlu wait
```

---

## 💻 Template Code untuk Consumer

### Template 3: Helper Function untuk Memanggil External Service

```javascript
// Template untuk memanggil external service
const axios = require('axios');

const EXTERNAL_SERVICE_URL = process.env.EXTERNAL_SERVICE_URL || 'http://external-service:4000';

/**
 * Helper function untuk memanggil external service
 * @param {string} query - GraphQL query string
 * @param {object} variables - GraphQL variables (optional)
 * @param {string} token - JWT token (optional)
 * @returns {Promise<object>} Response data
 */
async function callExternalService(query, variables = {}, token = null) {
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Tambahkan token jika ada
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Tambahkan API key jika diperlukan
    if (process.env.EXTERNAL_API_KEY) {
      headers['X-API-Key'] = process.env.EXTERNAL_API_KEY;
    }
    
    const response = await axios.post(
      EXTERNAL_SERVICE_URL,
      {
        query,
        variables
      },
      {
        headers,
        timeout: 5000  // 5 detik timeout
      }
    );
    
    // Handle GraphQL errors
    if (response.data.errors) {
      const errorMessage = response.data.errors[0].message;
      console.error('GraphQL Error from external service:', errorMessage);
      throw new Error(`External service error: ${errorMessage}`);
    }
    
    return response.data.data;
  } catch (error) {
    // Handle network errors
    if (error.code === 'ECONNREFUSED') {
      console.error('Cannot connect to external service:', EXTERNAL_SERVICE_URL);
      throw new Error('External service tidak dapat diakses');
    }
    
    if (error.code === 'ETIMEDOUT') {
      console.error('Timeout connecting to external service');
      throw new Error('External service timeout');
    }
    
    console.error('Error calling external service:', error.message);
    throw new Error(`Gagal memanggil external service: ${error.message}`);
  }
}

// Contoh penggunaan
async function getExternalData(id) {
  const query = `
    query GetData($id: ID!) {
      dataById(id: $id) {
        id
        name
        status
      }
    }
  `;
  
  const variables = { id };
  const token = context.token; // Ambil dari context jika ada
  
  const result = await callExternalService(query, variables, token);
  return result.dataById;
}

module.exports = {
  callExternalService,
  getExternalData
};
```

---

## 📝 Template Resolver untuk Consumer

### Template 4: Resolver yang Mengkonsumsi External Service

```javascript
// Di file service/index.js

const resolvers = {
  Query: {
    // Query untuk mengambil data dari external service
    externalDataById: async (_, { externalId }, context) => {
      // Validasi authentication jika diperlukan
      if (!context.userId) {
        throw new Error('Unauthorized');
      }
      
      try {
        // Panggil external service
        const externalData = await getExternalData(externalId, context.token);
        
        // Transform data jika diperlukan
        return {
          id: externalData.id,
          name: externalData.name,
          status: externalData.status,
          // ... map fields sesuai kebutuhan
        };
      } catch (error) {
        console.error('Error fetching external data:', error);
        throw new Error(`Gagal mengambil data dari external service: ${error.message}`);
      }
    }
  },
  
  Mutation: {
    // Mutation untuk sinkronisasi data dari external service
    syncExternalData: async (_, { externalId }, context) => {
      if (!context.userId) {
        throw new Error('Unauthorized');
      }
      
      try {
        // 1. Ambil data dari external service
        const externalData = await getExternalData(externalId, context.token);
        
        // 2. Cek apakah data sudah ada di database lokal
        let localData = await LocalModel.findOne({
          where: { externalId: externalData.id }
        });
        
        if (localData) {
          // Update data yang sudah ada
          localData.status = externalData.status;
          await localData.save();
          return localData;
        } else {
          // Buat data baru
          localData = await LocalModel.create({
            userId: context.userId,
            externalId: externalData.id,
            name: externalData.name,
            status: externalData.status,
            // ... map fields lainnya
          });
          return localData;
        }
      } catch (error) {
        console.error('Error syncing external data:', error);
        throw new Error(`Gagal sinkronisasi data: ${error.message}`);
      }
    }
  }
};
```

---

## 🔐 Template Authentication

### Template 5: Menambahkan Authentication ke External Call

```javascript
// Opsi 1: JWT Token
async function callWithJWT(query, variables, context) {
  const token = context.token || context.headers?.authorization?.replace('Bearer ', '');
  
  return await callExternalService(query, variables, token);
}

// Opsi 2: API Key
async function callWithAPIKey(query, variables) {
  const apiKey = process.env.EXTERNAL_API_KEY;
  if (!apiKey) {
    throw new Error('API Key tidak dikonfigurasi');
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey
  };
  
  const response = await axios.post(EXTERNAL_SERVICE_URL, {
    query,
    variables
  }, { headers });
  
  return response.data.data;
}

// Opsi 3: Basic Auth
async function callWithBasicAuth(query, variables) {
  const username = process.env.EXTERNAL_USERNAME;
  const password = process.env.EXTERNAL_PASSWORD;
  
  const auth = Buffer.from(`${username}:${password}`).toString('base64');
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${auth}`
  };
  
  const response = await axios.post(EXTERNAL_SERVICE_URL, {
    query,
    variables
  }, { headers });
  
  return response.data.data;
}
```

---

## 🧪 Template Testing

### Template 6: Test Script untuk Integrasi

```javascript
// test-integration.js
const axios = require('axios');

const EXTERNAL_SERVICE_URL = process.env.EXTERNAL_SERVICE_URL || 'http://localhost:4000';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';

async function testIntegration() {
  console.log('🧪 Testing Integration...\n');
  
  // Test 1: Login untuk mendapatkan token
  console.log('1. Testing Login...');
  try {
    const loginResponse = await axios.post(AUTH_SERVICE_URL, {
      query: `
        mutation {
          login(username: "testuser", password: "password123") {
            token
            user {
              id
              username
            }
          }
        }
      `
    });
    
    if (loginResponse.data.errors) {
      console.error('❌ Login failed:', loginResponse.data.errors);
      return;
    }
    
    const token = loginResponse.data.data.login.token;
    console.log('✅ Login successful, token:', token.substring(0, 20) + '...\n');
    
    // Test 2: Call external service dengan token
    console.log('2. Testing External Service Call...');
    try {
      const externalResponse = await axios.post(
        EXTERNAL_SERVICE_URL,
        {
          query: `
            query {
              dataById(id: "1") {
                id
                name
                status
              }
            }
          `
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (externalResponse.data.errors) {
        console.error('❌ External service call failed:', externalResponse.data.errors);
        return;
      }
      
      console.log('✅ External service call successful');
      console.log('Response:', JSON.stringify(externalResponse.data.data, null, 2));
      
    } catch (error) {
      console.error('❌ Error calling external service:', error.message);
      if (error.code === 'ECONNREFUSED') {
        console.error('   → Service tidak dapat diakses. Pastikan service sudah running.');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Jalankan test
testIntegration();
```

**Cara menjalankan:**
```bash
# Set environment variable
export EXTERNAL_SERVICE_URL=http://external-service:4000
export AUTH_SERVICE_URL=http://auth-service:4001

# Jalankan test
node test-integration.js
```

---

## 📊 Template Error Handling

### Template 7: Error Handling yang Robust

```javascript
// error-handler.js

class ExternalServiceError extends Error {
  constructor(message, code, originalError) {
    super(message);
    this.name = 'ExternalServiceError';
    this.code = code;
    this.originalError = originalError;
  }
}

async function callExternalServiceWithRetry(query, variables, token, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await callExternalService(query, variables, token);
      return result;
    } catch (error) {
      lastError = error;
      
      // Jangan retry untuk error tertentu
      if (error.response?.status === 401) {
        throw new ExternalServiceError(
          'Authentication failed',
          'AUTH_ERROR',
          error
        );
      }
      
      if (error.response?.status === 404) {
        throw new ExternalServiceError(
          'Resource not found',
          'NOT_FOUND',
          error
        );
      }
      
      // Retry untuk network errors
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        console.warn(`Attempt ${attempt} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        continue;
      }
      
      // Jangan retry untuk error lainnya
      throw new ExternalServiceError(
        `External service error: ${error.message}`,
        'EXTERNAL_ERROR',
        error
      );
    }
  }
  
  throw new ExternalServiceError(
    `Failed after ${maxRetries} attempts: ${lastError.message}`,
    'MAX_RETRIES_EXCEEDED',
    lastError
  );
}

// Usage di resolver
const resolvers = {
  Query: {
    externalDataById: async (_, { externalId }, context) => {
      if (!context.userId) {
        throw new Error('Unauthorized');
      }
      
      try {
        const query = `
          query GetData($id: ID!) {
            dataById(id: $id) {
              id
              name
              status
            }
          }
        `;
        
        const result = await callExternalServiceWithRetry(
          query,
          { id: externalId },
          context.token
        );
        
        return result.dataById;
      } catch (error) {
        if (error instanceof ExternalServiceError) {
          // Log error untuk monitoring
          console.error('External service error:', {
            code: error.code,
            message: error.message,
            timestamp: new Date().toISOString()
          });
          
          // Return user-friendly error
          throw new Error(`Tidak dapat mengambil data: ${error.message}`);
        }
        
        throw error;
      }
    }
  }
};
```

---

## 📋 Checklist Template

### Template 8: Checklist Integrasi

```markdown
## Checklist Integrasi dengan [Nama Kelompok]

### Pre-Integration
- [ ] Koordinasi dengan kelompok lain selesai
- [ ] Endpoint URL sudah ditentukan
- [ ] Schema GraphQL sudah disepakati
- [ ] Authentication method sudah ditentukan
- [ ] JWT secret sudah dibagikan (jika menggunakan JWT)
- [ ] Network configuration sudah disepakati

### Implementation
- [ ] Environment variable sudah ditambahkan
- [ ] Helper function sudah dibuat
- [ ] Resolver sudah diimplementasikan
- [ ] GraphQL schema sudah diupdate
- [ ] Error handling sudah diimplementasikan
- [ ] Logging sudah ditambahkan

### Configuration
- [ ] docker-compose.yml sudah diupdate
- [ ] Network Docker sudah dikonfigurasi
- [ ] Service dapat diakses

### Testing
- [ ] Test koneksi berhasil
- [ ] Test query/mutation berhasil
- [ ] Test authentication berhasil
- [ ] Test error handling berhasil
- [ ] Test dengan data real berhasil

### Documentation
- [ ] Endpoint yang dikonsumsi sudah didokumentasikan
- [ ] Endpoint yang disediakan sudah didokumentasikan
- [ ] INTEGRASI_LINTAS_KELOMPOK.md sudah diupdate
- [ ] PANDUAN_INTEGRASI_PRAKTIS.md sudah diupdate

### Final
- [ ] Integrasi sudah di-test bersama kelompok lain
- [ ] Tidak ada error yang blocking
- [ ] Dokumentasi sudah lengkap
- [ ] Code sudah di-commit
```

---

## 🚀 Quick Start Template

### Template 9: Quick Start - Menambahkan Consumer Baru

```javascript
// 1. Tambahkan environment variable di docker-compose.yml
// EXTERNAL_NEW_SERVICE: http://external-new-service:4000

// 2. Tambahkan constant di index.js
const EXTERNAL_NEW_SERVICE = process.env.EXTERNAL_NEW_SERVICE || 'http://external-new-service:4000';

// 3. Tambahkan helper function
async function getExternalNewData(id) {
  const response = await axios.post(EXTERNAL_NEW_SERVICE, {
    query: `query { dataById(id: "${id}") { id name } }`
  });
  return response.data.data.dataById;
}

// 4. Tambahkan ke GraphQL schema
extend type Query {
  externalNewDataById(id: ID!): ExternalNewData
}

// 5. Tambahkan resolver
Query: {
  externalNewDataById: async (_, { id }, context) => {
    if (!context.userId) throw new Error('Unauthorized');
    return await getExternalNewData(id);
  }
}

// 6. Test
// Query di GraphQL Playground:
// query { externalNewDataById(id: "1") { id name } }
```

---

**Gunakan template ini sebagai starting point untuk integrasi Anda!**

