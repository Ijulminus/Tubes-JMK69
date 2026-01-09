# Dokumentasi Integrasi Lintas Kelompok - JMK AIR

## Overview

Dokumen ini menjelaskan cara melakukan integrasi antara sistem JMK AIR dengan kelompok lain menggunakan GraphQL sebagai kontrak komunikasi.

## Prinsip Integrasi

1. **GraphQL sebagai Kontrak**: Semua komunikasi lintas kelompok menggunakan GraphQL
2. **Service Discovery**: Setiap kelompok menyediakan endpoint GraphQL yang dapat diakses
3. **Authentication**: Menggunakan JWT token untuk autentikasi (jika diperlukan)
4. **Documentation**: Endpoint harus terdokumentasi dengan jelas

---

## 1. Sebagai CONSUMER (Mengkonsumsi Endpoint Kelompok Lain)

### 1.1 Flight Booking Service - Mengambil Booking dari Kelompok Lain

Flight Booking Service JMK AIR dapat mengkonsumsi endpoint booking dari kelompok lain untuk:
- Melihat status booking yang dibuat di sistem kelompok lain
- Sinkronisasi data booking lintas sistem

#### Endpoint yang Dikonsumsi

**Service**: External Booking Service (Kelompok Lain)  
**URL**: `http://external-booking-service:4000` (atau sesuai konfigurasi kelompok lain)  
**Method**: GraphQL Query

#### Query yang Digunakan

```graphql
query GetExternalBooking($bookingId: ID!) {
  bookingById(id: $bookingId) {
    id
    bookingCode
    passengerName
    status
    createdAt
  }
}
```

#### Cara Menggunakan di JMK AIR

**1. Query untuk melihat booking dari kelompok lain:**

```graphql
query {
  externalBookingById(externalBookingId: "123") {
    id
    bookingCode
    passengerName
    status
    createdAt
  }
}
```

**Headers yang diperlukan:**
```
Authorization: Bearer <token_dari_login>
```

**2. Sinkronisasi booking dari kelompok lain ke sistem JMK AIR:**

```graphql
mutation {
  syncExternalBooking(externalBookingId: "123") {
    id
    flightCode
    passengerName
    status
    externalBookingId
  }
}
```

#### Konfigurasi Environment Variable

Tambahkan di `docker-compose.yml` untuk service `flight-booking-service`:

```yaml
flight-booking-service:
  environment:
    EXTERNAL_BOOKING_SERVICE: http://external-booking-service:4000
```

Atau set di file `.env`:
```
EXTERNAL_BOOKING_SERVICE=http://external-booking-service:4000
```

#### Contoh Response dari Kelompok Lain

```json
{
  "data": {
    "bookingById": {
      "id": "123",
      "bookingCode": "EXT-BK-001",
      "passengerName": "John Doe",
      "status": "CONFIRMED",
      "createdAt": "2025-01-15T10:30:00Z"
    }
  }
}
```

---

## 2. Sebagai PROVIDER (Menyediakan Endpoint untuk Kelompok Lain)

### 2.1 Auth Service - Identity Provider

Auth Service JMK AIR menyediakan endpoint untuk validasi identitas pengguna lintas sistem.

#### Endpoint yang Disediakan

**Service**: Auth Service JMK AIR  
**URL**: `http://auth-service:4001` (atau `http://localhost:4001` untuk testing)  
**Method**: GraphQL Query

#### Query yang Tersedia

**1. Get User by ID**

```graphql
query GetUser($userId: ID!) {
  userById(id: $userId) {
    id
    username
    fullName
    email
    role
    status
  }
}
```

**Contoh Request dari Kelompok Lain:**

```graphql
query {
  userById(id: "1") {
    id
    username
    fullName
    email
    role
    status
  }
}
```

**Response:**
```json
{
  "data": {
    "userById": {
      "id": "1",
      "username": "johndoe",
      "fullName": "John Doe",
      "email": "john@example.com",
      "role": "USER",
      "status": "ACTIVE"
    }
  }
}
```

