# Cara Menggunakan Payment ID

## 📋 Overview

Payment ID adalah identifier unik untuk transaksi pembayaran. Di sistem JMK AIR, payment ID bisa berasal dari beberapa sumber.

## 🔍 Dari Mana Payment ID?

### Opsi 1: Tambahkan Payment ID Saat Create Booking ⭐ NEW & RECOMMENDED

**Sekarang Anda bisa menambahkan payment ID langsung saat create booking!** Ini membuat flow lebih mudah karena payment ID sudah tersedia sejak awal.

**Contoh**:
```graphql
mutation {
  createBooking(
    flightCode: "JMK001"
    passengerName: "John Doe"
    numberOfSeats: 2
    paymentId: "PAY12345"  # ← Payment ID langsung di sini
  ) {
    id
    paymentId      # Akan langsung terisi "PAY12345"
    paymentStatus  # Akan langsung "PAID"
    status         # Akan langsung "CONFIRMED"
  }
}
```

**Keuntungan**:
- ✅ Payment ID langsung tersimpan saat booking dibuat
- ✅ Booking langsung menjadi CONFIRMED jika paymentId diberikan
- ✅ Tidak perlu confirm payment lagi jika sudah memberikan paymentId saat create booking
- ✅ Jika belum bayar, bisa confirm payment nanti tanpa perlu memberikan paymentId lagi

---

### Opsi 2: Generate Manual Saat Confirm Payment

**Payment ID bisa dibuat manual saat confirm payment**. Format bebas, biasanya:
- `PAY12345`
- `PAY-2025-001`
- `TXN-ABC123`
- `PAY-${Date.now()}` (dengan timestamp)
- atau format lainnya

**Contoh**:
```graphql
# Create booking tanpa paymentId
mutation {
  createBooking(
    flightCode: "JMK001"
    passengerName: "John Doe"
    numberOfSeats: 2
  ) {
    id
    paymentStatus  # UNPAID
  }
}

# Confirm payment dengan paymentId
mutation {
  confirmPayment(bookingId: "1", paymentId: "PAY12345") {
    id
    paymentId
    paymentStatus
  }
}
```

**💡 Tips**: Untuk testing, gunakan format sederhana seperti `PAY12345` atau `PAY-001`.

---

### Opsi 3: Confirm Payment Tanpa Payment ID (Jika Sudah Ada)

**Jika payment ID sudah ada di booking (dari create booking), Anda bisa confirm payment tanpa memberikan paymentId lagi!**

**Contoh**:
```graphql
# Step 1: Create booking dengan paymentId
mutation {
  createBooking(
    flightCode: "JMK001"
    passengerName: "John Doe"
    numberOfSeats: 2
    paymentId: "PAY12345"
  ) {
    id
    paymentId      # "PAY12345"
    paymentStatus  # "PAID"
    status         # "CONFIRMED"
  }
}

# Step 2: Confirm payment (opsional, karena sudah CONFIRMED)
# Jika booking sudah CONFIRMED, ini tidak perlu dilakukan lagi
mutation {
  confirmPayment(bookingId: "1") {  # ← Tidak perlu paymentId!
    id
    paymentId      # Akan menggunakan "PAY12345" yang sudah ada
    paymentStatus
  }
}
```

---

### Opsi 4: Dari Payment Service Kelompok 2 (Jika Terintegrasi)

Jika terintegrasi dengan Payment Service dari Kelompok 2, payment ID bisa didapat dari create payment di Payment Service.

**Flow**:
1. Create payment di Payment Service Kelompok 2
2. Dapat payment ID dari response
3. Gunakan payment ID tersebut untuk confirm payment

**Contoh** (jika terintegrasi):
```graphql
# Step 1: Create Payment di Payment Service
mutation {
  createPayment(
    bookingId: "1"
    amount: 1000000
    paymentMethod: "CREDIT_CARD"
  ) {
    id  # Ini adalah payment ID
    status
  }
}

# Step 2: Confirm Payment dengan payment ID dari step 1
mutation {
  confirmPayment(bookingId: "1", paymentId: "1") {
    id
    paymentId
    paymentStatus
  }
}
```

---

### Opsi 5: Dari External Payment Gateway

Jika menggunakan external payment gateway (seperti Midtrans, Xendit, dll), payment ID biasanya didapat dari response gateway setelah user melakukan pembayaran.

**Contoh Flow**:
```
1. User klik "Bayar"
2. Redirect ke payment gateway
3. User bayar di gateway
4. Gateway redirect kembali dengan payment ID
5. Gunakan payment ID tersebut untuk confirm payment
```

---

## 💻 Cara Menggunakan di GraphQL Playground

### Cara 1: Payment ID Saat Create Booking (Recommended) ⭐

**Langsung tambahkan payment ID saat create booking:**

