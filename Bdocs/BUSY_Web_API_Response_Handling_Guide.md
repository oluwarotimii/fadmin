# BUSY Web API Response Handling Guide

## Overview
This document provides guidance on handling responses from the BUSY Web API, particularly focusing on the XML data format and how to properly parse and utilize the data in your applications.

## Current Data Status Report

Based on successful queries, your environment is confirmed as:

* **Database Engine:** Microsoft Jet (Access).
* **API Protocol:** HTTP over Port 981.
* **Data Format:** ADODB XML (Rowset Schema).
* **Company Context:** Company Code `0001` (Active).

### Key Data Found:

* **Masters:** Accounts (Ledgers), Account Groups (Hierarchy), and Items (Inventory/Services like 'BAT' and 'PHONE CASE').
* **Connectivity:** High. The `Result: T` confirms the `Itel` user has sufficient SQL privileges.

---

## Frontend Development: Essential "Must-Knows"

When building your UI (React, Vue, or even a simple HTML/JS page), keep these points in mind:

### A. The XML-to-JSON Hurdle

Standard web frontends (JavaScript) struggle to read the ADODB XML format directly.

* **Note:** You must use a library like `xml2js` or a custom parser to extract the attributes from the `<z:row>` tags.
* **Example:** In JavaScript, you can't just access `data.Name`. You have to look for the attribute inside the XML node.

### B. MasterType Logic

Busy uses the `Master1` table for almost everything. Your frontend logic must strictly filter by `MasterType` to avoid "Data Pollution":

* If building a **Customer Dropdown**, filter `WHERE MasterType=1 AND ParentGrp=...`.
* If building an **Item List**, filter `WHERE MasterType=6`.

### C. Column Aliasing (Friendly Names)

Busy uses "Legacy" column names like `D1`, `D2`, `CM1`.

* **Note:** Never show `D1` to the user. Always use SQL Aliases in your API calls:
* `SELECT Name, D1 AS SalePrice, D2 AS PurchasePrice ...`

* This makes your frontend code much easier to maintain.

### D. Data Types (Boolean/Dates)

* **Booleans:** Busy often returns `0/1` or `T/F`. Ensure your frontend checkboxes handle these as Booleans.
* **Dates:** Jet Engine dates can be finicky. Always format them in your SQL query if possible (e.g., `FORMAT(Date, 'yyyy-mm-dd')`) to make them "JavaScript-ready."

### E. Handling "Empty" Results

When a query finds nothing, Busy returns the `<s:Schema>` but an empty `<rs:data>` section.

* **Tip:** Always check if `<rs:data>` has children before trying to map them in your UI, otherwise your app will crash with a "null pointer" error.

---

## Response Parsing Implementation

### 1. XML Parsing Helper Functions

```javascript
// lib/xml-parser.js
import { XMLParser } from 'fast-xml-parser';

// Configuration for parsing BUSY XML responses
const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseAttributeValue: true,
  parseTagValue: true,
  trimValues: true
};

const parser = new XMLParser(parserOptions);

// Parse BUSY XML response to JSON
export const parseBusyXML = (xmlString) => {
  try {
    const result = parser.parse(xmlString);
    
    // Handle the specific BUSY XML structure
    if (result.rs && result.rs.data && Array.isArray(result.rs.data.row)) {
      return result.rs.data.row.map(row => {
        // Convert attributes to properties
        const convertedRow = {};
        for (const [key, value] of Object.entries(row)) {
          // Remove the attribute prefix and convert to readable property names
          const cleanKey = key.replace('@_', '');
          convertedRow[cleanKey] = value;
        }
        return convertedRow;
      });
    }
    
    return [];
  } catch (error) {
    console.error('Error parsing BUSY XML:', error);
    return [];
  }
};

// Handle empty results
export const handleEmptyResults = (parsedData) => {
  if (!parsedData || !Array.isArray(parsedData) || parsedData.length === 0) {
    return [];
  }
  return parsedData;
};
```

