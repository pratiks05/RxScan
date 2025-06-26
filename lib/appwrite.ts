// lib/appwrite.ts
import { Client, Account, Databases, ID, Query } from 'appwrite';

// Get configuration from environment variables with validation
const APPWRITE_ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT as string;
const APPWRITE_PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID as string;
const APPWRITE_DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID as string;
const APPWRITE_USER_COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_USER_COLLECTION_ID as string;

// Validate that all required environment variables are set
if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_DATABASE_ID || !APPWRITE_USER_COLLECTION_ID) {
  throw new Error('Missing required Appwrite environment variables. Please check your .env file.');
}

class AppwriteService {
  client: Client;
  account: Account;
  databases: Databases;

  constructor() {
    this.client = new Client();
    this.client
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID);

    this.account = new Account(this.client);
    this.databases = new Databases(this.client);
  }

  // Helper method to check if user is authenticated
  async isAuthenticated() {
    try {
      await this.account.getSession('current');
      return true;
    } catch {
      return false;
    }
  }

  // Auth Methods
  async createAccount(email: string, password: string, name?: string) {
    try {
      const userAccount = await this.account.create(
        ID.unique(),
        email,
        password,
        name
      );
      
      if (userAccount) {
        // Auto sign in after account creation
        const session = await this.signIn(email, password);
        return { userAccount, session };
      } else {
        return userAccount;
      }
    } catch (error) {
      console.log('Appwrite service :: createAccount :: error', error);
      throw error;
    }
  }

  async signIn(email: string, password: string) {
    try {
      const session = await this.account.createEmailPasswordSession(email, password);
      
      // Verify session was created successfully
      if (session) {
        console.log('Session created successfully:', session.$id);
      }
      
      return session;
    } catch (error) {
      console.log('Appwrite service :: signIn :: error', error);
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      // First check if there's an active session
      const isAuth = await this.isAuthenticated();
      // if (!isAuth) {
      //   console.log('No active session found');
      //   return null;
      // }
      
      const user = await this.account.get();
      return user;
    } catch (error) {
      console.log('Appwrite service :: getCurrentUser :: error', error);
      return null;
    }
  }

  async signOut() {
    try {
      await this.account.deleteSessions();
      console.log('All sessions deleted successfully');
      return true;
    } catch (error) {
      console.log('Appwrite service :: signOut :: error', error);
      return false;
    }
  }

  // Method to get current session info
  async getCurrentSession() {
    try {
      return await this.account.getSession('current');
    } catch (error) {
      console.log('Appwrite service :: getCurrentSession :: error', error);
      return null;
    }
  }

  // Method to list all sessions
  async listSessions() {
    try {
      return await this.account.listSessions();
    } catch (error) {
      console.log('Appwrite service :: listSessions :: error', error);
      return null;
    }
  }

  // Initialize authentication on app startup
  async initializeAuth() {
    try {
      const user = await this.account.get();
      console.log('User authenticated on startup:', user.$id);
      return user;
    } catch (error) {
      console.log('No authenticated user found on startup');
      return null;
    }
  }

  // Database Methods
  async createUserProfile(userId: string, data: any) {
    try {
      return await this.databases.createDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_USER_COLLECTION_ID,
        ID.unique(),
        {
          userId,
          ...data,
        }
      );
    } catch (error) {
      console.log('Appwrite service :: createUserProfile :: error', error);
      throw error;
    }
  }

  async getUserProfile(userId: string) {
    try {
      return await this.databases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_USER_COLLECTION_ID,
        [
          Query.equal('userId', userId)
        ]
      );
    } catch (error) {
      console.log('Appwrite service :: getUserProfile :: error', error);
      return null;
    }
  }

  async updateUserProfile(documentId: string, data: any) {
    try {
      return await this.databases.updateDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_USER_COLLECTION_ID,
        documentId,
        data
      );
    } catch (error) {
      console.log('Appwrite service :: updateUserProfile :: error', error);
      throw error;
    }
  }

  async deleteUserProfile(documentId: string) {
    try {
      return await this.databases.deleteDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_USER_COLLECTION_ID,
        documentId
      );
    } catch (error) {
      console.log('Appwrite service :: deleteUserProfile :: error', error);
      throw error;
    }
  }

  // Debug method to check authentication state
  async debugAuth() {
    try {
      console.log('=== Auth Debug Info ===');
      
      const sessions = await this.account.listSessions();
      console.log('Active sessions:', sessions.total);
      
      const currentSession = await this.account.getSession('current');
      console.log('Current session ID:', currentSession?.$id);
      
      const user = await this.account.get();
      console.log('Current user ID:', user?.$id);
      console.log('User email verified:', user?.emailVerification);
      
      return { sessions, currentSession, user };
    } catch (error) {
      console.log('Debug auth error:', error);
      return null;
    }
  }
}

const appwriteService = new AppwriteService();

export default appwriteService;

// Export config for easy access
export {
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID,
  APPWRITE_DATABASE_ID,
  APPWRITE_USER_COLLECTION_ID,
};