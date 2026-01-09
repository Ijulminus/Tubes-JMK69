# Dokumentasi Integrasi dengan Kelompok 2 (IAE_TuBes-main)

## 📋 Overview

Dokumen ini menjelaskan bagaimana **Kelompok 1 (TUBES js v2)** mengintegrasikan dan mengkonsumsi service dari **Kelompok 2 (IAE_TuBes-main)**.

## 🔗 Service yang Dikonsumsi

### Booking Service dari Kelompok 2

**Endpoint**: `http://host.docker.internal:4003`  
**Service**: Booking Service (IAE_TuBes-main)  
**Port External**: 4003

## 📊 Schema GraphQL Kelompok 2

### Type Booking

```graphql
type Booking {
  id: ID!
  status: String
  flightScheduleId: String
  passengerName: String
}
```

### Query yang Tersedia

```graphql
type Query {
  myBookings: [Booking]
  bookingById(id: ID!): Booking  # Untuk integrasi lintas kelompok
}
```

## 🚀 Implementasi di Kelompok 1

### 1. Environment Variable

**File**: `docker-compose.yml`

```yaml
flight-booking-service:
  environment:
    KELOMPOK2_BOOKING_SERVICE: http://host.docker.internal:4003
```

### 2. Helper Function

**File**: `flight-booking-service/index.js`

```javascript
// Helper function untuk mengambil booking dari Kelompok 2
async function getKelompok2Booking(bookingId, userId = null) {
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (userId) {
      headers['user-id'] = userId;
    }
    
    const response = await axios.post(
      `${KELOMPOK2_BOOKING_SERVICE}`,
      {
        query: `
          query {
            bookingById(id: "${bookingId}") {
              id
              status
              flightScheduleId
              passengerName
            }
          }
        `
      },
      { 
        headers,
        timeout: 5000
      }
    );
    
    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }
    
    return response.data.data.bookingById;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error(`Tidak dapat terhubung ke booking service kelompok 2: ${KELOMPOK2_BOOKING_SERVICE}`);
    }
    throw new Error(`Gagal mengambil booking dari kelompok 2: ${error.message}`);
  }
}
```

### 3. GraphQL Schema

**File**: `flight-booking-service/index.js`

```graphql
# Type untuk informasi booking dari Kelompok 2
type Kelompok2BookingInfo {
  id: ID!
  status: String
  flightScheduleId: String
  passengerName: String
}

extend type Query {
  # Query untuk mengambil booking dari Kelompok 2
  kelompok2BookingById(bookingId: ID!): Kelompok2BookingInfo
}
```

### 4. Resolver

```javascript
Query: {
  kelompok2BookingById: async (_, { bookingId }, context) => {
    if (!context.userId) throw new Error('Unauthorized');
    
    try {
      const kelompok2Booking = await getKelompok2Booking(bookingId, context.userId.toString());
      return {
        id: kelompok2Booking.id,
        status: kelompok2Booking.status,
        flightScheduleId: kelompok2Booking.flightScheduleId,
        passengerName: kelompok2Booking.passengerName
      };
    } catch (error) {
      throw new Error(`Gagal mengambil booking dari kelompok 2: ${error.message}`);
    }
  }
}
```

## 💻 Cara Menggunakan

### Prasyarat

1. **Pastikan Kelompok 2 sudah running**:
   ```bash
   cd "C:\KAMPUS\SEMESTER 5\IAE_TuBes-main"
   docker-compose up
   ```

2. **Pastikan Kelompok 1 sudah running**:
   ```bash
   cd "C:\KAMPUS\SEMESTER 5\EAI\TUBES js v2"
   docker-compose up
   ```

### Step 1: Login untuk Mendapatkan Token

**Endpoint**: `http://localhost:4000/graphql` (Gateway Kelompok 1)

```graphql
mutation {
  login(username: "testuser", password: "password123") {
    token
    user {
      id
      username
    }
  }
}
```

**Response**:
```json
{
  "data": {
    "login": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "1",
        "username": "testuser"
      }
    }
  }
}
```

### Step 2: Query Booking dari Kelompok 2

**Endpoint**: `http://localhost:4000/graphql` (Gateway Kelompok 1)

**Headers**:
```json
{
  "Authorization": "Bearer <token_dari_step_1>"
}
```

