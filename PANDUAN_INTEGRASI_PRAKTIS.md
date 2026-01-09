# Panduan Praktis Integrasi Lintas Kelompok - JMK AIR

## 📋 Daftar Isi
1. [Konsep Dasar](#konsep-dasar)
2. [Sebagai CONSUMER (Mengkonsumsi Service Kelompok Lain)](#sebagai-consumer)
3. [Sebagai PROVIDER (Menyediakan Service untuk Kelompok Lain)](#sebagai-provider)
4. [Langkah-langkah Integrasi Step-by-Step](#langkah-langkah-integrasi)
5. [Contoh Implementasi](#contoh-implementasi)
6. [Testing Integrasi](#testing-integrasi)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Konsep Dasar

### Prinsip Integrasi
1. **GraphQL sebagai Kontrak**: Semua komunikasi menggunakan GraphQL
2. **Service Discovery**: Setiap service memiliki endpoint GraphQL yang dapat diakses
3. **Authentication**: Menggunakan JWT token (jika diperlukan)
4. **Network**: Service harus berada di network yang sama atau dapat diakses

### Dua Posisi Integrasi
- **CONSUMER**: Mengkonsumsi endpoint dari kelompok lain
- **PROVIDER**: Menyediakan endpoint untuk kelompok lain

---

## 🔽 Sebagai CONSUMER

### Skenario: Mengkonsumsi Booking Service dari Kelompok Lain

#### Step 1: Koordinasi dengan Kelompok Lain

**Yang perlu ditanyakan:**
- URL endpoint GraphQL mereka (contoh: `http://external-booking-service:4000`)
- Schema GraphQL yang mereka sediakan
- Method authentication (JWT, API Key, atau tidak ada)
- Query/Mutation yang tersedia

**Contoh informasi yang didapat:**
```
Endpoint: http://external-booking-service:4000
Query tersedia: bookingById(id: ID!): Booking
Authentication: JWT Token (optional)
```

#### Step 2: Update Environment Variable

Edit `docker-compose.yml` pada service yang akan mengkonsumsi:

```yaml
flight-booking-service:
  environment:
    EXTERNAL_BOOKING_SERVICE: http://external-booking-service:4000
```

Atau jika service kelompok lain berjalan di host yang berbeda:
```yaml
flight-booking-service:
  environment:
    EXTERNAL_BOOKING_SERVICE: http://192.168.1.100:4000  # IP kelompok lain
```

#### Step 3: Implementasi di Code

**File: `flight-booking-service/index.js`**

Kode sudah ada di line 114-139. Fungsi `getExternalBooking()` sudah mengimplementasikan pemanggilan ke external service:

```javascript
// Helper function untuk mengambil booking dari kelompok lain
async function getExternalBooking(externalBookingId) {
  try {
    const response = await axios.post(`${EXTERNAL_BOOKING_SERVICE}`, {
      query: `
        query {
          bookingById(id: "${externalBookingId}") {
            id
            bookingCode
            passengerName
            status
            createdAt
          }
        }
      `
    });
    
    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }
    
    return response.data.data.bookingById;
  } catch (error) {
    throw new Error(`Gagal mengambil booking dari kelompok lain: ${error.message}`);
  }
}
```

**Jika perlu menambahkan header authentication:**
```javascript
async function getExternalBooking(externalBookingId, token) {
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Tambahkan token jika diperlukan
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await axios.post(
      `${EXTERNAL_BOOKING_SERVICE}`,
      {
        query: `
          query {
            bookingById(id: "${externalBookingId}") {
              id
              bookingCode
              passengerName
              status
              createdAt
            }
          }
        `
      },
      { headers }
    );
    
    // ... rest of code
  } catch (error) {
    // ... error handling
  }
}
```

#### Step 4: Update GraphQL Schema (jika perlu)

Schema sudah ada di `schemas/flight-booking.graphql`. Pastikan type `ExternalBookingInfo` sesuai dengan response dari kelompok lain.

#### Step 5: Update Resolver

Resolver sudah ada di line 156-171. Pastikan sesuai dengan kebutuhan:

```javascript
externalBookingById: async (_, { externalBookingId }, context) => {
  if (!context.userId) throw new Error('Unauthorized');
  
  try {
    const externalBooking = await getExternalBooking(externalBookingId);
    return {
      id: externalBooking.id,
      bookingCode: externalBooking.bookingCode || null,
      passengerName: externalBooking.passengerName,
      status: externalBooking.status,
      createdAt: externalBooking.createdAt || new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Gagal mengambil booking dari kelompok lain: ${error.message}`);
  }
}
```

#### Step 6: Konfigurasi Network (Docker)

**Opsi A: Service kelompok lain di docker-compose yang sama**

Tambahkan ke `docker-compose.yml`:

```yaml
services:
  # Service dari kelompok lain
  external-booking-service:
    image: kelompok-lain/booking-service:latest
    ports:
      - "5000:4000"
    networks:
      - jmkair-network
    # ... konfigurasi lainnya dari kelompok lain

  flight-booking-service:
    # ... existing config
    networks:
      - jmkair-network  # Pastikan di network yang sama
```

**Opsi B: Service kelompok lain di host terpisah**

Pastikan service dapat diakses melalui network:
- Jika di localhost: gunakan `host.docker.internal` (Windows/Mac) atau IP host
- Jika di server lain: gunakan IP server atau domain

```yaml
flight-booking-service:
  environment:
    EXTERNAL_BOOKING_SERVICE: http://host.docker.internal:4000  # Localhost
    # atau
    EXTERNAL_BOOKING_SERVICE: http://192.168.1.100:4000  # IP server lain
```

---

## 🔼 Sebagai PROVIDER

### Skenario 1: Auth Service sebagai Identity Provider

#### Step 1: Dokumentasikan Endpoint

**Informasi yang perlu dibagikan ke kelompok lain:**

```
Service: Auth Service JMK AIR
Base URL: http://auth-service:4001
GraphQL Endpoint: http://auth-service:4001 (POST)

Available Queries:
- userById(id: ID!): User
- me: User (requires JWT token)

Available Mutations:
- register(...): User
- login(username: String!, password: String!): AuthPayload

Authentication:
- Query userById: No authentication required
- Query me: Requires JWT token in Authorization header
- Mutations: No authentication required (public)
```

#### Step 2: Pastikan Service Ter-expose

Service sudah ter-expose di port 4001. Pastikan di `docker-compose.yml`:

```yaml
auth-service:
  ports:
    - "4001:4001"  # Exposed ke host
  networks:
    - jmkair-network  # Di network yang dapat diakses
```

#### Step 3: Share Schema GraphQL

Bagikan file `schemas/auth.graphql` atau dokumentasikan schema:

```graphql
type User {
  id: ID!
  username: String!
  fullName: String!
  email: String!
  role: String!
  status: String!
}

type Query {
  userById(id: ID!): User
  me: User
}

type Mutation {
  register(...): User
  login(username: String!, password: String!): AuthPayload
}
```

#### Step 4: Share JWT Secret (jika diperlukan)

Jika kelompok lain perlu memvalidasi token yang kita generate, share JWT_SECRET:
```
JWT_SECRET: RAHASIA_NEGARA
```

**⚠️ Catatan Keamanan**: Untuk production, gunakan secret yang lebih aman dan pertimbangkan menggunakan shared secret management.

#### Step 5: Testing Endpoint

Test endpoint dapat diakses dari luar:

```bash
# Test dari host
curl -X POST http://localhost:4001 \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { userById(id: \"1\") { id username fullName } }"
  }'
```

---

### Skenario 2: Flight Booking Service sebagai Booking Provider

#### Step 1: Dokumentasikan Endpoint

**Informasi yang perlu dibagikan:**

```
Service: Flight Booking Service JMK AIR
Base URL: http://flight-booking-service:4003
GraphQL Endpoint: http://flight-booking-service:4003 (POST)

Available Queries:
- bookingById(id: ID!): Booking
- myBookings: [Booking]

Authentication:
- Requires JWT token in Authorization header
- Requires user-id in header (dikirim otomatis oleh gateway)
```

#### Step 2: Pastikan Query Dapat Diakses Tanpa Gateway

Saat ini `bookingById` memerlukan `context.userId`. Untuk integrasi lintas kelompok, mungkin perlu:

**Opsi A: Buat query khusus untuk external (tanpa auth)**
```javascript
// Di flight-booking-service/index.js
extend type Query {
  # Query untuk internal (dengan auth)
  bookingById(id: ID!): Booking
  
  # Query untuk external (tanpa auth atau dengan API key)
  externalBookingById(id: ID!): Booking
}

// Resolver
externalBookingById: async (_, { id }) => {
  // Validasi API key atau token khusus untuk external
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.EXTERNAL_API_KEY) {
    throw new Error('Unauthorized');
  }
  
  const booking = await Booking.findByPk(id);
  if (!booking) {
    throw new Error('Booking tidak ditemukan');
  }
  return booking;
}
```

**Opsi B: Biarkan melalui Gateway dengan token**
Kelompok lain memanggil melalui Gateway dengan JWT token yang valid.

---

## 🚀 Langkah-langkah Integrasi

### Checklist Integrasi

#### Sebelum Integrasi
- [ ] Koordinasi dengan kelompok lain
- [ ] Tentukan endpoint yang akan digunakan
- [ ] Sepakati schema GraphQL
- [ ] Tentukan method authentication
- [ ] Tentukan URL dan port service

#### Konfigurasi
- [ ] Update environment variables
- [ ] Konfigurasi network Docker
- [ ] Update code (jika diperlukan)
- [ ] Update GraphQL schema (jika diperlukan)

#### Testing
- [ ] Test koneksi ke service kelompok lain
- [ ] Test query/mutation
- [ ] Test error handling
- [ ] Test dengan authentication (jika ada)

#### Dokumentasi
- [ ] Dokumentasikan endpoint yang dikonsumsi
- [ ] Dokumentasikan endpoint yang disediakan
- [ ] Update INTEGRASI_LINTAS_KELOMPOK.md

---

## 💻 Contoh Implementasi

### Contoh 1: Menambahkan Service Baru untuk Dikonsumsi

**Skenario**: Ingin mengkonsumsi Payment Service dari kelompok lain

#### Step 1: Tambahkan Environment Variable

```yaml
# docker-compose.yml
flight-booking-service:
  environment:
    EXTERNAL_BOOKING_SERVICE: http://external-booking-service:4000
    EXTERNAL_PAYMENT_SERVICE: http://external-payment-service:5000  # Baru
```

#### Step 2: Tambahkan Helper Function

```javascript
// flight-booking-service/index.js
const EXTERNAL_PAYMENT_SERVICE = process.env.EXTERNAL_PAYMENT_SERVICE || 'http://external-payment-service:5000';

async function verifyPayment(paymentId) {
  try {
    const response = await axios.post(`${EXTERNAL_PAYMENT_SERVICE}`, {
      query: `
        query {
          paymentById(id: "${paymentId}") {
            id
            status
            amount
            verified
          }
        }
      `
    });
    
    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }
    
    return response.data.data.paymentById;
  } catch (error) {
    throw new Error(`Gagal verifikasi payment: ${error.message}`);
  }
}
```

#### Step 3: Gunakan di Resolver

```javascript
confirmPayment: async (_, { bookingId, paymentId }, context) => {
  if (!context.userId) throw new Error('Unauthorized');
  
  // Verifikasi payment dari external service
  const payment = await verifyPayment(paymentId);
  
  if (!payment.verified) {
    throw new Error('Payment tidak valid');
  }
  
  const booking = await Booking.findByPk(bookingId);
  if (!booking || booking.userId !== context.userId) {
    throw new Error('Booking tidak ditemukan');
  }
  
  booking.paymentStatus = 'PAID';
  booking.paymentId = paymentId;
  booking.status = 'CONFIRMED';
  await booking.save();
  
  return booking;
}
```

---

### Contoh 2: Menyediakan Endpoint Baru untuk Kelompok Lain

**Skenario**: Menyediakan endpoint untuk melihat flight schedule

#### Step 1: Pastikan Query Sudah Ada

Di `flight-schedule-service`, pastikan ada query yang dapat diakses:

```javascript
// flight-schedule-service/index.js
extend type Query {
  flightByCode(flightCode: String!): FlightSchedule
  flights: [FlightSchedule]
  // ... existing queries
}
```

#### Step 2: Dokumentasikan

Bagikan ke kelompok lain:
```
Service: Flight Schedule Service JMK AIR
URL: http://flight-schedule-service:4002

