# Dokumentasi Query GraphQL - JMK AIR System

Dokumentasi lengkap untuk semua query dan mutation pada setiap service GraphQL.

---

## Daftar Isi

1. [Auth Service](#1-auth-service)
2. [Flight Schedule Service](#2-flight-schedule-service)
3. [Flight Booking Service](#3-flight-booking-service)
4. [Parcel Service](#4-parcel-service)
5. [Onboard Service](#5-onboard-service)
6. [External Booking Service](#6-external-booking-service)

---

## 1. Auth Service

**Endpoint Gateway:** `http://localhost:4000/`  
**Endpoint Direct:** `http://localhost:4001/`  
**Port:** 4001

### 1.1 Register User

**Type:** Mutation  
**Authentication:** Tidak diperlukan  
**Deskripsi:** Mendaftarkan user baru ke dalam sistem.

#### Query:
```graphql
mutation RegisterUser {
  register(
    username: "johndoe"
    fullName: "John Doe"
    email: "john@example.com"
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

#### Parameter:
- `username` (String!, required): Username untuk login
- `fullName` (String!, required): Nama lengkap user
- `email` (String!, required): Email user
- `password` (String!, required): Password user
- `role` (String, optional): Role user (default: "USER")

#### Response:
```json
{
  "data": {
    "register": {
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

---

### 1.2 Login

**Type:** Mutation  
**Authentication:** Tidak diperlukan  
**Deskripsi:** Login user dan mendapatkan JWT token.

#### Query:
```graphql
mutation Login {
  login(username: "johndoe", password: "password123") {
    token
    user {
      id
      username
      fullName
      email
      role
      status
    }
  }
}
```

#### Parameter:
- `username` (String!, required): Username user
- `password` (String!, required): Password user

#### Response:
```json
{
  "data": {
    "login": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "1",
        "username": "johndoe",
        "fullName": "John Doe",
        "email": "john@example.com",
        "role": "USER",
        "status": "ACTIVE"
      }
    }
  }
}
```

> **⚠️ Penting:** Simpan token dari response ini untuk request berikutnya yang memerlukan authentication!

---

### 1.3 Get User By ID

**Type:** Query  
**Authentication:** Tidak diperlukan  
**Deskripsi:** Mendapatkan informasi user berdasarkan ID.

#### Query:
```graphql
query GetUserById {
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

#### Parameter:
- `id` (ID!, required): ID user yang ingin diambil

#### Response:
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

---

### 1.4 Get Current User (Me)

**Type:** Query  
**Authentication:** **REQUIRED** - Header: `Authorization: Bearer <token>`  
**Deskripsi:** Mendapatkan informasi user yang sedang login.
**Akses di 4001**

#### Query:
```graphql
query GetMe {
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

#### Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response:
```json
{
  "data": {
    "me": {
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

---

## 2. Flight Schedule Service

**Endpoint Gateway:** `http://localhost:4000/`  
**Endpoint Direct:** `http://localhost:4002/`  
**Port:** 4002

### 2.1 Get All Flight Schedules

**Type:** Query  
**Authentication:** Tidak diperlukan  
**Deskripsi:** Mendapatkan semua jadwal penerbangan (tanpa filter).

#### Query:
```graphql
query GetFlightSchedules {
  flightSchedules {
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

#### Response:
```json
{
  "data": {
    "flightSchedules": [
      {
        "id": "1",
        "flightCode": "JMK001",
        "aircraftType": "Boeing 737",
        "departureLocation": "Jakarta",
        "destinationLocation": "Bandung",
        "departureTime": "2025-01-15T08:00:00Z",
        "arrivalTime": "2025-01-15T09:30:00Z",
        "price": 500000,
        "totalSeats": 150,
        "availableSeats": 145,
        "status": "ACTIVE"
      }
    ]
  }
}
```

---

### 2.2 Get Flight Schedules with Filter

**Type:** Query  
**Authentication:** Tidak diperlukan  
**Deskripsi:** Mencari jadwal penerbangan berdasarkan filter.

#### Query:
```graphql
query GetFlightSchedulesFiltered {
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

#### Parameter:
- `departureLocation` (String, optional): Lokasi keberangkatan
- `destinationLocation` (String, optional): Lokasi tujuan
- `departureDate` (String, optional): Tanggal keberangkatan (format: YYYY-MM-DD)

#### Response:
```json
{
  "data": {
    "flightSchedules": [
      {
        "id": "1",
        "flightCode": "JMK001",
        "departureLocation": "Jakarta",
        "destinationLocation": "Bandung",
        "departureTime": "2025-01-15T08:00:00Z",
        "arrivalTime": "2025-01-15T09:30:00Z",
        "price": 500000,
        "availableSeats": 145,
        "status": "ACTIVE"
      }
    ]
  }
}
```

---

### 2.3 Get Flight By Code

**Type:** Query  
**Authentication:** Tidak diperlukan  
**Deskripsi:** Mendapatkan jadwal penerbangan berdasarkan kode penerbangan.

#### Query:
```graphql
query GetFlightByCode {
  flightByCode(flightCode: "JMK001") {
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

#### Parameter:
- `flightCode` (String!, required): Kode penerbangan (contoh: "JMK001")

#### Response:
```json
{
  "data": {
    "flightByCode": {
      "id": "1",
      "flightCode": "JMK001",
      "aircraftType": "Boeing 737",
      "departureLocation": "Jakarta",
      "destinationLocation": "Bandung",
      "departureTime": "2025-01-15T08:00:00Z",
      "arrivalTime": "2025-01-15T09:30:00Z",
      "price": 500000,
      "totalSeats": 150,
      "availableSeats": 145,
      "status": "ACTIVE"
    }
  }
}
```

---

### 2.4 Get Flight By ID

**Type:** Query  
**Authentication:** Tidak diperlukan  
**Deskripsi:** Mendapatkan jadwal penerbangan berdasarkan ID.

#### Query:
```graphql
query GetFlightById {
  flightById(id: "1") {
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

#### Parameter:
- `id` (ID!, required): ID jadwal penerbangan

---

### 2.5 Create Flight Schedule

**Type:** Mutation  
**Authentication:** **REQUIRED** - Header: `Authorization: Bearer <token>`  
**Deskripsi:** Membuat jadwal penerbangan baru.

#### Query:
```graphql
mutation CreateFlightSchedule {
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

#### Parameter:
- `flightCode` (String!, required): Kode penerbangan
- `aircraftType` (String!, required): Tipe pesawat
- `departureLocation` (String!, required): Lokasi keberangkatan
- `destinationLocation` (String!, required): Lokasi tujuan
- `departureTime` (String!, required): Waktu keberangkatan (ISO 8601 format)
- `arrivalTime` (String!, required): Waktu kedatangan (ISO 8601 format)
- `price` (Float!, required): Harga tiket
- `totalSeats` (Int!, required): Total jumlah kursi

#### Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 2.6 Update Flight Schedule

**Type:** Mutation  
**Authentication:** **REQUIRED** - Header: `Authorization: Bearer <token>`  
**Deskripsi:** Mengupdate jadwal penerbangan yang sudah ada.

#### Query:
```graphql
mutation UpdateFlightSchedule {
  updateFlightSchedule(
    id: "1"
    departureTime: "2025-01-15T09:00:00Z"
    arrivalTime: "2025-01-15T10:30:00Z"
    price: 600000
    totalSeats: 150
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

#### Parameter:
- `id` (ID!, required): ID jadwal penerbangan
- `departureTime` (String, optional): Waktu keberangkatan baru
- `arrivalTime` (String, optional): Waktu kedatangan baru
- `price` (Float, optional): Harga baru
- `totalSeats` (Int, optional): Total kursi baru
- `status` (String, optional): Status penerbangan (ACTIVE, DELAYED, CANCELLED)

#### Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 2.7 Decrease Available Seats

**Type:** Mutation  
**Authentication:** Biasanya dipanggil internal oleh booking service  
**Deskripsi:** Mengurangi jumlah kursi tersedia (dipanggil saat booking).

#### Query:
```graphql
mutation DecreaseAvailableSeats {
  decreaseAvailableSeats(flightCode: "JMK001", seats: 2) {
    id
    flightCode
    availableSeats
  }
}
```

#### Parameter:
- `flightCode` (String!, required): Kode penerbangan
- `seats` (Int!, required): Jumlah kursi yang akan dikurangi

---

### 2.8 Increase Available Seats

**Type:** Mutation  
**Authentication:** Biasanya dipanggil internal oleh booking service  
**Deskripsi:** Menambah jumlah kursi tersedia (dipanggil saat cancel booking).

#### Query:
```graphql
mutation IncreaseAvailableSeats {
  increaseAvailableSeats(flightCode: "JMK001", seats: 2) {
    id
    flightCode
    availableSeats
  }
}
```

#### Parameter:
- `flightCode` (String!, required): Kode penerbangan
- `seats` (Int!, required): Jumlah kursi yang akan ditambah

---

## 3. Flight Booking Service

**Endpoint Gateway:** `http://localhost:4000/`  
**Endpoint Direct:** `http://localhost:4003/`  
**Port:** 4003

> **Catatan Penting:**  
> - Jika menggunakan **Gateway** (`http://localhost:4000/`), gunakan header: `Authorization: Bearer <token>`  
> - Jika menggunakan **Direct** (`http://localhost:4003/`), gunakan header: `user-id: <id>`

---

### 3.1 Create Booking

**Type:** Mutation  
**Authentication:** **REQUIRED**  
**Deskripsi:** Membuat booking baru untuk penerbangan.

#### Query (Versi Tanpa Payment ID):
```graphql
mutation CreateBooking {
  createBooking(
    flightCode: "JMK001"
    passengerName: "John Doe"
    numberOfSeats: 2
    seatNumber: "A1, A2"
  ) {
    id
    userId
    flightCode
    passengerName
    numberOfSeats
    seatNumber
    totalPrice
    status
    paymentStatus
  }
}
```

#### Query (Versi dengan Payment ID - Recommended ⭐):
```graphql
mutation CreateBookingWithPaymentId {
  createBooking(
    flightCode: "JMK001"
    passengerName: "John Doe"
    numberOfSeats: 2
    seatNumber: "A1, A2"
    paymentId: "PAY12345"
  ) {
    id
    userId
    flightCode
    passengerName
    numberOfSeats
    totalPrice
    status           # Akan langsung "CONFIRMED"
    paymentStatus    # Akan langsung "PAID"
    paymentId        # "PAY12345"
  }
}
```

#### Parameter:
- `flightCode` (String!, required): Kode penerbangan
- `passengerName` (String!, required): Nama penumpang
- `numberOfSeats` (Int!, required): Jumlah kursi yang dibooking
- `seatNumber` (String, optional): Nomor kursi (contoh: "A1, A2")
- `paymentId` (String, optional): ID pembayaran (jika diberikan, booking langsung CONFIRMED dan PAID)

#### Headers (Gateway):
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Headers (Direct):
```
user-id: 1
```

#### Response:
```json
{
  "data": {
    "createBooking": {
      "id": "1",
      "userId": 1,
      "flightCode": "JMK001",
      "passengerName": "John Doe",
      "numberOfSeats": 2,
      "seatNumber": "A1, A2",
      "totalPrice": 1000000,
      "status": "PENDING",
      "paymentStatus": "UNPAID"
    }
  }
}
```

---

### 3.2 Get My Bookings

**Type:** Query  
**Authentication:** **REQUIRED**  
**Deskripsi:** Mendapatkan semua booking milik user yang sedang login.

#### Query:
```graphql
query GetMyBookings {
  myBookings {
    id
    userId
    flightCode
    passengerName
    numberOfSeats
    seatNumber
    totalPrice
    status
    paymentStatus
    paymentId
    externalBookingId
  }
}
```

#### Headers (Gateway):
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Headers (Direct):
```
user-id: 1
```

#### Response:
```json
{
  "data": {
    "myBookings": [
      {
        "id": "1",
        "userId": 1,
        "flightCode": "JMK001",
        "passengerName": "John Doe",
        "numberOfSeats": 2,
        "seatNumber": "A1, A2",
        "totalPrice": 1000000,
        "status": "CONFIRMED",
        "paymentStatus": "PAID",
        "paymentId": "PAY12345",
        "externalBookingId": null
      }
    ]
  }
}
```

---

### 3.3 Get All Bookings (Maskapai)

**Type:** Query  
**Authentication:** **REQUIRED**  
**Deskripsi:** Menampilkan **semua** booking yang ada di sistem maskapai, termasuk:
- booking yang dibuat oleh user maskapai (field `source` = `USER`)
- booking hasil sinkronisasi dari Travel App (field `source` = `TRAVEL_APP`)

#### Query:
```graphql
query GetAllBookings {
  allBookings {
    id
    userId
    flightCode
    passengerName
    numberOfSeats
    seatNumber
    totalPrice
    status
    paymentStatus
    paymentId
    externalBookingId
    source
  }
}
```

#### Headers (Gateway):
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 3.4 Get Booking By ID

**Type:** Query  
**Authentication:** **REQUIRED**  
**Deskripsi:** Mendapatkan detail booking berdasarkan ID.

#### Query:
```graphql
query GetBookingById {
  bookingById(id: "1") {
    id
    userId
    flightCode
    passengerName
    numberOfSeats
    seatNumber
    totalPrice
    status
    paymentStatus
    paymentId
    externalBookingId
  }
}
```

#### Parameter:
- `id` (ID!, required): ID booking

#### Headers (Gateway):
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 3.4 Update Booking Status

**Type:** Mutation  
**Authentication:** **REQUIRED**  
**Deskripsi:** Mengupdate status booking (contoh: CANCELLED).

#### Query:
```graphql
mutation UpdateBookingStatus {
  updateBookingStatus(id: "1", status: "CANCELLED") {
    id
    status
  }
}
```

#### Parameter:
- `id` (ID!, required): ID booking
- `status` (String!, required): Status baru (PENDING, CONFIRMED, CANCELLED)

#### Headers (Gateway):
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 3.5 Confirm Payment

**Type:** Mutation  
**Authentication:** **REQUIRED**  
**Deskripsi:** Mengkonfirmasi pembayaran untuk booking.

#### Query (dengan Payment ID):
```graphql
mutation ConfirmPayment {
  confirmPayment(bookingId: "1", paymentId: "PAY12345") {
    id
    status
    paymentStatus
    paymentId
  }
}
```

#### Parameter:
- `bookingId` (ID!, required): ID booking
- `paymentId` (String!, required): ID pembayaran

#### Headers (Gateway):
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response:
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

### 3.6 Get External Booking By ID

**Type:** Query  
**Authentication:** **REQUIRED**  
**Deskripsi:** Mendapatkan informasi booking dari external booking service (partner/mock).

#### Query:
```graphql
query GetExternalBooking {
  externalBookingById(externalBookingId: "123") {
    id
    bookingCode
    passengerName
    status
    createdAt
  }
}
```

#### Parameter:
- `externalBookingId` (ID!, required): ID booking dari external service

#### Headers (Gateway):
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 3.7 Sync External Booking

**Type:** Mutation  
**Authentication:** **REQUIRED**  
**Deskripsi:** Mensinkronkan booking dari external booking service ke sistem JMK AIR.

#### Query:
```graphql
mutation SyncExternalBooking {
  syncExternalBooking(externalBookingId: "123") {
    id
    userId
    flightCode
    passengerName
    numberOfSeats
    totalPrice
    status
    externalBookingId
  }
}
```

#### Parameter:
- `externalBookingId` (ID!, required): ID booking dari external service yang akan disinkronkan

#### Headers (Gateway):
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response:
```json
{
  "data": {
    "syncExternalBooking": {
      "id": "10",
      "userId": 1,
      "flightCode": "JMK001",
      "passengerName": "John Doe",
      "numberOfSeats": 1,
      "totalPrice": 500000,
      "status": "CONFIRMED",
      "externalBookingId": "123"
    }
  }
}
```

---

## 4. Parcel Service

**Endpoint Gateway:** `http://localhost:4000/`  
**Endpoint Direct:** `http://localhost:4004/`  
**Port:** 4004

> **Catatan:** Semua query/mutation memerlukan authentication  
> - Gateway: `Authorization: Bearer <token>`  
> - Direct: `user-id: <id>`

---

### 4.1 Create Parcel Order

**Type:** Mutation  
**Authentication:** **REQUIRED**  
**Deskripsi:** Membuat order pengiriman paket.

#### Query:
```graphql
mutation CreateParcelOrder {
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
    userId
    bookingId
    flightCode
    senderName
    senderAddress
    receiverName
    receiverAddress
    weight
    dimensions
    cost
    status
    paymentStatus
  }
}
```

#### Parameter:
- `bookingId` (Int, optional): ID booking (jika terkait dengan booking tiket)
- `flightCode` (String!, required): Kode penerbangan
- `senderName` (String!, required): Nama pengirim
- `senderAddress` (String!, required): Alamat pengirim
- `receiverName` (String!, required): Nama penerima
- `receiverAddress` (String!, required): Alamat penerima
- `weight` (Float!, required): Berat paket (kg)
- `dimensions` (String, optional): Dimensi paket (contoh: "30x20x15")

#### Headers (Gateway):
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response:
```json
{
  "data": {
    "createParcelOrder": {
      "id": "1",
      "userId": 1,
      "bookingId": 1,
      "flightCode": "JMK001",
      "senderName": "John Doe",
      "senderAddress": "Jakarta",
      "receiverName": "Jane Doe",
      "receiverAddress": "Bandung",
      "weight": 5.5,
      "dimensions": "30x20x15",
      "cost": 150000,
      "status": "PENDING",
      "paymentStatus": "UNPAID"
    }
  }
}
```

---

### 4.2 Get My Parcel Orders

**Type:** Query  
**Authentication:** **REQUIRED**  
**Deskripsi:** Mendapatkan semua parcel order milik user yang sedang login.

#### Query:
```graphql
query GetMyParcelOrders {
  myParcelOrders {
    id
    userId
    bookingId
    flightCode
    senderName
    senderAddress
    receiverName
    receiverAddress
    weight
    dimensions
    cost
    status
    paymentStatus
  }
}
```

#### Headers (Gateway):
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response:
```json
{
  "data": {
    "myParcelOrders": [
      {
        "id": "1",
        "userId": 1,
        "bookingId": 1,
        "flightCode": "JMK001",
        "senderName": "John Doe",
        "senderAddress": "Jakarta",
        "receiverName": "Jane Doe",
        "receiverAddress": "Bandung",
        "weight": 5.5,
        "dimensions": "30x20x15",
        "cost": 150000,
        "status": "PENDING",
        "paymentStatus": "UNPAID"
      }
    ]
  }
}
```

---

### 4.3 Get Parcel Order By ID

**Type:** Query  
**Authentication:** **REQUIRED**  
**Deskripsi:** Mendapatkan detail parcel order berdasarkan ID.

#### Query:
```graphql
query GetParcelOrderById {
  parcelOrderById(id: "1") {
    id
    userId
    bookingId
    flightCode
    senderName
    senderAddress
    receiverName
    receiverAddress
    weight
    dimensions
    cost
    status
    paymentStatus
  }
}
```

#### Parameter:
- `id` (ID!, required): ID parcel order

#### Headers (Gateway):
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 4.4 Update Parcel Order Status

**Type:** Mutation  
**Authentication:** **REQUIRED**  
**Deskripsi:** Mengupdate status parcel order.

#### Query:
```graphql
mutation UpdateParcelOrderStatus {
  updateParcelOrderStatus(id: "1", status: "IN_TRANSIT") {
    id
    status
  }
}
```

#### Parameter:
- `id` (ID!, required): ID parcel order
- `status` (String!, required): Status baru (PENDING, IN_TRANSIT, DELIVERED, CANCELLED)

#### Headers (Gateway):
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 5. Onboard Service

**Endpoint Gateway:** `http://localhost:4000/`  
**Endpoint Direct:** `http://localhost:4005/`  
**Port:** 4005

> **Catatan:** Query menu tidak memerlukan authentication, namun mutation dan query order memerlukan authentication  
> - Gateway: `Authorization: Bearer <token>`  
> - Direct: `user-id: <id>`

---

### 5.1 Get Menu Items

**Type:** Query  
**Authentication:** Tidak diperlukan  
**Deskripsi:** Mendapatkan semua item menu yang tersedia.

#### Query (Semua Menu):
```graphql
query GetMenuItems {
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

#### Query (Filter by Category):
```graphql
query GetMenuItemsByCategory {
  menuItems(category: "Food") {
    id
    name
    description
    category
    price
    available
  }
}
```

#### Parameter:
- `category` (String, optional): Filter berdasarkan kategori (contoh: "Food", "Drink", "Snack")

#### Response:
```json
{
  "data": {
    "menuItems": [
      {
        "id": "1",
        "name": "Nasi Goreng",
        "description": "Nasi goreng spesial",
        "category": "Food",
        "price": 50000,
        "available": true
      },
      {
        "id": "2",
        "name": "Coca Cola",
        "description": "Minuman ringan",
        "category": "Drink",
        "price": 15000,
        "available": true
      }
    ]
  }
}
```

---

### 5.2 Get Menu Item By ID

**Type:** Query  
**Authentication:** Tidak diperlukan  
**Deskripsi:** Mendapatkan detail item menu berdasarkan ID.

#### Query:
```graphql
query GetMenuItemById {
  menuItemById(id: "1") {
    id
    name
    description
    category
    price
    available
  }
}
```

#### Parameter:
- `id` (ID!, required): ID menu item

---

### 5.3 Create Menu Item

**Type:** Mutation  
**Authentication:** **REQUIRED**  
**Deskripsi:** Membuat item menu baru.

#### Query:
```graphql
mutation CreateMenuItem {
  createMenuItem(
    name: "Nasi Goreng"
    description: "Nasi goreng spesial dengan ayam"
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

#### Parameter:
- `name` (String!, required): Nama menu item
- `description` (String, optional): Deskripsi menu
- `category` (String!, required): Kategori menu (Food, Drink, Snack, etc.)
- `price` (Float!, required): Harga menu item

#### Headers (Gateway):
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 5.4 Create Onboard Order

**Type:** Mutation  
**Authentication:** **REQUIRED**  
**Deskripsi:** Membuat order makanan/minuman untuk onboard.

#### Query:
```graphql
mutation CreateOnboardOrder {
  createOnboardOrder(
    bookingId: 1
    items: [
      { menuItemId: "1", quantity: 2 }
      { menuItemId: "2", quantity: 1 }
    ]
  ) {
    id
    userId
    bookingId
    flightCode
    items
    totalPrice
    status
    paymentStatus
  }
}
```

#### Parameter:
- `bookingId` (Int!, required): ID booking (harus valid dan milik user)
- `items` ([OrderItemInput!]!, required): Array item yang dipesan
  - `menuItemId` (ID!, required): ID menu item
  - `quantity` (Int!, required): Jumlah item

#### Headers (Gateway):
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response:
```json
{
  "data": {
    "createOnboardOrder": {
      "id": "1",
      "userId": 1,
      "bookingId": 1,
      "flightCode": "JMK001",
      "items": "[{\"menuItemId\":\"1\",\"quantity\":2},{\"menuItemId\":\"2\",\"quantity\":1}]",
      "totalPrice": 115000,
      "status": "PENDING",
      "paymentStatus": "UNPAID"
    }
  }
}
```

---

### 5.5 Get My Onboard Orders

**Type:** Query  
**Authentication:** **REQUIRED**  
**Deskripsi:** Mendapatkan semua onboard order milik user yang sedang login.

#### Query:
```graphql
query GetMyOnboardOrders {
  myOnboardOrders {
    id
    userId
    bookingId
    flightCode
    items
    totalPrice
    status
    paymentStatus
  }
}
```

#### Headers (Gateway):
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response:
```json
{
  "data": {
    "myOnboardOrders": [
      {
        "id": "1",
        "userId": 1,
        "bookingId": 1,
        "flightCode": "JMK001",
        "items": "[{\"menuItemId\":\"1\",\"quantity\":2},{\"menuItemId\":\"2\",\"quantity\":1}]",
        "totalPrice": 115000,
        "status": "PENDING",
        "paymentStatus": "UNPAID"
      }
    ]
  }
}
```

---

### 5.6 Get Onboard Order By ID

**Type:** Query  
**Authentication:** **REQUIRED**  
**Deskripsi:** Mendapatkan detail onboard order berdasarkan ID.

#### Query:
```graphql
query GetOnboardOrderById {
  onboardOrderById(id: "1") {
    id
    userId
    bookingId
    flightCode
    items
    totalPrice
    status
    paymentStatus
  }
}
```

#### Parameter:
- `id` (ID!, required): ID onboard order

#### Headers (Gateway):
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 5.7 Update Onboard Order Status

**Type:** Mutation  
**Authentication:** **REQUIRED**  
**Deskripsi:** Mengupdate status onboard order.

#### Query:
```graphql
mutation UpdateOnboardOrderStatus {
  updateOnboardOrderStatus(id: "1", status: "SERVED") {
    id
    status
  }
}
```

#### Parameter:
- `id` (ID!, required): ID onboard order
- `status` (String!, required): Status baru (PENDING, PREPARING, SERVED, CANCELLED)

#### Headers (Gateway):
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 6. External Booking Service

**Endpoint Direct:** `http://localhost:5000/`  
**Port:** 5000

> **Catatan:** Service ini adalah mock/partner booking service yang terpisah dari federation.  
> Semua request memerlukan header: `user-id: <id>`

---

### 6.1 Create Booking (External Service)

**Type:** Mutation  
**Authentication:** **REQUIRED** - Header: `user-id: <id>`  
**Deskripsi:** Membuat booking di external booking service (mock/partner).

#### Query:
```graphql
mutation CreateBookingExternal {
  createBooking(
    type: "FLIGHT"
    flightCode: "JMK001"
    passengerName: "John Doe"
  ) {
    id
    type
    status
    flightCode
    passengerName
    createdAt
  }
}
```

#### Parameter:
- `type` (String!, required): Tipe booking (contoh: "FLIGHT")
- `flightCode` (String!, required): Kode penerbangan
- `passengerName` (String!, required): Nama penumpang

#### Headers:
```
user-id: 1
Content-Type: application/json
```

#### Response:
```json
{
  "data": {
    "createBooking": {
      "id": "123",
      "type": "FLIGHT",
      "status": "CONFIRMED",
      "flightCode": "JMK001",
      "passengerName": "John Doe",
      "createdAt": "2025-01-15T10:00:00Z"
    }
  }
}
```

---

### 6.2 Get My Bookings (External Service)

**Type:** Query  
**Authentication:** **REQUIRED** - Header: `user-id: <id>`  
**Deskripsi:** Mendapatkan semua booking milik user di external service.

#### Query:
```graphql
query GetMyBookingsExternal {
  myBookings {
    id
    type
    status
    flightCode
    passengerName
    createdAt
  }
}
```

#### Headers:
```
user-id: 1
```

---

### 6.3 Get Booking By ID (External Service)

**Type:** Query  
**Authentication:** **REQUIRED** - Header: `user-id: <id>`  
**Deskripsi:** Mendapatkan detail booking berdasarkan ID di external service.

#### Query:
```graphql
query GetBookingByIdExternal {
  bookingById(id: "123") {
    id
    type
    status
    flightCode
    passengerName
    createdAt
  }
}
```

#### Parameter:
- `id` (ID!, required): ID booking di external service

#### Headers:
```
user-id: 1
```

---

## Contoh Complete Flow

Berikut adalah contoh alur lengkap penggunaan API:

### Flow 1: Register → Login → Cari Flight → Booking

#### Step 1: Register
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

#### Step 2: Login (Simpan Token!)
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

**Simpan token dari response untuk request berikutnya!**

#### Step 3: Cari Flight
```graphql
query {
  flightSchedules(
    departureLocation: "Jakarta"
    destinationLocation: "Bandung"
  ) {
    id
    flightCode
    price
    availableSeats
  }
}
```

#### Step 4: Create Booking (dengan Payment ID)
**Headers:**
```
Authorization: Bearer <token_dari_step_2>
```

```graphql
mutation {
  createBooking(
    flightCode: "JMK001"
    passengerName: "Test User"
    numberOfSeats: 2
    paymentId: "PAY-2025-001"
  ) {
    id
    flightCode
    totalPrice
    status
    paymentStatus
  }
}
```

#### Step 5: Cek My Bookings
**Headers:**
```
Authorization: Bearer <token_dari_step_2>
```

```graphql
query {
  myBookings {
    id
    flightCode
    passengerName
    status
    paymentStatus
  }
}
```

---

### Flow 2: Create Onboard Order

#### Prasyarat: Sudah memiliki booking yang CONFIRMED

#### Step 1: Lihat Menu
```graphql
query {
  menuItems {
    id
    name
    price
    available
  }
}
```

#### Step 2: Create Onboard Order
**Headers:**
```
Authorization: Bearer <token>
```

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
    totalPrice
    status
  }
}
```

---

### Flow 3: Sync External Booking

#### Step 1: Pastikan ada booking di External Booking Service

**Endpoint:** `http://localhost:5000/`  
**Headers:**
```
user-id: 1
```

```graphql
mutation {
  createBooking(
    type: "FLIGHT"
    flightCode: "JMK001"
    passengerName: "John Doe"
  ) {
    id
  }
}
```

**Catat ID booking yang dihasilkan (contoh: "123")**

#### Step 2: Sync ke JMK AIR System

**Endpoint:** `http://localhost:4000/` (Gateway)  
**Headers:**
```
Authorization: Bearer <token>
```

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

## Tips dan Best Practices

1. **Simpan Token Setelah Login**
   - Setelah mutation `login`, simpan token yang diberikan
   - Gunakan token tersebut untuk semua request berikutnya yang memerlukan authentication

2. **Gunakan Gateway Endpoint**
   - Untuk semua request, gunakan gateway endpoint (`http://localhost:4000/`)
   - Gateway akan meng-handle authentication dan routing ke service yang tepat

3. **Booking dengan Payment ID**
   - Jika sudah memiliki payment ID saat create booking, masukkan langsung di parameter `paymentId`
   - Booking akan langsung CONFIRMED dan PAID, tidak perlu mutation `confirmPayment` lagi

4. **Error Handling**
   - Periksa field `errors` di response GraphQL
   - Error umum:
     - `Unauthorized`: Token tidak valid atau tidak ada
     - `Flight not found`: Flight code tidak ditemukan
     - `Insufficient seats`: Kursi tidak cukup
     - `Booking not found`: ID booking tidak ditemukan

5. **Query dengan Variables**
   - Untuk reusability, gunakan GraphQL variables
   - Contoh di Postman/Apollo Studio, masukkan variables di bagian terpisah

---

## Testing Tools

1. **Apollo Studio Sandbox**
   - Buka: https://studio.apollographql.com/sandbox/explorer
   - Masukkan endpoint: `http://localhost:4000/`
   - Tambahkan headers: `Authorization: Bearer <token>`

2. **Postman**
   - Method: POST
   - URL: `http://localhost:4000/`
   - Headers:
     - `Content-Type: application/json`
     - `Authorization: Bearer <token>` (jika diperlukan)
   - Body (raw JSON):
     ```json
     {
       "query": "query { flightSchedules { flightCode price } }"
     }
     ```

3. **cURL**
   ```bash
   curl -X POST http://localhost:4000/ \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <token>" \
     -d '{"query": "query { flightSchedules { flightCode price } }"}'
   ```

---

**Dokumentasi ini dibuat untuk TUBES JS v2.5 - JMK AIR System**