```graphql
mutation {
  createBooking(
    flightCode: "JMK001"
    passengerName: "John Doe"
    numberOfSeats: 2
    paymentId: "PAY12345"  # ← Payment ID langsung di sini
  ) {
    id
    flightCode
    totalPrice
    status         # Akan langsung "CONFIRMED"
    paymentStatus  # Akan langsung "PAID"
    paymentId      # Akan langsung "PAY12345"
  }
}
```

**Response**:
```json
{
  "data": {
    "createBooking": {
      "id": "1",
      "flightCode": "JMK001",
      "totalPrice": 1000000,
      "status": "CONFIRMED",
      "paymentStatus": "PAID",
      "paymentId": "PAY12345"
    }
  }
}
```

**✅ Keuntungan**: Booking langsung CONFIRMED, tidak perlu confirm payment lagi!

---

### Cara 2: Create Booking Dulu, Confirm Payment Nanti

**Step 1: Create Booking (tanpa paymentId)**

```graphql
mutation {
  createBooking(
    flightCode: "JMK001"
    passengerName: "John Doe"
    numberOfSeats: 2
  ) {
    id
    flightCode
    totalPrice
    status
    paymentStatus  # UNPAID
  }
}
```

**Response**:
```json
{
  "data": {
    "createBooking": {
      "id": "1",
      "flightCode": "JMK001",
      "totalPrice": 1000000,
      "status": "BOOKED",
      "paymentStatus": "UNPAID"
    }
  }
}
```

**Simpan booking ID!**

---

**Step 2: Confirm Payment dengan Payment ID**

**Untuk Testing, gunakan payment ID manual**:

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

**Headers**:
```json
{
  "Authorization": "Bearer <token_dari_login>"
}
```

**Response**:
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

### Cara 3: Confirm Payment Tanpa Payment ID (Jika Sudah Ada)

**Jika payment ID sudah ada di booking (dari create booking), confirm payment tanpa paymentId:**

```graphql
# Create booking dengan paymentId
mutation {
  createBooking(
    flightCode: "JMK001"
    passengerName: "John Doe"
    numberOfSeats: 2
    paymentId: "PAY12345"
  ) {
    id
    paymentId
  }
}

# Confirm payment (opsional, karena sudah CONFIRMED)
# Jika perlu confirm lagi, tidak perlu memberikan paymentId
mutation {
  confirmPayment(bookingId: "1") {  # ← PaymentId tidak perlu!
    id
    paymentId      # Akan menggunakan "PAY12345" yang sudah ada
    paymentStatus
  }
}
```

---

## 🔄 Complete Flow dengan Payment ID

### Flow 1: Payment ID Saat Create Booking (Recommended) ⭐

```graphql
# 1. Login
mutation {
  login(username: "testuser", password: "password123") {
    token
  }
}

# 2. Create Flight Schedule
mutation {
  createFlightSchedule(...) {
    id
    flightCode
  }
}

# 3. Create Booking dengan Payment ID
mutation {
  createBooking(
    flightCode: "JMK001"
    passengerName: "John Doe"
    numberOfSeats: 2
    paymentId: "PAY-2025-001"  # ← Payment ID langsung di sini
  ) {
    id
    totalPrice
    paymentStatus  # PAID
    paymentId      # PAY-2025-001
    status         # CONFIRMED
  }
}

# 4. Create Parcel Order (langsung bisa karena sudah CONFIRMED)
mutation {
  createParcelOrder(...) {
    id
    status
  }
}
```

**✅ Keuntungan**: Lebih cepat, booking langsung CONFIRMED!

---

### Flow 2: Create Booking Dulu, Confirm Payment Nanti

```graphql
# 1. Login
mutation {
  login(username: "testuser", password: "password123") {
    token
  }
}

# 2. Create Flight Schedule
mutation {
  createFlightSchedule(...) {
    id
    flightCode
  }
}

# 3. Create Booking (tanpa paymentId)
mutation {
  createBooking(...) {
    id
    totalPrice
    paymentStatus  # UNPAID
  }
}

# 4. Confirm Payment (dengan payment ID manual untuk testing)
mutation {
  confirmPayment(
    bookingId: "1"
    paymentId: "PAY-2025-001"  # Payment ID manual
  ) {
    id
    paymentStatus  # PAID
    paymentId      # PAY-2025-001
  }
}

# 5. Create Parcel Order (setelah payment confirmed)
mutation {
  createParcelOrder(...) {
    id
    status
  }
}
```

---

## 📝 Format Payment ID yang Disarankan

Untuk testing, gunakan format yang mudah diidentifikasi:

### Format 1: Simple
```
PAY12345
PAY67890
```

### Format 2: Dengan Tanggal
```
PAY-2025-001
PAY-2025-002
```

### Format 3: Dengan Prefix
```
TXN-ABC123
TXN-XYZ789
```