Query: flightByCode(flightCode: String!): FlightSchedule
```

#### Step 3: Test

```bash
curl -X POST http://localhost:4002 \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { flightByCode(flightCode: \"JMK001\") { id flightCode availableSeats } }"
  }'
```

---

## 🧪 Testing Integrasi

### Test 1: Test sebagai Consumer

**Test mengambil booking dari kelompok lain:**

```bash
# 1. Login dulu untuk mendapatkan token
curl -X POST http://localhost:4000 \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { login(username: \"testuser\", password: \"password123\") { token } }"
  }'

# 2. Gunakan token untuk query external booking
curl -X POST http://localhost:4000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token_dari_step_1>" \
  -d '{
    "query": "query { externalBookingById(externalBookingId: \"123\") { id bookingCode passengerName status } }"
  }'
```

**Atau gunakan GraphQL Playground:**
1. Buka http://localhost:4000/graphql
2. Set header: `{ "Authorization": "Bearer <token>" }`
3. Jalankan query:
```graphql
query {
  externalBookingById(externalBookingId: "123") {
    id
    bookingCode
    passengerName
    status
  }
}
```

### Test 2: Test sebagai Provider

**Test endpoint Auth Service dari kelompok lain:**

```bash
# Test dari host (simulasi kelompok lain)
curl -X POST http://localhost:4001 \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { userById(id: \"1\") { id username fullName email role } }"
  }'