**2. Get Current User (Me)**

```graphql
query {
  me {
    id
    username
    fullName
    email
    role
  }
}
```

**Headers yang diperlukan:**
```
Authorization: Bearer <jwt_token>
```

#### Dokumentasi Endpoint untuk Kelompok Lain

**Base URL**: `http://auth-service:4001`  
**GraphQL Endpoint**: `http://auth-service:4001` (POST)

**Available Queries:**
- `userById(id: ID!): User` - Mengambil data user berdasarkan ID
- `me: User` - Mengambil data user yang sedang login (memerlukan JWT token)

**Available Mutations:**
- `register(...): User` - Registrasi user baru
- `login(username: String!, password: String!): AuthPayload` - Login dan mendapatkan JWT token

---

### 2.2 Flight Booking Service - Booking Provider

Flight Booking Service JMK AIR menyediakan endpoint untuk melihat booking yang dibuat di sistem JMK AIR.

#### Endpoint yang Disediakan

**Service**: Flight Booking Service JMK AIR  
**URL**: `http://flight-booking-service:4003`  
**Method**: GraphQL Query

#### Query yang Tersedia

**Get Booking by ID**

```graphql
query GetBooking($bookingId: ID!) {
  bookingById(id: $bookingId) {
    id
    flightCode
    passengerName
    numberOfSeats
    totalPrice
    status
    paymentStatus
  }
}
```

**Contoh Request dari Kelompok Lain:**

```graphql
query {
  bookingById(id: "1") {
    id
    flightCode
    passengerName
    status
    paymentStatus
  }
}
```

**Headers yang diperlukan:**
```
Authorization: Bearer <jwt_token>
user-id: <user_id>
```

**Response:**
```json
{
  "data": {
    "bookingById": {
      "id": "1",
      "flightCode": "JMK001",
      "passengerName": "John Doe",
      "status": "CONFIRMED",
      "paymentStatus": "PAID"
    }
  }
}
```

---

## 3. Langkah-langkah Integrasi

### Step 1: Koordinasi dengan Kelompok Lain

1. **Tentukan Endpoint yang Akan Digunakan**
   - Diskusikan endpoint GraphQL yang akan dikonsumsi/disediakan
   - Pastikan schema GraphQL sudah disepakati
   - Tentukan URL dan port service

2. **Tentukan Authentication Method**
   - Jika menggunakan JWT, pastikan secret key sama atau ada mekanisme validasi lintas sistem
   - Atau gunakan API key jika diperlukan

### Step 2: Konfigurasi Network

**Jika menggunakan Docker Compose bersama:**

Tambahkan service kelompok lain ke `docker-compose.yml`:

```yaml
services:
  # Service dari kelompok lain
  external-booking-service:
    image: external-group/booking-service:latest
    ports:
      - "5000:4000"
    networks:
      - jmkair-network
    # ... konfigurasi lainnya
```

**Jika service berjalan terpisah:**

Pastikan service dapat diakses melalui network yang sama atau gunakan URL publik.

### Step 3: Update Environment Variables

Update environment variable di service yang akan mengkonsumsi endpoint:

```yaml
flight-booking-service:
  environment:
    EXTERNAL_BOOKING_SERVICE: http://external-booking-service:4000
```

### Step 4: Testing Integrasi

**1. Test sebagai Consumer:**

```bash
# Test query ke kelompok lain
curl -X POST http://external-booking-service:4000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "query": "query { bookingById(id: \"123\") { id status } }"
  }'
```

**2. Test sebagai Provider:**

```bash
# Test query dari kelompok lain ke JMK AIR
curl -X POST http://auth-service:4001 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "query": "query { userById(id: \"1\") { id username } }"
  }'
```

---

## 4. Contoh Skenario Integrasi

### Skenario 1: Validasi User dari Sistem Lain

**Kelompok Lain** ingin memvalidasi user yang login di sistem mereka menggunakan Auth Service JMK AIR.

