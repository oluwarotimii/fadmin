# BUSY Web Service API Documentation

## Overview

The BUSY Web Service API allows external applications to integrate with BUSY accounting software. It provides a comprehensive interface for creating, reading, updating, and deleting accounting records through HTTP requests.

## Prerequisites

- BUSY accounting software must be running and logged into a company
- Valid username and password for the BUSY company
- Network access to the machine running BUSY
- Default port is 981 (configurable)

## API Architecture

The API uses HTTP GET requests with custom headers to specify operations. All requests are sent to `http://[busy-server]:981` with specific header combinations.

## Authentication

All API calls require authentication:
- `UserName`: Valid BUSY company username
- `Pwd`: Password for the user

## Response Format

All responses include:
- **Body**: Contains returned data (XML or generated codes)
- **Result Header**: `'T'` for success, `'F'` for failure
- **Description Header**: Error message when Result is `'F'`

## Service Codes

### 1. Execute SQL Query (SC=1)

Execute a SQL query on the BUSY company database and return results as XML.

**Request Headers:**
- `SC`: `1`
- `Qry`: SQL query string to execute
- `UserName`: Valid BUSY username
- `Pwd`: Valid BUSY password

**Response:**
- **Body**: XML string of the result set
- **Result**: `'T'` for success, `'F'` for failure
- **Description**: Error message if failed

**Example:**
```
GET http://localhost:981
Headers:
- SC: 1
- Qry: SELECT * FROM Tran1 WHERE VchType=9
- UserName: admin
- Pwd: password
```

### 2. Add Voucher from XML (SC=2)

Add a new voucher to BUSY from XML data.

**Request Headers:**
- `SC`: `2`
- `VchType`: Voucher type (see Voucher Types table)
- `VchXML`: XML string of voucher data in BUSY format
- `UserName`: Valid BUSY username
- `Pwd`: Valid BUSY password

**Response:**
- **Body**: Unique Voucher Code generated
- **Result**: `'T'` for success, `'F'` for failure
- **Description**: Error message if failed

**Example:**
```
GET http://localhost:981
Headers:
- SC: 2
- VchType: 9
- VchXML: <Sale><VchSeriesName>Main</VchSeriesName><Date>01-01-2024</Date>...</Sale>
- UserName: admin
- Pwd: password
```

### 3. Modify Voucher by Voucher Number (SC=3)

Modify an existing voucher using the voucher number as the key.

**Request Headers:**
- `SC`: `3`
- `VchType`: Voucher type
- `VchXML`: Modified XML string of voucher data
- `ModifyKey`: Criteria for modification:
  - `1`: Voucher number only
  - `2`: Voucher number and date
  - `3`: Voucher number and series
  - `4`: Voucher number, series, and date
  - `5`: Voucher code only
- `UserName`: Valid BUSY username
- `Pwd`: Valid BUSY password

**Response:**
- **Result**: `'T'` for success, `'F'` for failure
- **Description**: Error message if failed

### 4. Modify Voucher by Voucher Code (SC=4)

Modify an existing voucher using the unique voucher code.

**Request Headers:**
- `SC`: `4`
- `VchType`: Voucher type
- `VchXML`: Modified XML string of voucher data
- `VchCode`: Unique voucher code
- `UserName`: Valid BUSY username
- `Pwd`: Valid BUSY password

**Response:**
- **Body**: Updated Voucher Code
- **Result**: `'T'` for success, `'F'` for failure
- **Description**: Error message if failed

### 5. Add Master from XML (SC=5)

Add a new master record to BUSY from XML data.

**Request Headers:**
- `SC`: `5`
- `MasterType`: Master type (see Master Types table)
- `MasterXML`: XML string of master data in BUSY format
- `UserName`: Valid BUSY username
- `Pwd`: Valid BUSY password

**Response:**
- **Body**: Unique Master Code generated
- **Result**: `'T'` for success, `'F'` for failure
- **Description**: Error message if failed

**Example:**
```
GET http://localhost:981
Headers:
- SC: 5
- MasterType: 2
- MasterXML: <Account><Name>John Doe</Name><ParentGroup>Sundry Debtors</ParentGroup></Account>
- UserName: admin
- Pwd: password
```

### 6. Modify Master by Code (SC=6)

Modify an existing master using the master code.

**Request Headers:**
- `SC`: `6`
- `MasterCode`: Unique master code to modify
- `MasterXML`: Modified XML string of master data
- `UserName`: Valid BUSY username
- `Pwd`: Valid BUSY password

**Response:**
- **Body**: Master Code (same as input)
- **Result**: `'T'` for success, `'F'` for failure
- **Description**: Error message if failed

### 7. Modify Master by Name (SC=7)

Modify an existing master using the master name.