**Query**:
```graphql
query {
  kelompok2BookingById(bookingId: "1") {
    id
    status
    flightScheduleId
    passengerName
  }
}
```

**Response**:
```json
{
  "data": {
    "kelompok2BookingById": {
      "id": "1",
      "status": "BOOKED",
      "flightScheduleId": "JMK001",
      "passengerName": "John Doe"
    }
  }
}
```

## 🧪 Testing

### Test 1: Test Koneksi ke Kelompok 2

```bash
# Test dari host
curl -X POST http://localhost:4003 \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { bookingById(id: \"1\") { id status passengerName } }"
  }'
```

### Test 2: Test dari GraphQL Playground

1. Buka `http://localhost:4000/graphql`
2. Set header: `{ "Authorization": "Bearer <token>" }`
3. Jalankan query:
```graphql
query {
  kelompok2BookingById(bookingId: "1") {
    id
    status
    passengerName
  }
}
```

## 🔧 Troubleshooting

### Error: Connection Refused

**Penyebab**: Kelompok 2 belum running atau port salah

**Solusi**:
1. Pastikan Kelompok 2 sudah running:
   ```bash
   docker-compose ps
   ```
2. Cek port 4003 sudah di-expose:
   ```bash
   # Di docker-compose.yml Kelompok 2
   ports:
     - "4003:4000"
   ```
3. Test koneksi:
   ```bash
   curl http://localhost:4003
   ```

### Error: Timeout

**Penyebab**: Service Kelompok 2 lambat merespons

**Solusi**:
1. Cek logs Kelompok 2:
   ```bash
   docker-compose logs booking-service
   ```
2. Pastikan database Kelompok 2 sudah ready
3. Cek resource server

### Error: Unauthorized

**Penyebab**: Token tidak valid atau tidak ada

**Solusi**:
1. Pastikan menggunakan token yang valid dari login
2. Set header dengan format: `Authorization: Bearer <token>`
3. Pastikan user sudah login

### Error: Booking tidak ditemukan

**Penyebab**: ID booking tidak ada di Kelompok 2

**Solusi**:
1. Buat booking terlebih dahulu di Kelompok 2
2. Gunakan ID booking yang valid
3. Cek database Kelompok 2

## 📝 Contoh Use Case

### Skenario: Melihat Booking yang Dibuat di Sistem Kelompok 2

**Flow**:
1. User membuat booking di sistem Kelompok 2
2. User ingin melihat booking tersebut dari sistem Kelompok 1
3. Flight Booking Service memanggil Booking Service Kelompok 2
4. Data booking ditampilkan

**Query**:
```graphql
query {
  kelompok2BookingById(bookingId: "123") {
    id
    status
    flightScheduleId
    passengerName
  }
}
```

## 🔐 Authentication

- **Query `bookingById` di Kelompok 2**: Tidak memerlukan authentication (untuk integrasi)
- **Query `kelompok2BookingById` di Kelompok 1**: Memerlukan JWT token

## 📊 Error Handling

Error handling sudah diimplementasikan untuk:
- Connection refused
- Timeout (5 detik)
- GraphQL errors
- Network errors

## 🌐 Network Configuration

Menggunakan `host.docker.internal` untuk komunikasi lintas docker-compose:

- **Windows/Mac**: Otomatis tersedia
- **Linux**: Perlu menambahkan `extra_hosts`:
  ```yaml
  extra_hosts:
    - "host.docker.internal:host-gateway"
  ```

## 📚 Referensi

- Dokumentasi lengkap integrasi: `INTEGRASI_KELOMPOK1_KELOMPOK2.md`
- Schema GraphQL Kelompok 2: Lihat dokumentasi Kelompok 2

## ✅ Checklist Integrasi

- [x] Environment variable sudah ditambahkan
- [x] Helper function sudah dibuat
- [x] GraphQL schema sudah diupdate
- [x] Resolver sudah diimplementasikan
- [x] Error handling sudah ditambahkan
- [x] Timeout sudah diset (5 detik)
- [x] Dokumentasi sudah lengkap

---

**Last Updated**: 2025-01-15  
**Status**: ✅ Integrated  
**Contact**: Tim Kelompok 1 (TUBES js v2)