### Format 4: UUID (jika perlu)
```
550e8400-e29b-41d4-a716-446655440000
```

**Catatan**: Format bebas, yang penting unik dan mudah diidentifikasi.

---

## 🔍 Cara Melihat Payment ID yang Sudah Ada

### Query Booking untuk Melihat Payment ID

```graphql
query {
  bookingById(id: "1") {
    id
    paymentId
    paymentStatus
    status
  }
}
```

**Response**:
```json
{
  "data": {
    "bookingById": {
      "id": "1",
      "paymentId": "PAY12345",
      "paymentStatus": "PAID",
      "status": "CONFIRMED"
    }
  }
}
```

### Query My Bookings

```graphql
query {
  myBookings {
    id
    flightCode
    paymentId
    paymentStatus
    status
  }
}
```

---

## 🎯 Best Practices

### 1. Generate Payment ID yang Unik

Gunakan format yang memastikan uniqueness:
- Timestamp-based: `PAY-${Date.now()}`
- Sequential: `PAY-${bookingId}-${timestamp}`
- UUID: Generate UUID

### 2. Simpan Payment ID

Setelah confirm payment, simpan payment ID untuk referensi:
- Di database booking (sudah otomatis)
- Di log system
- Di response ke user

### 3. Validasi Payment ID

Sebelum confirm payment, bisa validasi:
- Format payment ID
- Payment ID belum digunakan sebelumnya
- Payment ID sesuai dengan booking

---

## 🔧 Integrasi dengan Payment Service (Opsional)

Jika ingin mengintegrasikan dengan Payment Service:

### Step 1: Create Payment di Payment Service

```graphql
mutation {
  createPayment(
    bookingId: "1"
    amount: 1000000
    paymentMethod: "CREDIT_CARD"
  ) {
    id  # Payment ID dari Payment Service
    status
    paymentMethod
  }
}
```

### Step 2: Gunakan Payment ID untuk Confirm

```graphql
mutation {
  confirmPayment(
    bookingId: "1"
    paymentId: "1"  # Payment ID dari Payment Service
  ) {
    id
    paymentId
    paymentStatus
  }
}
```

---

## ❓ FAQ

### Q: Apakah payment ID harus unik?

**A**: Ya, sebaiknya unik untuk setiap transaksi. Gunakan format yang memastikan uniqueness.

### Q: Bisa menggunakan payment ID yang sama untuk booking berbeda?

**A**: Secara teknis bisa, tapi tidak disarankan. Setiap booking sebaiknya punya payment ID yang berbeda.

### Q: Bagaimana jika lupa payment ID?

**A**: Query booking untuk melihat payment ID yang sudah digunakan:
```graphql
query {
  bookingById(id: "1") {
    paymentId
  }
}
```

### Q: Apakah payment ID wajib?

**A**: Tidak selalu! Ada 3 opsi:
1. **Saat create booking**: `paymentId` adalah optional. Jika diberikan, booking langsung CONFIRMED.
2. **Saat confirm payment**: `paymentId` adalah optional. Jika tidak diberikan, akan menggunakan paymentId yang sudah ada di booking (jika ada).
3. **Jika tidak ada paymentId sama sekali**: Akan error saat confirm payment.

---

## 📚 Contoh Lengkap

### Scenario: Complete Booking dengan Payment

```graphql
# 1. Login
mutation {
  login(username: "testuser", password: "password123") {
    token
  }
}

# 2. Create Booking
mutation {
  createBooking(
    flightCode: "JMK001"
    passengerName: "John Doe"
    numberOfSeats: 2
  ) {
    id
    totalPrice
  }
}
# Response: { "id": "1", "totalPrice": 1000000 }

# 3. Generate Payment ID (manual untuk testing)
# Payment ID: PAY-2025-001-1

# 4. Confirm Payment
mutation {
  confirmPayment(
    bookingId: "1"
    paymentId: "PAY-2025-001-1"
  ) {
    id
    status
    paymentStatus
    paymentId
  }
}
# Response: { "paymentId": "PAY-2025-001-1", "paymentStatus": "PAID" }

# 5. Verify Payment ID
query {
  bookingById(id: "1") {
    id
    paymentId
    paymentStatus
  }
}
# Response: { "paymentId": "PAY-2025-001-1", "paymentStatus": "PAID" }
```

---

## 💡 Tips

1. **Untuk Testing**: Gunakan format sederhana seperti `PAY12345`
2. **Untuk Production**: Gunakan format yang lebih robust seperti UUID atau timestamp-based
3. **Tracking**: Simpan payment ID di log untuk tracking
4. **Validation**: Bisa tambahkan validasi format payment ID jika diperlukan

---

**Last Updated**: 2025-01-15  
**Status**: ✅ Ready to Use