**Request Headers:**
- `SC`: `7`
- `MasterName`: Name of the master to modify
- `MasterType`: Master type
- `MasterXML`: Modified XML string of master data
- `UserName`: Valid BUSY username
- `Pwd`: Valid BUSY password

**Response:**
- **Result**: `'T'` for success, `'F'` for failure
- **Description**: Error message if failed

### 8. Get Voucher XML (SC=8)

Retrieve the XML data of a specific voucher.

**Request Headers:**
- `SC`: `8`
- `VchCode`: Unique voucher code to retrieve
- `UserName`: Valid BUSY username
- `Pwd`: Valid BUSY password

**Response:**
- **Body**: XML string of voucher data
- **Result**: `'T'` for success, `'F'` for failure
- **Description**: Error message if failed

### 9. Get Master XML (SC=9)

Retrieve the XML data of a specific master.

**Request Headers:**
- `SC`: `9`
- `MasterCode`: Unique master code to retrieve
- `UserName`: Valid BUSY username
- `Pwd`: Valid BUSY password

**Response:**
- **Body**: XML string of master data
- **Result**: `'T'` for success, `'F'` for failure
- **Description**: Error message if failed

## Master Types

| Value | Type |
|-------|------|
| 1 | Account Group Master |
| 2 | Account Master |
| 3 | Cost Center Group Master |
| 4 | Cost Center Master |
| 5 | Item Group Master |
| 6 | Item Master |
| 7 | Currency Master |
| 8 | Unit Master |
| 9 | Bill Sundry Master |
| 10 | Material Center Group Master |
| 11 | Material Center Master |
| 12 | Form Master |
| 13 | Sale Type Master |
| 14 | Purchase Type Master |
| 15 | Bill of Material Master |
| 16 | Unit Conversion Master |
| 17 | Currency Conversion Master |
| 18 | Standard Narration Master |
| 19 | Broker Master |
| 20 | Author Master |
| 21 | Voucher Series Master |
| 22 | TDS Master |
| 24 | Branch Master |
| 25 | Tax Category Master |
| 26 | Master Series Group Master |
| 27 | Employee Master |
| 28 | Employee Group Master |
| 29 | Salary Component Master |
| 30 | Discount Structure Master |
| 31 | Markup Structure Master |
| 32 | Scheme Master |
| 33 | Executive Master |
| 34 | Contact Group Master |
| 36 | Contact Master |

## Voucher Types

| Value | Type |
|-------|------|
| 2 | Purchase |
| 3 | Sale Return |
| 4 | Material Receipt |
| 5 | Stock Transfer |
| 6 | Production |
| 7 | Unassemble |
| 8 | Stock Journal |
| 9 | Sale |
| 10 | Purchase Return |
| 11 | Material Issue |
| 12 | Sale Order |
| 13 | Purchase Order |
| 14 | Receipt |
| 15 | Contra |
| 16 | Journal |
| 17 | Debit Note |
| 18 | Credit Note |
| 19 | Payment |
| 21 | Forms Received |
| 22 | Forms Issued |
| 26 | Sale Quotation |
| 27 | Purchase Quotation |
| 28 | Salary Calculation |
| 29 | Call Receipt |
| 30 | Call Allocation |
| 31 | Purchase Indent |
| 32 | Call Report |
| 61 | Physical Stock |

## Common Use Cases

### 1. Point of Sale (POS) Integration
- Create sales vouchers when transactions occur
- Update customer and item masters as needed
- Sync inventory levels in real-time

### 2. E-commerce Integration
- Create sales vouchers from online orders
- Add new customers to BUSY
- Update inventory based on website sales

### 3. Purchase Management
- Create purchase vouchers from supplier orders
- Add supplier masters
- Track purchase orders

### 4. Reporting and Analytics
- Query BUSY database for reports
- Extract data for dashboards
- Generate custom analytics

### 5. Data Migration
- Import customer data from legacy systems
- Migrate historical transactions
- Synchronize between multiple BUSY companies

## Error Handling

Always check the `Result` header in API responses:
- `'T'` indicates success
- `'F'` indicates failure
- When `'F'`, check the `Description` header for error details

## Best Practices

1. **Keep BUSY Running**: Ensure BUSY application remains open and logged in during operations
2. **Validate XML**: Ensure XML follows BUSY's predefined format
3. **Handle Errors**: Always check response headers for success/failure
4. **Secure Credentials**: Protect username/password combinations
5. **Test Thoroughly**: Test all operations in a development environment first
6. **Monitor Performance**: Large queries may take time to execute

## Security Considerations

- Use secure connections if possible
- Protect API credentials
- Validate all input data to prevent injection attacks
- Limit network access to authorized applications only

## Troubleshooting

- **Connection Issues**: Verify BUSY is running and web service is enabled
- **Authentication Failures**: Check username/password validity
- **Invalid XML**: Ensure XML follows BUSY's schema
- **Port Conflicts**: Verify port 981 is available and not blocked by firewall