### 2. Data Transformation Utilities

```javascript
// lib/data-transformer.js
import { parseBusyXML } from './xml-parser';

// Transform BUSY data to application-friendly format
export const transformBusyData = (xmlResponse, dataType) => {
  const parsedData = parseBusyXML(xmlResponse);
  
  switch (dataType) {
    case 'items':
      return parsedData.map(item => ({
        id: item.ItemCode || item.Code,
        name: item.ItemName || item.Name,
        printName: item.PrintName || item.name,
        rate: parseFloat(item.Rate) || 0,
        qtyOnHand: parseInt(item.QtyOnHand) || 0,
        unit: item.UnitName || item.unit,
        materialCenter: item.MC || item.MaterialCenter,
        parentGroup: item.ParentGrp || item.ParentGroup,
        masterType: parseInt(item.MasterType) || null
      }));
    
    case 'accounts':
      return parsedData.map(account => ({
        id: account.AccountCode || account.Code,
        name: account.AccountName || account.Name,
        printName: account.PrintName || account.name,
        parentGroup: account.ParentGrp || account.ParentGroup,
        masterType: parseInt(account.MasterType) || null
      }));
    
    case 'transactions':
      return parsedData.map(transaction => ({
        id: transaction.VchCode || transaction.Code,
        voucherNumber: transaction.VchNo,
        voucherType: parseInt(transaction.VchType) || null,
        date: transaction.Date,
        amount: parseFloat(transaction.Amt) || 0,
        masterName1: transaction.MasterName1,
        masterName2: transaction.MasterName2
      }));
    
    default:
      return parsedData;
  }
};
```

### 3. API Response Handler

```javascript
// lib/busy-api-handler.js
import axios from 'axios';
import { transformBusyData } from './data-transformer';

export class BusyApiHandler {
  constructor(baseURL, username, password) {
    this.baseURL = baseURL;
    this.username = username;
    this.password = password;
  }

  // Generic API call method
  async makeApiCall(serviceCode, query, additionalHeaders = {}) {
    const config = {
      method: 'GET',
      url: this.baseURL,
      headers: {
        'SC': serviceCode.toString(),
        'UserName': this.username,
        'Pwd': this.password,
        ...additionalHeaders
      },
      timeout: 30000
    };

    // Add query if it's a service code that requires it
    if (query && serviceCode === '1') {
      config.headers['Qry'] = query;
    }

    try {
      const response = await axios(config);
      
      // Check the result header
      const result = response.headers['result'] || response.headers['Result'];
      const description = response.headers['description'] || response.headers['Description'];
      
      if (result === 'T' || result === 't') {
        return {
          success: true,
          data: response.data,
          headers: response.headers
        };
      } else {
        throw new Error(`BUSY API Error: ${description || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('API call error:', error);
      throw error;
    }
  }

  // Get items with material center information
  async getItemsWithMaterialCenters() {
    const query = `
      SELECT 
        ItemCode, 
        ItemName, 
        PrintName, 
        Rate AS SalePrice, 
        QtyOnHand AS Stock, 
        MC AS MaterialCenter, 
        UnitName 
      FROM ItemMaster
    `;
    
    const response = await this.makeApiCall('1', query);
    return transformBusyData(response.data, 'items');
  }

  // Get accounts/masters
  async getAccounts(masterType = null) {
    let query = 'SELECT AccountCode, AccountName, PrintName, ParentGrp FROM AccountMaster';
    
    if (masterType !== null) {
      query += ` WHERE MasterType = ${masterType}`;
    }
    
    const response = await this.makeApiCall('1', query);
    return transformBusyData(response.data, 'accounts');
  }

  // Get transactions
  async getTransactions(voucherType = null) {
    let query = 'SELECT VchCode, VchNo, VchType, Date, Amt, MasterName1, MasterName2 FROM Tran1';
    
    if (voucherType !== null) {
      query += ` WHERE VchType = ${voucherType}`;
    }
    
    const response = await this.makeApiCall('1', query);
    return transformBusyData(response.data, 'transactions');
  }
}
```

### 4. Material Center Handling

```javascript
// lib/material-center-handler.js
import { BusyApiHandler } from './busy-api-handler';