**Flow:**
1. User login di sistem kelompok lain
2. Sistem kelompok lain memanggil Auth Service JMK AIR untuk validasi
3. Auth Service mengembalikan data user jika valid

**Query dari Kelompok Lain:**
```graphql
query {
  userById(id: "1") {
    id
    username
    fullName
    role
    status
  }
}
```

### Skenario 2: Sinkronisasi Booking

**JMK AIR** ingin melihat dan sinkronisasi booking yang dibuat di sistem kelompok lain.

**Flow:**
1. User membuat booking di sistem kelompok lain
2. User ingin melihat booking tersebut di sistem JMK AIR
3. Flight Booking Service memanggil External Booking Service
4. Data booking disinkronisasi ke sistem JMK AIR

**Query dari JMK AIR:**
```graphql
mutation {
  syncExternalBooking(externalBookingId: "123") {
    id
    passengerName
    status
    externalBookingId
  }
}
```

---

## 5. Troubleshooting

### Error: Connection Refused

**Penyebab**: Service kelompok lain belum running atau URL salah

**Solusi**:
1. Pastikan service kelompok lain sudah running
2. Cek URL dan port di environment variable
3. Pastikan network Docker sudah terhubung

### Error: Authentication Failed

**Penyebab**: Token tidak valid atau tidak ada

**Solusi**:
1. Pastikan JWT token valid
2. Cek secret key JWT sama dengan provider
3. Pastikan header Authorization sudah diset dengan benar

### Error: Schema Mismatch

**Penyebab**: Schema GraphQL tidak sesuai

**Solusi**:
1. Koordinasi dengan kelompok lain untuk menyamakan schema
2. Update query/mutation sesuai schema yang disepakati
3. Gunakan GraphQL introspection untuk melihat schema yang tersedia

---

## 6. Best Practices

1. **Error Handling**: Selalu handle error dengan baik, jangan crash jika service eksternal tidak tersedia
2. **Timeout**: Set timeout yang wajar untuk request ke service eksternal
3. **Caching**: Pertimbangkan caching untuk mengurangi beban service eksternal
4. **Logging**: Log semua request ke service eksternal untuk debugging
5. **Documentation**: Dokumentasikan semua endpoint yang dikonsumsi/disediakan
6. **Versioning**: Pertimbangkan versioning untuk schema GraphQL jika diperlukan

---

## 7. Checklist Integrasi

- [ ] Endpoint kelompok lain sudah ditentukan dan terdokumentasi
- [ ] Schema GraphQL sudah disepakati
- [ ] Network configuration sudah benar
- [ ] Environment variables sudah diset
- [ ] Authentication method sudah ditentukan
- [ ] Error handling sudah diimplementasikan
- [ ] Testing sudah dilakukan
- [ ] Dokumentasi sudah lengkap

---

## 8. Kontak dan Koordinasi

Untuk koordinasi integrasi dengan kelompok lain, pastikan:

1. **Endpoint URL** sudah jelas
2. **Schema GraphQL** sudah disepakati
3. **Authentication** sudah ditentukan
4. **Testing** sudah dilakukan bersama
5. **Dokumentasi** sudah dibagikan

---

## 9. Contoh File Konfigurasi

### docker-compose.yml (dengan service kelompok lain)

```yaml
services:
  # Service JMK AIR
  flight-booking-service:
    build: ./flight-booking-service
    environment:
      EXTERNAL_BOOKING_SERVICE: http://external-booking-service:4000
    networks:
      - jmkair-network
      - external-network

  # Service dari kelompok lain
  external-booking-service:
    image: external-group/booking-service:latest
    networks:
      - external-network
      - jmkair-network
```

---

## 10. Referensi

- [Apollo Federation Documentation](https://www.apollographql.com/docs/federation/)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [Microservices Integration Patterns](https://microservices.io/patterns/communication-style/messaging.html)

---

**Catatan**: Dokumen ini akan terus diupdate sesuai kebutuhan integrasi dengan kelompok lain.

