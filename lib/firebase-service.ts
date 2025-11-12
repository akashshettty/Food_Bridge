import { 
  ref, 
  push, 
  set, 
  get, 
  onValue, 
  off, 
  update,
  query,
  orderByChild,
  equalTo,
  limitToLast
} from 'firebase/database';
import { database } from './firebase';
import { foodItemService, requestService, transactionService } from './supabase-service';
import { supabase } from './supabase';

export interface FoodDonation {
  id?: string;
  donorId: string;
  donorName: string;
  foodType: string;
  quantity: string;
  unit: string;
  description: string;
  location: {
    address: string;
    lat: number;
    lng: number;
  };
  pickupTime: string;
  expiryDate: string;
  imageUrl?: string;
  status: 'pending' | 'matched' | 'completed' | 'expired';
  matchedWith?: string;
  matchedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FoodRequirement {
  id?: string;
  receiverId: string;
  receiverName: string;
  organizationName: string;
  title: string;
  foodType: string;
  quantity: string;
  unit: string;
  urgency: 'high' | 'medium' | 'low';
  description: string;
  location: {
    address: string;
    lat: number;
    lng: number;
  };
  neededBy: string;
  servingSize: string;
  status: 'active' | 'matched' | 'fulfilled';
  matchedWith?: string;
  matchedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Match {
  id?: string;
  donationId: string;
  requirementId: string;
  donorId: string;
  receiverId: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  distance: number;
  matchScore: number;
  createdAt: string;
  updatedAt: string;
}

// Mock data for when database is not available - reduced initial load
// Generate mock donations with timestamps computed at runtime so they don't expire
const mockDonations: FoodDonation[] = [
  {
    id: '1',
    donorId: 'current-user',
    donorName: 'Local Restaurant',
    foodType: 'Fresh Vegetables',
    quantity: '50',
    unit: 'kg',
    description: 'Fresh organic vegetables from our garden',
    location: {
      address: '123 Main St, Downtown',
      lat: 37.7749,
      lng: -122.4194
    },
    // pickup in ~2 hours, expires in ~24 hours
    pickupTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    // created a few days ago
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    donorId: 'donor2',
    donorName: 'Community Bakery',
    foodType: 'Bread and Pastries',
    quantity: '100',
    unit: 'pieces',
    description: 'Freshly baked bread and pastries',
    location: {
      address: '456 Oak Ave, Midtown',
      lat: 37.7849,
      lng: -122.4094
    },
    // pickup in ~4 hours, expires in ~8 hours
    pickupTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  // Additional mock donation - ready in ~1 hour
  {
    id: '3',
    donorId: 'donor3',
    donorName: 'Neighborhood Canteen',
    foodType: 'Cooked Meals',
    quantity: '60',
    unit: 'portions',
    description: 'Daily meal surplus from canteen',
    location: {
      address: '789 Market St, Central',
      lat: 37.7689,
      lng: -122.4312
    },
    pickupTime: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Generate mock requirements with runtime-relative neededBy and timestamps
const mockRequirements: FoodRequirement[] = [
  {
    id: '1',
    receiverId: 'current-user',
    receiverName: 'John Smith',
    organizationName: 'Community Shelter',
    title: 'Daily Meal Program',
    foodType: 'Vegetables and Grains',
    quantity: '30',
    unit: 'kg',
    urgency: 'high',
    description: 'Need fresh vegetables for our daily meal program',
    location: {
      address: '789 Pine St, Uptown',
      lat: 37.7649,
      lng: -122.4294
    },
    // needed in ~48 hours
    neededBy: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    servingSize: '150',
    status: 'active',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    receiverId: 'receiver2',
    receiverName: 'Jane Doe',
    organizationName: 'Food Bank',
    title: 'Weekly Food Distribution',
    foodType: 'Any Food Type',
    quantity: '100',
    unit: 'portions',
    urgency: 'medium',
    description: 'Weekly food distribution for families in need',
    location: {
      address: '321 Elm St, Downtown',
      lat: 37.7749,
      lng: -122.4194
    },
    // needed in ~5 days
    neededBy: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    servingSize: '100',
    status: 'active',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  // Additional mock requirement
  {
    id: '3',
    receiverId: 'receiver3',
    receiverName: 'Shelter Manager',
    organizationName: 'Night Shelter',
    title: 'Emergency Dinner Request',
    foodType: 'Cooked Meals',
    quantity: '80',
    unit: 'portions',
    urgency: 'high',
    description: 'Short notice need for dinner service',
    location: {
      address: '55 Harbor Rd, Bayside',
      lat: 37.7600,
      lng: -122.4350
    },
    neededBy: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    servingSize: '80',
    status: 'active',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  }
];

// Simple mock matches - timestamps computed at runtime
const mockMatches: Match[] = [
  {
    id: '1',
    donationId: '1',
    requirementId: '1',
    donorId: 'donor1',
    receiverId: 'receiver1',
    status: 'confirmed',
    distance: 2.5,
    matchScore: 95,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  // Additional match record
  {
    id: '2',
    donationId: '3',
    requirementId: '3',
    donorId: 'donor3',
    receiverId: 'receiver3',
    status: 'pending',
    distance: 1.2,
    matchScore: 88,
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  }
];

// --- Mock Data Pub/Sub System ---
type Listener<T> = (data: T[]) => void;

let donationsListeners: Listener<FoodDonation>[] = [];
let requirementsListeners: Listener<FoodRequirement>[] = [];

const subscribe = <T>(listeners: Listener<T>[], callback: Listener<T>) => {
  listeners.push(callback);
  return () => {
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
};

const notify = <T>(listeners: Listener<T>[], data: T[]) => {
  console.log(`🔔 Notifying ${listeners.length} listeners with ${data.length} items`);
  listeners.forEach(listener => {
    try {
      listener(data);
    } catch (error) {
      console.error('Error in listener callback:', error);
    }
  });
};
// --------------------------------

// Check if database is available
const isDatabaseAvailable = () => {
  try {
    // Check if we have valid Firebase configuration
    const hasValidConfig = process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
                          process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'demo-api-key' &&
                          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
                          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== 'demo-project';
    
    if (!hasValidConfig) {
      console.log('📊 Firebase not configured, using mock data mode');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('📊 Error checking database availability:', error);
    return false;
  }
};

// Cache for database availability check
let databaseAvailableCache: boolean | null = null;

const getDatabaseAvailability = async () => {
  try {
    // Test database connection by trying to read a test node
    const testRef = ref(database, '.info/connected');
    const snapshot = await get(testRef);
    console.log('🔥 Firebase database connection test:', snapshot.exists());
    return snapshot.exists();
  } catch (error) {
    console.log('📦 Firebase database not available, using mock data:', error);
    return false;
  }
};

// Synchronous version for functions that need it
const getDatabaseAvailabilitySync = () => {
  try {
    // Simple check if database is initialized
    return database && database.app;
  } catch (error) {
    console.log('📦 Firebase database not available (sync check):', error);
    return false;
  }
};

// Donation functions
export const createDonation = async (donation: Omit<FoodDonation, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  console.log('📝 Creating donation - Dual database write:', donation);
  
  try {
    // 1. Save to Supabase (SQL - primary structured data)
    console.log('💾 Saving to Supabase PostgreSQL...');
    
    const pickupTime = donation.pickupTime || new Date().toISOString();
    const expiryDate = donation.expiryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const supabaseData = {
      donor_id: donation.donorId,
      food_type: donation.foodType,
      quantity: parseFloat(donation.quantity),
      unit: donation.unit,
      description: donation.description,
      pickup_address: donation.location.address,
      pickup_latitude: donation.location.lat,
      pickup_longitude: donation.location.lng,
      pickup_time: pickupTime,
      expiry_date: expiryDate,
      image_url: donation.imageUrl || '',
      status: 'available' as const,
    };
    
    const supabaseResult = await foodItemService.create(supabaseData);
    
    if (!supabaseResult) {
      throw new Error('Failed to save donation to Supabase');
    }
    
    console.log('✅ Saved to Supabase (SQL) with ID:', supabaseResult.id);
    
    // 2. Save to Firebase Realtime Database (NoSQL - for real-time sync)
    const firebaseData: FoodDonation = {
      ...donation,
      id: supabaseResult.id,
      createdAt: supabaseResult.created_at,
      updatedAt: supabaseResult.created_at
    };
    
    const donationsRef = ref(database, `donations/${supabaseResult.id}`);
    await set(donationsRef, firebaseData);
    console.log('✅ Synced to Firebase (NoSQL) for real-time updates');
    
    // 3. Create activity log in Firebase (NoSQL only - real-time feed)
    const activityRef = ref(database, 'activity_feed');
    const newActivityRef = push(activityRef);
    await set(newActivityRef, {
      id: newActivityRef.key,
      type: 'donation_created',
      donationId: supabaseResult.id,
      donorId: donation.donorId,
      donorName: donation.donorName,
      foodType: donation.foodType,
      quantity: donation.quantity,
      unit: donation.unit,
      location: donation.location.address,
      timestamp: new Date().toISOString(),
      message: `New donation: ${donation.quantity} ${donation.unit} of ${donation.foodType}`
    });
    console.log('✅ Activity logged in Firebase (NoSQL)');
    
    return supabaseResult.id;
  } catch (error) {
    console.error('❌ Error creating donation:', error);
    throw error;
  }
};

export const updateDonationStatus = async (donationId: string, status: FoodDonation['status'], matchedWith?: string): Promise<void> => {
  console.log(`🔄 Updating donation status in Supabase: ${donationId} to ${status}`);
  
  try {
    // Map status to Supabase food_items status
    const supabaseStatus = 
      status === 'pending' ? 'available' :
      status === 'matched' ? 'reserved' :
      status === 'completed' ? 'collected' :
      'expired';
    
    // Update using the foodItemService - only update status
    await foodItemService.updateStatus(donationId, supabaseStatus as any);
    console.log('✅ Donation status updated in Supabase');
    
    // Also update in Firebase for real-time sync (optional) - includes matchedWith
    try {
      const donationRef = ref(database, `donations/${donationId}`);
      const firebaseUpdates: Partial<FoodDonation> = {
        status,
        updatedAt: new Date().toISOString()
      };
      
      if (matchedWith) {
        firebaseUpdates.matchedWith = matchedWith;
        firebaseUpdates.matchedAt = new Date().toISOString();
      }
      
      await update(donationRef, firebaseUpdates);
      console.log('✅ Donation status synced to Firebase');
    } catch (firebaseError) {
      console.warn('⚠️ Firebase sync failed (non-critical):', firebaseError);
    }
  } catch (error) {
    console.error('❌ Error updating donation status:', error);
    throw error;
  }
};

export const updateRequirementStatus = async (requirementId: string, status: FoodRequirement['status'], matchedWith?: string): Promise<void> => {
  console.log(`🔄 Updating requirement status in Supabase: ${requirementId} to ${status}`);
  
  try {
    // Map status to Supabase requests status
    const supabaseStatus = 
      status === 'active' ? 'active' :
      status === 'matched' ? 'matched' :
      'fulfilled';
    
    // Update using the requestService - only update status
    await requestService.updateStatus(requirementId, supabaseStatus as any);
    console.log('✅ Requirement status updated in Supabase');
    
    // Also update in Firebase for real-time sync (optional) - includes matchedWith
    try {
      const requirementRef = ref(database, `requirements/${requirementId}`);
      const firebaseUpdates: Partial<FoodRequirement> = {
        status,
        updatedAt: new Date().toISOString()
      };
      
      if (matchedWith) {
        firebaseUpdates.matchedWith = matchedWith;
        firebaseUpdates.matchedAt = new Date().toISOString();
      }
      
      await update(requirementRef, firebaseUpdates);
      console.log('✅ Requirement status synced to Firebase');
    } catch (firebaseError) {
      console.warn('⚠️ Firebase sync failed (non-critical):', firebaseError);
    }
  } catch (error) {
    console.error('❌ Error updating requirement status:', error);
    throw error;
  }
};

export const getDonationsByDonor = async (donorId: string, callback: (donations: FoodDonation[]) => void) => {
  console.log(`👂 Setting up listener for donations by donor (Supabase ONLY): ${donorId}`);
  
  try {
    // Fetch from Supabase (primary database)
    const supabaseDonations = await foodItemService.getByDonor(donorId);
    console.log(`💾 Found ${supabaseDonations.length} donations from Supabase`);
    
    // Convert Supabase format to FoodDonation format
    const convertSupabaseToFoodDonation = (item: any): FoodDonation => ({
      id: item.id,
      donorId: item.donor_id,
      donorName: 'Donor',
      foodType: item.food_type,
      quantity: item.quantity.toString(),
      unit: item.unit,
      description: item.description,
      location: {
        address: item.pickup_address,
        lat: item.pickup_latitude,
        lng: item.pickup_longitude
      },
      pickupTime: item.pickup_time,
      expiryDate: item.expiry_date,
      imageUrl: item.image_url || undefined,
      status: (item.status === 'available' ? 'pending' : 
               item.status === 'reserved' ? 'matched' : 
               item.status === 'collected' ? 'completed' : 'expired') as FoodDonation['status'],
      createdAt: item.created_at,
      updatedAt: item.updated_at
    });
    
    const donations: FoodDonation[] = supabaseDonations.map(convertSupabaseToFoodDonation);
    
    callback(donations);
    
    // Set up real-time listener using Supabase subscriptions
    const subscription = supabase
      .channel(`donations-${donorId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'food_items', filter: `donor_id=eq.${donorId}` },
        async (payload: any) => {
          console.log('🔄 Supabase real-time update:', payload);
          // Refetch all donations on any change
          const updatedDonations = await foodItemService.getByDonor(donorId);
          const converted = updatedDonations.map(convertSupabaseToFoodDonation);
          callback(converted);
        }
      )
      .subscribe();
    
    // Return unsubscribe function
    return () => {
      subscription.unsubscribe();
    };
  } catch (error) {
    console.error('❌ Error setting up donations listener from Supabase:', error);
    // Return a no-op unsubscribe function
    return () => {};
  }
};

// Requirement functions
export const createRequirement = async (requirement: Omit<FoodRequirement, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  console.log('📋 Creating requirement - Dual database write:', requirement);
  
  try {
    // 1. Save to Supabase (SQL - primary structured data)
    console.log('💾 Saving requirement to Supabase PostgreSQL...');
    
    const neededBy = requirement.neededBy || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const supabaseData = {
      ngo_id: requirement.receiverId,
      title: requirement.title,
      food_type: requirement.foodType,
      quantity: parseFloat(requirement.quantity),
      unit: requirement.unit,
      urgency: requirement.urgency,
      description: requirement.description,
      delivery_address: requirement.location.address,
      delivery_latitude: requirement.location.lat,
      delivery_longitude: requirement.location.lng,
      needed_by: neededBy,
      serving_size: parseInt(requirement.servingSize) || 0,
      status: 'active' as const,
    };
    
    const supabaseResult = await requestService.create(supabaseData);
    
    if (!supabaseResult) {
      throw new Error('Failed to save requirement to Supabase');
    }
    
    console.log('✅ Saved to Supabase (SQL) with ID:', supabaseResult.id);
    
    // 2. Save to Firebase Realtime Database (NoSQL - for real-time sync)
    const firebaseData: FoodRequirement = {
      ...requirement,
      id: supabaseResult.id,
      createdAt: supabaseResult.created_at,
      updatedAt: supabaseResult.created_at
    };
    
    const requirementsRef = ref(database, `requirements/${supabaseResult.id}`);
    await set(requirementsRef, firebaseData);
    console.log('✅ Synced to Firebase (NoSQL) for real-time updates');
    
    // 3. Create activity log in Firebase (NoSQL only - real-time feed)
    const activityRef = ref(database, 'activity_feed');
    const newActivityRef = push(activityRef);
    await set(newActivityRef, {
      id: newActivityRef.key,
      type: 'requirement_created',
      requirementId: supabaseResult.id,
      receiverId: requirement.receiverId,
      receiverName: requirement.receiverName,
      organizationName: requirement.organizationName,
      title: requirement.title,
      foodType: requirement.foodType,
      quantity: requirement.quantity,
      unit: requirement.unit,
      urgency: requirement.urgency,
      location: requirement.location.address,
      timestamp: new Date().toISOString(),
      message: `New request: ${requirement.quantity} ${requirement.unit} of ${requirement.foodType} (${requirement.urgency} priority)`
    });
    console.log('✅ Activity logged in Firebase (NoSQL)');
    
    return supabaseResult.id;
  } catch (error) {
    console.error('❌ Error creating requirement:', error);
    throw error;
  }
};

export const getRequirementsByReceiver = async (receiverId: string, callback: (requirements: FoodRequirement[]) => void) => {
  console.log(`👂 Setting up listener for requirements by receiver (Supabase ONLY): ${receiverId}`);

  try {
    // Fetch from Supabase (primary database)
    const supabaseRequirements = await requestService.getByNGO(receiverId);
    console.log(`💾 Found ${supabaseRequirements.length} requirements from Supabase`);
    
    // Convert Supabase format to FoodRequirement format
    const convertSupabaseToRequirement = (item: any): FoodRequirement => ({
      id: item.id,
      receiverId: item.ngo_id,
      receiverName: 'Receiver',
      organizationName: item.title || 'Organization',
      title: item.title,
      foodType: item.food_type,
      quantity: item.quantity.toString(),
      unit: item.unit,
      urgency: item.urgency,
      description: item.description,
      location: {
        address: item.delivery_address,
        lat: item.delivery_latitude,
        lng: item.delivery_longitude
      },
      neededBy: item.needed_by,
      servingSize: item.serving_size?.toString() || '0',
      status: (item.status === 'active' ? 'active' : 
               item.status === 'matched' ? 'matched' : 'fulfilled') as FoodRequirement['status'],
      createdAt: item.created_at,
      updatedAt: item.updated_at
    });
    
    const requirements = supabaseRequirements.map(convertSupabaseToRequirement);
    callback(requirements);
    
    // Set up real-time listener using Supabase subscriptions
    const subscription = supabase
      .channel(`requirements-${receiverId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'requests', filter: `ngo_id=eq.${receiverId}` },
        async (payload: any) => {
          console.log('� Supabase real-time update:', payload);
          // Refetch all requirements on any change
          const updatedRequirements = await requestService.getByNGO(receiverId);
          const converted = updatedRequirements.map(convertSupabaseToRequirement);
          callback(converted);
        }
      )
      .subscribe();
    
    // Return unsubscribe function
    return () => {
      subscription.unsubscribe();
    };
    
  } catch (error) {
    console.error('❌ Error setting up requirements listener from Supabase:', error);
    // Return a no-op unsubscribe function
    return () => {};
  }
};

// Match functions
export const createMatch = async (match: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>, actualQuantity?: number): Promise<string> => {
  console.log('🤝 Creating match/transaction record in both databases:', match);
  
  try {
    // 1. Create transaction in Supabase (SQL - primary structured data)
    console.log('💾 Creating transaction in Supabase PostgreSQL...');
    const transactionData = {
      donor_id: match.donorId,
      ngo_id: match.receiverId,
      food_item_id: match.donationId,
      request_id: match.requirementId,
      quantity_transferred: actualQuantity || 0,
      status: match.status === 'confirmed' ? 'completed' as const : 
              match.status === 'pending' ? 'pending' as const : 'completed' as const,
      pickup_time: new Date().toISOString(),
      delivery_time: new Date().toISOString(),
      match_score: match.matchScore,
      distance_km: match.distance
    };
    
    const supabaseTransaction = await transactionService.create(transactionData);
    let transactionId = supabaseTransaction?.id || '';
    console.log('✅ Transaction created in Supabase (SQL) with ID:', transactionId);
    
    // 2. Save match to Firebase Realtime Database (NoSQL - real-time matching data)
    const matchesRef = ref(database, 'matches');
    const newMatchRef = push(matchesRef);
    
    const matchData: Match = {
      ...match,
      id: transactionId || newMatchRef.key!,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await set(newMatchRef, matchData);
    console.log('✅ Match record synced to Firebase (NoSQL) with key:', newMatchRef.key);
    
    // 3. Create activity log in Firebase (NoSQL only)
    const activityRef = ref(database, 'activity_feed');
    const newActivityRef = push(activityRef);
    await set(newActivityRef, {
      id: newActivityRef.key,
      type: 'match_created',
      matchId: transactionId || newMatchRef.key,
      donationId: match.donationId,
      requirementId: match.requirementId,
      donorId: match.donorId,
      receiverId: match.receiverId,
      matchScore: match.matchScore,
      distance: match.distance,
      timestamp: new Date().toISOString(),
      message: `Transaction completed (${match.matchScore}% match, ${match.distance}km distance)`
    });
    console.log('✅ Transaction activity logged in Firebase (NoSQL)');
    
    return transactionId || newMatchRef.key!;
  } catch (error) {
    console.error('❌ Error creating match/transaction:', error);
    throw error;
  }
};

export const updateMatchStatus = async (matchId: string, status: Match['status']): Promise<void> => {
  if (!getDatabaseAvailabilitySync()) {
    const match = mockMatches.find(m => m.id === matchId);
    if (match) {
      match.status = status;
      match.updatedAt = new Date().toISOString();
      console.log('Mock match updated:', match);
    }
    return;
  }

  const matchRef = ref(database, `matches/${matchId}`);
  await update(matchRef, {
    status,
    updatedAt: new Date().toISOString()
  });
};

// Real-time listeners with debouncing
let donationsListenerTimeout: NodeJS.Timeout | null = null;
let requirementsListenerTimeout: NodeJS.Timeout | null = null;

export const listenToAvailableDonations = (callback: (donations: FoodDonation[]) => void) => {
  console.log('� Setting up listener for available donations (Supabase ONLY)');
  
  // Convert Supabase format to FoodDonation format
  const convertSupabaseToFoodDonation = (item: any): FoodDonation => ({
    id: item.id,
    donorId: item.donor_id,
    donorName: 'Donor',
    foodType: item.food_type,
    quantity: item.quantity.toString(),
    unit: item.unit,
    description: item.description,
    location: {
      address: item.pickup_address,
      lat: item.pickup_latitude,
      lng: item.pickup_longitude
    },
    pickupTime: item.pickup_time,
    expiryDate: item.expiry_date,
    imageUrl: item.image_url || undefined,
    status: (item.status === 'available' ? 'pending' : 
             item.status === 'reserved' ? 'matched' : 
             item.status === 'collected' ? 'completed' : 'expired') as FoodDonation['status'],
    createdAt: item.created_at,
    updatedAt: item.updated_at
  });

  // Initial fetch
  const fetchAndCallback = async () => {
    try {
      const { data, error } = await supabase
        .from('food_items')
        .select('*')
        .eq('status', 'available')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching available donations:', error);
        callback([]);
        return;
      }
      
      const donations = (data || []).map(convertSupabaseToFoodDonation);
      console.log(`💾 Found ${donations.length} available donations from Supabase`);
      callback(donations);
    } catch (error) {
      console.error('❌ Error in fetchAndCallback:', error);
      callback([]);
    }
  };

  // Call initial fetch
  fetchAndCallback();

  // Set up real-time subscription
  const subscription = supabase
    .channel('available-donations')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'food_items', filter: 'status=eq.available' },
      (payload: any) => {
        console.log('🔄 Supabase real-time update for donations:', payload);
        fetchAndCallback();
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    subscription.unsubscribe();
  };
};

export const listenToActiveRequirements = (callback: (requirements: FoodRequirement[]) => void) => {
  console.log('👂 Setting up listener for active requirements (Supabase ONLY)');
  
  // Convert Supabase format to FoodRequirement format
  const convertSupabaseToRequirement = (item: any): FoodRequirement => ({
    id: item.id,
    receiverId: item.ngo_id,
    receiverName: 'Receiver',
    organizationName: item.title || 'Organization',
    title: item.title,
    foodType: item.food_type,
    quantity: item.quantity.toString(),
    unit: item.unit,
    urgency: item.urgency,
    description: item.description,
    location: {
      address: item.delivery_address,
      lat: item.delivery_latitude,
      lng: item.delivery_longitude
    },
    neededBy: item.needed_by,
    servingSize: item.serving_size?.toString() || '0',
    status: item.status,
    createdAt: item.created_at,
    updatedAt: item.updated_at
  });

  // Initial fetch
  const fetchAndCallback = async () => {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching active requirements:', error);
        callback([]);
        return;
      }
      
      const requirements = (data || []).map(convertSupabaseToRequirement);
      console.log(`💾 Found ${requirements.length} active requirements from Supabase`);
      callback(requirements);
    } catch (error) {
      console.error('❌ Error in fetchAndCallback:', error);
      callback([]);
    }
  };

  // Call initial fetch
  fetchAndCallback();

  // Set up real-time subscription
  const subscription = supabase
    .channel('active-requirements')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'requests', filter: 'status=eq.active' },
      (payload: any) => {
        console.log('� Supabase real-time update for requirements:', payload);
        fetchAndCallback();
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    subscription.unsubscribe();
  };
};

// Analytics function with caching
let analyticsCache: any = null;
let analyticsCacheTime = 0;
const CACHE_DURATION = 30000; // 30 seconds

export const getAnalyticsData = async () => {
  // Return cached data if still valid
  if (analyticsCache && Date.now() - analyticsCacheTime < CACHE_DURATION) {
    return analyticsCache;
  }

  const isAvailable = await getDatabaseAvailability();
  if (!isAvailable) {
    const data = {
      donations: mockDonations,
      requirements: mockRequirements,
      matches: mockMatches
    };
    analyticsCache = data;
    analyticsCacheTime = Date.now();
    return data;
  }

  try {
    const [donationsSnapshot, requirementsSnapshot, matchesSnapshot] = await Promise.all([
      get(ref(database, 'donations')),
      get(ref(database, 'requirements')),
      get(ref(database, 'matches'))
    ]);

    const donations: FoodDonation[] = [];
    const requirements: FoodRequirement[] = [];
    const matches: Match[] = [];

    donationsSnapshot.forEach((child) => {
      donations.push(child.val());
    });

    requirementsSnapshot.forEach((child) => {
      requirements.push(child.val());
    });

    matchesSnapshot.forEach((child) => {
      matches.push(child.val());
    });

    const data = { donations, requirements, matches };
    analyticsCache = data;
    analyticsCacheTime = Date.now();
    return data;
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    const data = {
      donations: mockDonations,
      requirements: mockRequirements,
      matches: mockMatches
    };
    analyticsCache = data;
    analyticsCacheTime = Date.now();
    return data;
  }
};

export const removeListener = (ref: any, callback: any) => {
  if (ref && callback) {
    off(ref, 'value', callback);
  }
};

// User functions
export const updateUserRole = async (userId: string, role: string): Promise<void> => {
  console.log(`👤 Updating role for user ${userId} to ${role}`);
  
  if (!getDatabaseAvailabilitySync()) {
    console.log('📦 Mock user role updated in concept (no mock user store yet)');
    return;
  }

  const userRef = ref(database, `users/${userId}`);
  await update(userRef, { role });
  console.log(`✅ Role updated for user ${userId}`);
};