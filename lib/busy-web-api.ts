// lib/busy-web-api.ts
// Service to handle official Busy Web API operations with XML parsing

import { XMLParser } from 'fast-xml-parser';
import sql from './db';

interface BusyWebApiConfig {
  baseUrl: string;
  username: string;
  password: string;
}

interface BusyProduct {
  ItemCode: string;
  ItemName: string;
  PrintName: string;
  Rate: number;
  QtyOnHand: number;
  UnitName?: string;
  MaterialCenter?: string;
  LastModified?: string;
}

class BusyWebApiService {
  private config: BusyWebApiConfig;
  private parser: XMLParser;

  constructor() {
    if (!process.env.BUSY_SERVER || !process.env.BUSY_USERNAME || !process.env.BUSY_PASSWORD) {
      throw new Error('Busy Web API environment variables not set (BUSY_SERVER, BUSY_USERNAME, BUSY_PASSWORD)');
    }

    this.config = {
      baseUrl: process.env.BUSY_SERVER,
      username: process.env.BUSY_USERNAME,
      password: process.env.BUSY_PASSWORD
    };

    // Configuration for parsing BUSY XML responses
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      textNodeName: "#text",
      parseAttributeValue: true,
      parseTagValue: true,
      trimValues: true
    });
  }

  private async makeRequest(serviceCode: string, query?: string, additionalHeaders: Record<string, string> = {}) {
    const url = this.config.baseUrl;
    
    const headers: Record<string, string> = {
      'SC': serviceCode,
      'UserName': this.config.username,
      'Pwd': this.config.password,
      'Content-Type': 'application/json',
      ...additionalHeaders
    };

    // Add query if it's a service code that requires it
    if (query && serviceCode === '1') {
      headers['Qry'] = query;
    }

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      const result = response.headers.get('result') || response.headers.get('Result');
      const description = response.headers.get('description') || response.headers.get('Description');
      const xmlText = await response.text();

      if (result === 'T' || result === 't') {
        return {
          success: true,
          data: xmlText,
          headers: Object.fromEntries(response.headers.entries())
        };
      } else {
        throw new Error(`BUSY API Error: ${description || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('BUSY API request error:', error);
      throw error;
    }
  }

  // Parse BUSY XML response to JSON
  private parseBusyXML(xmlString: string): any[] {
    try {
      const result = this.parser.parse(xmlString);

      // Handle the specific BUSY XML structure
      if (result.rs && result.rs.data && Array.isArray(result.rs.data.row)) {
        return result.rs.data.row.map((row: any) => {
          // Convert attributes to properties
          const convertedRow: Record<string, any> = {};
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
  }

  // Transform BUSY data to application-friendly format
  private transformBusyData(parsedData: any[], dataType: string): any[] {
    switch (dataType) {
      case 'items':
        return parsedData.map(item => ({
          ItemCode: item.ItemCode || item.Code,
          ItemName: item.ItemName || item.Name,
          PrintName: item.PrintName || item.name,
          Rate: parseFloat(item.Rate) || 0,
          QtyOnHand: parseInt(item.QtyOnHand) || 0,
          UnitName: item.UnitName || item.unit,
          MaterialCenter: item.MC || item.MaterialCenter,
          ParentGroup: item.ParentGrp || item.ParentGroup,
          MasterType: parseInt(item.MasterType) || null,
          LastModified: item.LastModified || null
        }));

      case 'accounts':
        return parsedData.map(account => ({
          AccountCode: account.AccountCode || account.Code,
          AccountName: account.AccountName || account.Name,
          PrintName: account.PrintName || account.name,
          ParentGroup: account.ParentGrp || account.ParentGroup,
          MasterType: parseInt(account.MasterType) || null
        }));

      case 'transactions':
        return parsedData.map(transaction => ({
          VchCode: transaction.VchCode || transaction.Code,
          VoucherNumber: transaction.VchNo,
          VoucherType: parseInt(transaction.VchType) || null,
          Date: transaction.Date,
          Amount: parseFloat(transaction.Amt) || 0,
          MasterName1: transaction.MasterName1,
          MasterName2: transaction.MasterName2
        }));

      default:
        return parsedData;
    }
  }

  // Get all items from BUSY system
  async getAllItems(): Promise<BusyProduct[]> {
    try {
      const query = `
        SELECT
          ItemCode,
          ItemName,
          PrintName,
          Rate,
          QtyOnHand,
          UnitName,
          MC AS MaterialCenter,
          LastModified
        FROM ItemMaster
      `;

      const response = await this.makeRequest('1', query);
      const parsedData = this.parseBusyXML(response.data);
      return this.transformBusyData(parsedData, 'items') as BusyProduct[];
    } catch (error) {
      console.error('Error fetching items from BUSY Web API:', error);
      throw error;
    }
  }

  // Get items that have been modified since a specific date
  async getUpdatedItems(since: Date): Promise<BusyProduct[]> {
    try {
      const dateString = since.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      const query = `
        SELECT
          ItemCode,
          ItemName,
          PrintName,
          Rate,
          QtyOnHand,
          UnitName,
          MC AS MaterialCenter,
          LastModified
        FROM ItemMaster
        WHERE LastModified > '${since.toISOString()}'
      `;

      const response = await this.makeRequest('1', query);
      const parsedData = this.parseBusyXML(response.data);
      return this.transformBusyData(parsedData, 'items') as BusyProduct[];
    } catch (error) {
      console.error('Error fetching updated items from BUSY Web API:', error);
      throw error;
    }
  }

  // Get a specific item by code
  async getItemByCode(itemCode: string): Promise<BusyProduct | null> {
    try {
      const query = `
        SELECT
          ItemCode,
          ItemName,
          PrintName,
          Rate,
          QtyOnHand,
          UnitName,
          MC AS MaterialCenter,
          LastModified
        FROM ItemMaster
        WHERE ItemCode = '${itemCode}'
      `;

      const response = await this.makeRequest('1', query);
      const parsedData = this.parseBusyXML(response.data);
      const transformedData = this.transformBusyData(parsedData, 'items') as BusyProduct[];
      
      return transformedData.length > 0 ? transformedData[0] : null;
    } catch (error) {
      console.error(`Error fetching item ${itemCode} from BUSY Web API:`, error);
      return null;
    }
  }

  // Test the API connection
  async testConnection(): Promise<boolean> {
    try {
      // Try to fetch a simple query to test the connection
      const query = 'SELECT COUNT(*) AS Count FROM ItemMaster';
      const response = await this.makeRequest('1', query);
      const parsedData = this.parseBusyXML(response.data);
      
      // If we get a response with data, the connection is working
      return parsedData.length > 0;
    } catch (error) {
      console.error('BUSY Web API connection test failed:', error);
      return false;
    }
  }
}

export default BusyWebApiService;
export type { BusyProduct, BusyWebApiConfig };