```

**Test dengan JWT token:**
```bash
# 1. Login untuk mendapatkan token
curl -X POST http://localhost:4001 \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { login(username: \"testuser\", password: \"password123\") { token } }"
  }'

# 2. Gunakan token untuk query me
curl -X POST http://localhost:4001 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "query": "query { me { id username fullName email } }"
  }'
```

---

## 🔧 Troubleshooting

### Error: Connection Refused

**Penyebab**: Service kelompok lain belum running atau URL salah

**Solusi**:
1. Pastikan service kelompok lain sudah running
2. Cek URL dan port di environment variable
3. Test koneksi:
   ```bash
   # Test dari dalam container
   docker-compose exec flight-booking-service curl http://external-booking-service:4000
   
   # Atau test dari host
   curl http://localhost:5000  # Port yang di-expose
   ```
4. Pastikan network Docker sudah terhubung:
   ```bash
   docker network ls
   docker network inspect jmkair-network
   ```

### Error: Network tidak terhubung

**Solusi**:
```yaml
# Pastikan semua service di network yang sama
services:
  flight-booking-service:
    networks:
      - jmkair-network
  
  external-booking-service:
    networks:
      - jmkair-network
```

### Error: Authentication Failed

**Penyebab**: Token tidak valid atau tidak ada

**Solusi**:
1. Pastikan JWT token valid
2. Cek secret key JWT sama dengan provider
3. Pastikan header Authorization sudah diset:
   ```javascript
   headers: {
     'Authorization': 'Bearer <token>',
     'Content-Type': 'application/json'
   }
   ```

### Error: Schema Mismatch

**Penyebab**: Schema GraphQL tidak sesuai

**Solusi**:
1. Koordinasi dengan kelompok lain untuk menyamakan schema
2. Gunakan GraphQL introspection untuk melihat schema:
   ```graphql
   query {
     __schema {
       types {
         name
         fields {
           name
           type {
             name
           }
         }
       }
     }
   }
   ```
3. Update query/mutation sesuai schema yang disepakati

### Error: Timeout

**Penyebab**: Service eksternal lambat atau tidak merespons

**Solusi**:
1. Tambahkan timeout di axios:
   ```javascript
   const response = await axios.post(url, data, {
     timeout: 5000  // 5 detik
   });
   ```
2. Implementasikan retry logic
3. Handle error dengan baik (jangan crash service)

---

## 📝 Best Practices

1. **Error Handling**: Selalu handle error dengan baik
   ```javascript
   try {
     const result = await callExternalService();
   } catch (error) {
     console.error('Error calling external service:', error);
     // Jangan throw error yang akan crash service
     // Return default value atau error yang user-friendly
   }
   ```

2. **Timeout**: Set timeout yang wajar
   ```javascript
   axios.post(url, data, { timeout: 5000 });
   ```

3. **Logging**: Log semua request ke service eksternal
   ```javascript
   console.log(`Calling external service: ${url}`);
   console.log(`Response:`, response.data);
   ```

4. **Caching**: Pertimbangkan caching untuk mengurangi beban
   ```javascript
   // Contoh dengan simple cache
   const cache = new Map();
   const cacheKey = `booking-${id}`;
   if (cache.has(cacheKey)) {
     return cache.get(cacheKey);
   }
   const result = await getExternalBooking(id);
   cache.set(cacheKey, result);
   return result;
   ```

5. **Documentation**: Dokumentasikan semua endpoint
   - Endpoint yang dikonsumsi
   - Endpoint yang disediakan
   - Schema GraphQL
   - Authentication method

6. **Versioning**: Pertimbangkan versioning untuk schema
   ```graphql
   # v1
   type Booking { ... }
   
   # v2
   type BookingV2 { ... }
   ```

---

## 📞 Koordinasi dengan Kelompok Lain

### Informasi yang Perlu Dibagikan

**Sebagai Provider:**
- Base URL service
- Port yang digunakan
- Schema GraphQL (file .graphql atau dokumentasi)
- Authentication method
- Contoh query/mutation
- JWT secret (jika diperlukan)

**Sebagai Consumer:**
- Endpoint yang ingin dikonsumsi
- Schema yang diharapkan
- Authentication yang diperlukan
- Use case yang ingin diimplementasikan

### Template Email/Pesan Koordinasi

```
Subject: Koordinasi Integrasi Service - JMK AIR

