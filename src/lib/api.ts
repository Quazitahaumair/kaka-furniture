import { Party, Invoice, Entry } from '../context/AppStateContext';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // If the host is localhost or a local IP on the network, point to the same host on port 5000
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.')
    ) {
      return `http://${hostname}:5000/api`;
    }
  }
  return 'http://localhost:5000/api';
};

const API_BASE_URL = import.meta.env.VITE_API_URL || getApiBaseUrl();

// Generic fetch wrapper to handle errors consistently
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || `API request failed with status ${response.status}`);
  }

  // Our standardized response envelope has response.data
  return payload.data as T;
}

export const apiService = {
  // Parties / Ledger Accounts
  async getParties(): Promise<Party[]> {
    return apiFetch<Party[]>('/parties');
  },

  async createParty(partyData: {
    id?: string;
    name: string;
    phone: string;
    address?: string;
    openingBalance?: number;
  }): Promise<Party> {
    return apiFetch<Party>('/parties', {
      method: 'POST',
      body: JSON.stringify(partyData),
    });
  },

  async deleteParty(partyId: string): Promise<void> {
    return apiFetch<void>(`/parties/${partyId}`, {
      method: 'DELETE',
    });
  },

  // Ledger Entries
  async addLedgerEntry(
    partyId: string,
    entryData: {
      type: 'credit' | 'debit';
      amount: number;
      note: string;
      date?: string;
    }
  ): Promise<Entry> {
    return apiFetch<Entry>(`/parties/${partyId}/entries`, {
      method: 'POST',
      body: JSON.stringify(entryData),
    });
  },

  async deleteLedgerEntry(partyId: string, entryId: string): Promise<void> {
    return apiFetch<void>(`/parties/${partyId}/entries/${entryId}`, {
      method: 'DELETE',
    });
  },

  // Invoices
  async getInvoices(): Promise<Invoice[]> {
    return apiFetch<Invoice[]>('/invoices');
  },

  async createInvoice(
    invoiceData: Omit<Invoice, 'id'>,
    syncToLedger: boolean = true
  ): Promise<Invoice> {
    return apiFetch<Invoice>('/invoices', {
      method: 'POST',
      body: JSON.stringify({
        ...invoiceData,
        syncToLedger,
      }),
    });
  },

  async updateInvoice(
    invoiceId: string,
    invoiceData: Invoice,
    syncToLedger: boolean = true
  ): Promise<Invoice> {
    return apiFetch<Invoice>(`/invoices/${invoiceId}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...invoiceData,
        syncToLedger,
      }),
    });
  },

  async deleteInvoice(invoiceId: string): Promise<void> {
    return apiFetch<void>(`/invoices/${invoiceId}`, {
      method: 'DELETE',
    });
  },
};