export class MaterialCenterHandler {
  constructor(apiHandler) {
    this.apiHandler = apiHandler;
  }

  // Get all material centers
  async getMaterialCenters() {
    const query = 'SELECT MCCode, MCName FROM MST_MATERIAL_CENTER';
    const response = await this.apiHandler.makeApiCall('1', query);
    return response.data; // Transform as needed
  }

  // Get stock by material center for specific item
  async getItemStockByMaterialCenter(itemCode) {
    const query = `
      SELECT 
        MC AS MaterialCenter, 
        QtyOnHand AS Stock 
      FROM ItemMaster 
      WHERE ItemCode = '${itemCode}'
    `;
    
    const response = await this.apiHandler.makeApiCall('1', query);
    const transformedData = transformBusyData(response.data, 'items');
    
    // Aggregate stock across all material centers
    const totalStock = transformedData.reduce((sum, item) => sum + item.qtyOnHand, 0);
    
    return {
      itemCode,
      totalStock,
      detailedStock: transformedData.map(item => ({
        location: item.materialCenter,
        stock: item.qtyOnHand
      }))
    };
  }

  // Get all items with detailed material center information
  async getAllItemsWithMaterialCenters() {
    const items = await this.apiHandler.getItemsWithMaterialCenters();
    
    // Group items by material center
    const itemsByMC = {};
    items.forEach(item => {
      const mc = item.materialCenter || 'DEFAULT';
      if (!itemsByMC[mc]) {
        itemsByMC[mc] = [];
      }
      itemsByMC[mc].push(item);
    });
    
    return {
      items,
      itemsByMaterialCenter: itemsByMC,
      summary: Object.keys(itemsByMC).map(mc => ({
        materialCenter: mc,
        itemCount: itemsByMC[mc].length,
        totalStock: itemsByMC[mc].reduce((sum, item) => sum + item.qtyOnHand, 0)
      }))
    };
  }
}
```

---

## Recommended Tech Stack for the Frontend

| Layer | Recommended Tool | Reason |
| --- | --- | --- |
| **UI Framework** | React or Vue.js | Excellent for handling real-time data tables. |
| **Proxy/Backend** | Node.js (Express) | To hide your `UserName` and `Pwd` from the browser (Security). |
| **Data Parser** | `fast-xml-parser` | Very fast at converting Busy's XML into usable JSON objects. |

---

## Security Considerations

### 1. Never expose credentials in frontend code
- Use a backend proxy to handle API calls
- Store credentials in environment variables
- Implement proper authentication for your web application

### 2. Input validation
- Validate all data received from BUSY before processing
- Sanitize data before displaying in the UI
- Implement proper error handling

### 3. Rate limiting
- Implement rate limiting to prevent API abuse
- Add caching to reduce API calls
- Use batch operations when possible

---

## Suggested Implementation Pattern

```javascript
// Example usage in a Next.js API route
// pages/api/busy/items.js
import { BusyApiHandler } from '../../../lib/busy-api-handler';
import { MaterialCenterHandler } from '../../../lib/material-center-handler';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiHandler = new BusyApiHandler(
      process.env.BUSY_SERVER,
      process.env.BUSY_USERNAME,
      process.env.BUSY_PASSWORD
    );

    const materialCenterHandler = new MaterialCenterHandler(apiHandler);
    const result = await materialCenterHandler.getAllItemsWithMaterialCenters();

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: error.message });
  }
}
```

This guide provides the foundation for properly handling BUSY Web API responses, including XML parsing, data transformation, and material center handling. The implementation ensures that your frontend receives clean, structured data that's easy to work with.