Halo [Kelompok Lain],

Kami dari kelompok JMK AIR ingin melakukan integrasi dengan service Anda.

Sebagai PROVIDER, kami menyediakan:
- Auth Service: http://auth-service:4001
  - Query: userById(id: ID!): User
  - Query: me: User (requires JWT)
  
Sebagai CONSUMER, kami ingin mengkonsumsi:
- Booking Service: [URL service Anda]
  - Query: bookingById(id: ID!): Booking
  
Mohon konfirmasi:
1. URL endpoint yang dapat kami akses
2. Schema GraphQL yang tersedia
3. Method authentication
4. JWT secret (jika menggunakan JWT)

Terima kasih!
```

---

## ✅ Checklist Final

Sebelum menganggap integrasi selesai:

- [ ] Service dapat diakses (test connection)
- [ ] Query/Mutation berhasil dijalankan
- [ ] Authentication bekerja (jika ada)
- [ ] Error handling sudah diimplementasikan
- [ ] Logging sudah ditambahkan
- [ ] Dokumentasi sudah lengkap
- [ ] Testing sudah dilakukan
- [ ] Koordinasi dengan kelompok lain sudah dilakukan
- [ ] Schema sudah disepakati
- [ ] Network configuration sudah benar

---

**Catatan**: Panduan ini adalah panduan praktis. Untuk dokumentasi lengkap, lihat [INTEGRASI_LINTAS_KELOMPOK.md](./INTEGRASI_LINTAS_KELOMPOK.md)

