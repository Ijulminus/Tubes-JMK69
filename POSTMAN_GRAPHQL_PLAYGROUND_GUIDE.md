# 📘 Panduan Lengkap Postman & GraphQL Playground

## 📋 Daftar Isi

1. [Setup GraphQL Playground](#setup-graphql-playground)
2. [Setup Postman](#setup-postman)
3. [Collection: Auth Service](#collection-auth-service)
4. [Collection: Flight Schedule Service](#collection-flight-schedule-service)
5. [Collection: Flight Booking Service](#collection-flight-booking-service)
6. [Collection: Parcel Service](#collection-parcel-service)
7. [Collection: Onboard Service](#collection-onboard-service)
8. [Collection: Integrasi Lintas Kelompok](#collection-integrasi-lintas-kelompok)
9. [Testing Flow Lengkap](#testing-flow-lengkap)
10. [Troubleshooting](#troubleshooting)

---

## 🎮 Setup GraphQL Playground

### 1. Akses GraphQL Playground

**URL**: http://localhost:4000/graphql

### 2. Set HTTP Headers

Klik **HTTP HEADERS** di bagian bawah dan tambahkan:

```json
{
  "Authorization": "Bearer <token_dari_login>"
}
```

**Catatan**: Token didapat dari mutation `login`. Simpan token untuk digunakan di semua request berikutnya.

---

## 📮 Setup Postman

### 1. Import Collection

1. Buka Postman
2. Klik **Import**
3. Pilih **Raw text**
4. Copy-paste collection JSON (lihat bagian Collection di bawah)

### 2. Setup Environment Variables

Buat environment baru dengan variables:

| Variable | Initial Value | Current Value |
|----------|---------------|---------------|
| `base_url` | http://localhost:4000 | http://localhost:4000 |
| `token` | (kosong) | (akan diisi setelah login) |
| `user_id` | (kosong) | (akan diisi setelah login) |

### 3. Setup Pre-request Script (Opsional)

Untuk otomatis set token di semua request, tambahkan di Collection level:

```javascript
pm.request.headers.add({
    key: 'Authorization',
    value: 'Bearer ' + pm.environment.get('token')
});
```

---

## 🔐 Collection: Auth Service

### 1. Register User

**Method**: POST  
**URL**: `{{base_url}}/graphql`

**Query**:
```graphql
mutation {
  register(
    username: "testuser"
    fullName: "Test User"
    email: "test@example.com"
    password: "password123"
    role: "USER"
  ) {
    id
    username
    fullName
    email
    role
    status
  }
}
```

**Expected Response**:
```json
{
  "data": {
    "register": {
      "id": "1",
      "username": "testuser",
      "fullName": "Test User",
      "email": "test@example.com",
      "role": "USER",
      "status": "ACTIVE"
    }
  }
}
```

---

### 2. Login

**Method**: POST  
**URL**: `{{base_url}}/graphql`

**Query**:
```graphql
mutation {
  login(username: "testuser", password: "password123") {
    token
    user {
      id
      username
      fullName
      email
      role
    }
  }
}
```

**Expected Response**:
```json
{
  "data": {
    "login": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "1",
        "username": "testuser",
        "fullName": "Test User",
        "email": "test@example.com",
        "role": "USER"
      }
    }
  }
}
```

**⚠️ Simpan token untuk request berikutnya!**

**Postman**: Set `token` variable:
```javascript
// Di Tests tab
var jsonData = pm.response.json();
pm.environment.set("token", jsonData.data.login.token);
pm.environment.set("user_id", jsonData.data.login.user.id);
```

---

### 3. Get User By ID

**Method**: POST  
**URL**: `{{base_url}}/graphql`  
**Headers**: `Authorization: Bearer {{token}}`

**Query**:
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

---

### 4. Get Current User (Me)

**Method**: POST  
**URL**: `{{base_url}}/graphql`  
**Headers**: `Authorization: Bearer {{token}}`

**Query**:
```graphql
query {
  me {
    id
    username
    fullName
    email
    role
    status
  }
}
```

---

## ✈️ Collection: Flight Schedule Service

### 1. Create Flight Schedule

**Method**: POST  
**URL**: `{{base_url}}/graphql`  
**Headers**: `Authorization: Bearer {{token}}`

**Query**:
```graphql
mutation {
  createFlightSchedule(
    flightCode: "JMK001"
    aircraftType: "Boeing 737"
    departureLocation: "Jakarta"
    destinationLocation: "Bandung"
    departureTime: "2025-01-15T08:00:00Z"
    arrivalTime: "2025-01-15T09:30:00Z"
    price: 500000
    totalSeats: 150
  ) {
    id
    flightCode
    aircraftType
    departureLocation
    destinationLocation
    departureTime
    arrivalTime
    price
    totalSeats
    availableSeats
    status
  }
}
```

**Expected Response**:
```json
{
  "data": {
    "createFlightSchedule": {
      "id": "1",
      "flightCode": "JMK001",
      "aircraftType": "Boeing 737",
      "departureLocation": "Jakarta",
      "destinationLocation": "Bandung",
      "departureTime": "2025-01-15T08:00:00.000Z",
      "arrivalTime": "2025-01-15T09:30:00.000Z",
      "price": 500000,
      "totalSeats": 150,
      "availableSeats": 150,
      "status": "ACTIVE"
    }
  }
}
```

---

### 2. Get Flight Schedules

**Method**: POST  
**URL**: `{{base_url}}/graphql`

**Query** (Tanpa filter):
```graphql
query {
  flightSchedules {
    id
    flightCode
    departureLocation
    destinationLocation
    departureTime
    arrivalTime
    price
    availableSeats
    status
  }
}
```

**Query** (Dengan filter):
```graphql
query {
  flightSchedules(
    departureLocation: "Jakarta"
    destinationLocation: "Bandung"
    departureDate: "2025-01-15"
  ) {
    id
    flightCode
    departureLocation
    destinationLocation
    departureTime
    arrivalTime
    price
    availableSeats
    status
  }
}
```

---

### 3. Get Flight By ID

**Method**: POST  
**URL**: `{{base_url}}/graphql`

**Query**:
```graphql
query {
  flightById(id: "1") {
    id
    flightCode
    departureLocation
    destinationLocation
    price
    availableSeats
    status
  }
}
```

---

### 4. Get Flight By Code

**Method**: POST  
**URL**: `{{base_url}}/graphql`

**Query**:
```graphql
query {
  flightByCode(flightCode: "JMK001") {
    id
    flightCode
    departureLocation
    destinationLocation
    departureTime
    arrivalTime
    price
    availableSeats
    status
  }
}
```

---

### 5. Update Flight Schedule

**Method**: POST  
**URL**: `{{base_url}}/graphql`  
**Headers**: `Authorization: Bearer {{token}}`

**Query**:
```graphql
mutation {
  updateFlightSchedule(
    id: "1"
    departureTime: "2025-01-15T09:00:00Z"
    arrivalTime: "2025-01-15T10:30:00Z"
    price: 600000
    status: "ACTIVE"
  ) {
    id
    flightCode
    departureTime
    arrivalTime
    price
    status
  }
}
```

---

## 🎫 Collection: Flight Booking Service

### 1. Create Booking

**Method**: POST  
**URL**: `{{base_url}}/graphql`  
**Headers**: `Authorization: Bearer {{token}}`

**Query**:
```graphql
mutation {
  createBooking(
    flightCode: "JMK001"
    passengerName: "John Doe"
    numberOfSeats: 2
    seatNumber: "A1, A2"
  ) {
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

**Expected Response**:
```json
{
  "data": {
    "createBooking": {
      "id": "1",
      "flightCode": "JMK001",
      "passengerName": "John Doe",
      "numberOfSeats": 2,
      "totalPrice": 1000000,
      "status": "BOOKED",
      "paymentStatus": "UNPAID"
    }
  }
}
```

---

### 2. Get My Bookings

**Method**: POST  
**URL**: `{{base_url}}/graphql`  
**Headers**: `Authorization: Bearer {{token}}`

**Query**:
```graphql
query {
  myBookings {
    id
    flightCode
    passengerName
    numberOfSeats
    totalPrice
    status
    paymentStatus
    createdAt
  }
}
```

---

### 3. Get Booking By ID

**Method**: POST  
**URL**: `{{base_url}}/graphql`  
**Headers**: `Authorization: Bearer {{token}}`

**Query**:
```graphql
query {
  bookingById(id: "1") {
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

---

### 4. Update Booking Status

**Method**: POST  
**URL**: `{{base_url}}/graphql`  
**Headers**: `Authorization: Bearer {{token}}`

**Query**:
```graphql
mutation {
  updateBookingStatus(id: "1", status: "CANCELLED") {
    id
    status
  }
}
```

---

### 5. Confirm Payment

**Method**: POST  
**URL**: `{{base_url}}/graphql`  
**Headers**: `Authorization: Bearer {{token}}`

**Query**:
```graphql
mutation {
  confirmPayment(bookingId: "1", paymentId: "PAY12345") {
    id
    status
    paymentStatus
    paymentId
  }
}
```

**Expected Response**:
```json
{
  "data": {
    "confirmPayment": {
      "id": "1",
      "status": "CONFIRMED",
      "paymentStatus": "PAID",
      "paymentId": "PAY12345"
    }
  }
}
```

---

## 📦 Collection: Parcel Service

### 1. Create Parcel Order

**Method**: POST  
**URL**: `{{base_url}}/graphql`  
**Headers**: `Authorization: Bearer {{token}}`

**Query**:
```graphql
mutation {
  createParcelOrder(
    bookingId: 1
    flightCode: "JMK001"
    senderName: "John Doe"
    senderAddress: "Jakarta"
    receiverName: "Jane Doe"
    receiverAddress: "Bandung"
    weight: 5.5
    dimensions: "30x20x15"
  ) {
    id
    flightCode
    senderName
    receiverName
    weight
    cost
    status
  }
}
```

---

### 2. Get My Parcel Orders

**Method**: POST  
**URL**: `{{base_url}}/graphql`  
**Headers**: `Authorization: Bearer {{token}}`

**Query**:
```graphql
query {
  myParcelOrders {
    id
    flightCode
    senderName
    receiverName
    weight
    cost
    status
  }
}
```

---

### 3. Get Parcel Order By ID

**Method**: POST  
**URL**: `{{base_url}}/graphql`  
**Headers**: `Authorization: Bearer {{token}}`

**Query**:
```graphql
query {
  parcelOrderById(id: "1") {
    id
    flightCode
    senderName
    receiverName
    weight
    dimensions
    cost
    status
  }
}
```

---

## 🍽️ Collection: Onboard Service

### 1. Create Menu Item

**Method**: POST  
**URL**: `{{base_url}}/graphql`  
**Headers**: `Authorization: Bearer {{token}}`

**Query**:
```graphql
mutation {
  createMenuItem(
    name: "Nasi Goreng"
    description: "Nasi goreng spesial"
    category: "Food"
    price: 50000
  ) {
    id
    name
    description
    category
    price
    available
  }
}
```

---

### 2. Get Menu Items

**Method**: POST  
**URL**: `{{base_url}}/graphql`

**Query**:
```graphql
query {
  menuItems {
    id
    name
    description
    category
    price
    available
  }
}
```

---

### 3. Create Onboard Order

**Method**: POST  
**URL**: `{{base_url}}/graphql`  
**Headers**: `Authorization: Bearer {{token}}`

**Query**:
```graphql
mutation {
  createOnboardOrder(
    bookingId: 1
    items: [
      { menuItemId: "1", quantity: 2 }
      { menuItemId: "2", quantity: 1 }
    ]
  ) {
    id
    flightCode
    totalPrice
    status
    items
  }
}
```

---

### 4. Get My Onboard Orders

**Method**: POST  
**URL**: `{{base_url}}/graphql`  
**Headers**: `Authorization: Bearer {{token}}`

**Query**:
```graphql
query {
  myOnboardOrders {
    id
    flightCode
    totalPrice
    status
    items
  }
}
```

---

## 🔗 Collection: Integrasi Lintas Kelompok

### 1. Get Booking dari Kelompok 2

**Method**: POST  
**URL**: `{{base_url}}/graphql`  
**Headers**: `Authorization: Bearer {{token}}`

**Query**:
```graphql
query {
  kelompok2BookingById(bookingId: "1") {
    id
    userId
    type
    hotelName
    flightCode
    passengerName
    status
  }
}
```

**Expected Response**:
```json
{
  "data": {
    "kelompok2BookingById": {
      "id": "1",
      "userId": "1",
      "type": "FLIGHT",
      "hotelName": null,
      "flightCode": "JMK001",
      "passengerName": "John Doe",
      "status": "BOOKED"
    }
  }
}
```

---

### 2. Get External Booking

**Method**: POST  
**URL**: `{{base_url}}/graphql`  
**Headers**: `Authorization: Bearer {{token}}`

**Query**:
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

---

### 3. Sync External Booking

**Method**: POST  
**URL**: `{{base_url}}/graphql`  
**Headers**: `Authorization: Bearer {{token}}`

**Query**:
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

---

## 🧪 Testing Flow Lengkap

### Flow 1: Complete Booking Flow

#### Step 1: Register User
```graphql
mutation {
  register(
    username: "testuser"
    fullName: "Test User"
    email: "test@example.com"
    password: "password123"
  ) {
    id
    username
  }
}
```

#### Step 2: Login
```graphql
mutation {
  login(username: "testuser", password: "password123") {
    token
    user {
      id
    }
  }
}
```

**Simpan token!**

#### Step 3: Create Flight Schedule
```graphql
mutation {
  createFlightSchedule(
    flightCode: "JMK001"
    aircraftType: "Boeing 737"
    departureLocation: "Jakarta"
    destinationLocation: "Bandung"
    departureTime: "2025-01-15T08:00:00Z"
    arrivalTime: "2025-01-15T09:30:00Z"
    price: 500000
    totalSeats: 150
  ) {
    id
    flightCode
    availableSeats
  }
}
```

#### Step 4: Create Booking
```graphql
mutation {
  createBooking(
    flightCode: "JMK001"
    passengerName: "Test User"
    numberOfSeats: 2
  ) {
    id
    flightCode
    totalPrice
    status
  }
}
```

#### Step 5: Confirm Payment
```graphql
mutation {
  confirmPayment(bookingId: "1", paymentId: "PAY12345") {
    id
    status
    paymentStatus
  }
}
```

#### Step 6: Create Parcel Order
```graphql
mutation {
  createParcelOrder(
    bookingId: 1
    flightCode: "JMK001"
    senderName: "Test User"
    senderAddress: "Jakarta"
    receiverName: "Receiver"
    receiverAddress: "Bandung"
    weight: 5.5
    dimensions: "30x20x15"
  ) {
    id
    cost
    status
  }
}
```

#### Step 7: Create Onboard Order
```graphql
mutation {
  createOnboardOrder(
    bookingId: 1
    items: [
      { menuItemId: "1", quantity: 2 }
    ]
  ) {
    id
    totalPrice
    status
  }
}
```

---

### Flow 2: Integrasi dengan Kelompok 2

#### Prasyarat
1. Pastikan Kelompok 2 sudah running
2. Buat booking di Kelompok 2 terlebih dahulu

#### Step 1: Login di Kelompok 1
```graphql
mutation {
  login(username: "testuser", password: "password123") {
    token
  }
}
```

#### Step 2: Query Booking dari Kelompok 2
```graphql
query {
  kelompok2BookingById(bookingId: "1") {
    id
    type
    flightCode
    passengerName
    status
  }
}
```

---

## 📋 Postman Collection JSON

### Import Collection ke Postman

Copy JSON berikut dan import ke Postman:

```json
{
  "info": {
    "name": "JMK AIR - GraphQL API",
    "description": "Complete GraphQL API collection for JMK AIR",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:4000",
      "type": "string"
    },
    {
      "key": "token",
      "value": "",
      "type": "string"
    }
  ],
  "item": [
    {
      "name": "Auth Service",
      "item": [
        {
          "name": "Register",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "graphql",
              "graphql": {
                "query": "mutation {\n  register(\n    username: \"testuser\"\n    fullName: \"Test User\"\n    email: \"test@example.com\"\n    password: \"password123\"\n  ) {\n    id\n    username\n    email\n  }\n}"
              }
            },
            "url": {
              "raw": "{{base_url}}/graphql",
              "host": ["{{base_url}}"],
              "path": ["graphql"]
            }
          }
        },
        {
          "name": "Login",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "var jsonData = pm.response.json();",
                  "if (jsonData.data && jsonData.data.login) {",
                  "    pm.environment.set(\"token\", jsonData.data.login.token);",
                  "    pm.environment.set(\"user_id\", jsonData.data.login.user.id);",
                  "}"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "graphql",
              "graphql": {
                "query": "mutation {\n  login(username: \"testuser\", password: \"password123\") {\n    token\n    user {\n      id\n      username\n    }\n  }\n}"
              }
            },
            "url": {
              "raw": "{{base_url}}/graphql",
              "host": ["{{base_url}}"],
              "path": ["graphql"]
            }
          }
        },
        {
          "name": "Get Me",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "Authorization",
                "value": "Bearer {{token}}"
              }
            ],
            "body": {
              "mode": "graphql",
              "graphql": {
                "query": "query {\n  me {\n    id\n    username\n    fullName\n    email\n    role\n  }\n}"
              }
            },
            "url": {
              "raw": "{{base_url}}/graphql",
              "host": ["{{base_url}}"],
              "path": ["graphql"]
            }
          }
        }
      ]
    },
    {
      "name": "Flight Schedule Service",
      "item": [
        {
          "name": "Create Flight Schedule",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "Authorization",
                "value": "Bearer {{token}}"
              }
            ],
            "body": {
              "mode": "graphql",
              "graphql": {
                "query": "mutation {\n  createFlightSchedule(\n    flightCode: \"JMK001\"\n    aircraftType: \"Boeing 737\"\n    departureLocation: \"Jakarta\"\n    destinationLocation: \"Bandung\"\n    departureTime: \"2025-01-15T08:00:00Z\"\n    arrivalTime: \"2025-01-15T09:30:00Z\"\n    price: 500000\n    totalSeats: 150\n  ) {\n    id\n    flightCode\n    availableSeats\n  }\n}"
              }
            },
            "url": {
              "raw": "{{base_url}}/graphql",
              "host": ["{{base_url}}"],
              "path": ["graphql"]
            }
          }
        },
        {
          "name": "Get Flight Schedules",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "graphql",
              "graphql": {
                "query": "query {\n  flightSchedules {\n    id\n    flightCode\n    departureLocation\n    destinationLocation\n    price\n    availableSeats\n  }\n}"
              }
            },
            "url": {
              "raw": "{{base_url}}/graphql",
              "host": ["{{base_url}}"],
              "path": ["graphql"]
            }
          }
        },
        {
          "name": "Get Flight By Code",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "graphql",
              "graphql": {
                "query": "query {\n  flightByCode(flightCode: \"JMK001\") {\n    id\n    flightCode\n    price\n    availableSeats\n    status\n  }\n}"
              }
            },
            "url": {
              "raw": "{{base_url}}/graphql",
              "host": ["{{base_url}}"],
              "path": ["graphql"]
            }
          }
        }
      ]
    },
    {
      "name": "Flight Booking Service",
      "item": [
        {
          "name": "Create Booking",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "Authorization",
                "value": "Bearer {{token}}"
              }
            ],
            "body": {
              "mode": "graphql",
              "graphql": {
                "query": "mutation {\n  createBooking(\n    flightCode: \"JMK001\"\n    passengerName: \"John Doe\"\n    numberOfSeats: 2\n  ) {\n    id\n    flightCode\n    totalPrice\n    status\n  }\n}"
              }
            },
            "url": {
              "raw": "{{base_url}}/graphql",
              "host": ["{{base_url}}"],
              "path": ["graphql"]
            }
          }
        },
        {
          "name": "Get My Bookings",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "Authorization",
                "value": "Bearer {{token}}"
              }
            ],
            "body": {
              "mode": "graphql",
              "graphql": {
                "query": "query {\n  myBookings {\n    id\n    flightCode\n    passengerName\n    status\n    paymentStatus\n  }\n}"
              }
            },
            "url": {
              "raw": "{{base_url}}/graphql",
              "host": ["{{base_url}}"],
              "path": ["graphql"]
            }
          }
        },
        {
          "name": "Confirm Payment",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "Authorization",
                "value": "Bearer {{token}}"
              }
            ],
            "body": {
              "mode": "graphql",
              "graphql": {
                "query": "mutation {\n  confirmPayment(bookingId: \"1\", paymentId: \"PAY12345\") {\n    id\n    status\n    paymentStatus\n  }\n}"
              }
            },
            "url": {
              "raw": "{{base_url}}/graphql",
              "host": ["{{base_url}}"],
              "path": ["graphql"]
            }
          }
        }
      ]
    },
    {
      "name": "Integrasi Lintas Kelompok",
      "item": [
        {
          "name": "Get Booking dari Kelompok 2",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "Authorization",
                "value": "Bearer {{token}}"
              }
            ],
            "body": {
              "mode": "graphql",
              "graphql": {
                "query": "query {\n  kelompok2BookingById(bookingId: \"1\") {\n    id\n    type\n    flightCode\n    passengerName\n    status\n  }\n}"
              }
            },
            "url": {
              "raw": "{{base_url}}/graphql",
              "host": ["{{base_url}}"],
              "path": ["graphql"]
            }
          }
        }
      ]
    }
  ]
}
```

---

## 🔧 Troubleshooting

### Error: Unauthorized

**Penyebab**: Token tidak valid atau tidak ada

**Solusi**:
1. Pastikan sudah login dan mendapatkan token
2. Set header: `Authorization: Bearer <token>`
3. Token expired setelah 24 jam, login ulang

### Error: Cannot query field

**Penyebab**: Query tidak sesuai dengan schema

**Solusi**:
1. Cek field yang di-request ada di schema
2. Gunakan GraphQL introspection untuk melihat schema:
   ```graphql
   query {
     __schema {
       types {
         name
         fields {
           name
         }
       }
     }
   }
   ```

### Error: Connection refused

**Penyebab**: Service belum running

**Solusi**:
1. Pastikan semua service sudah running:
   ```bash
   docker-compose ps
   ```
2. Cek URL: http://localhost:4000/graphql

---

## 📝 Tips & Best Practices

### GraphQL Playground

1. **Simpan Query**: Gunakan query history untuk menyimpan query yang sering digunakan
2. **Variables**: Gunakan variables untuk query yang dinamis:
   ```graphql
   query GetBooking($id: ID!) {
     bookingById(id: $id) {
       id
       status
     }
   }
   ```
   Variables:
   ```json
   {
     "id": "1"
   }
   ```

### Postman

1. **Environment Variables**: Gunakan environment variables untuk base_url dan token
2. **Pre-request Script**: Otomatis set token di semua request
3. **Tests**: Validasi response dan set variables
4. **Collection Runner**: Jalankan semua request secara berurutan

---

## 📚 Referensi

- GraphQL Playground: http://localhost:4000/graphql
- Postman Documentation: https://learning.postman.com/docs/
- GraphQL Documentation: https://graphql.org/learn/

---

**Last Updated**: 2025-01-15  
**Version**: 1.0.0

