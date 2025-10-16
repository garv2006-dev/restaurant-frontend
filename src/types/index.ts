// User types
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'staff' | 'admin';
  avatar?: string;
  isEmailVerified: boolean;
  loyaltyPoints: number;
  preferences: {
    notifications: {
      email: boolean;
      sms: boolean;
    };
    theme: 'light' | 'dark';
    language: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Room types
export interface Room {
  id: string;
  roomNumber: string;
  name: string;
  type: 'Standard' | 'Deluxe' | 'Suite';
  description: string;
  capacity: {
    adults: number;
    children: number;
  };
  bedType: 'Single' | 'Double' | 'Queen' | 'King' | 'Twin';
  area: number;
  price: {
    basePrice: number;
    weekendPrice: number;
    seasonalPricing: Array<{
      season: string;
      startDate: string;
      endDate: string;
      price: number;
    }>;
  };
  amenities: Array<{
    name: string;
    icon?: string;
    description?: string;
  }>;
  features: {
    airConditioning: boolean;
    wifi: boolean;
    breakfast: boolean;
    television: boolean;
    miniBar: boolean;
    balcony: boolean;
    seaView: boolean;
    cityView: boolean;
    parkingIncluded: boolean;
  };
  images: Array<{
    url: string;
    altText?: string;
    isPrimary: boolean;
  }>;
  status: 'Available' | 'Occupied' | 'Maintenance' | 'Out of Order';
  floor: number;
  isActive: boolean;
  averageRating: number;
  totalReviews: number;
}

// Booking types
export interface Booking {
  id: string;
  bookingId: string;
  user: string | User;
  room: string | Room;
  guestDetails: {
    primaryGuest: {
      name: string;
      email: string;
      phone: string;
    };
    additionalGuests: Array<{
      name: string;
      age?: number;
      relation?: string;
    }>;
    totalAdults: number;
    totalChildren: number;
  };
  bookingDates: {
    checkInDate: string;
    checkOutDate: string;
    nights: number;
  };
  pricing: {
    roomPrice: number;
    extraServices: Array<{
      service: string;
      price: number;
      quantity: number;
    }>;
    menuItems: Array<{
      item: string;
      quantity: number;
      price: number;
      scheduledFor?: string;
    }>;
    subtotal: number;
    taxes: {
      gst: number;
      serviceTax: number;
      other: number;
    };
    discount: {
      couponCode?: string;
      amount: number;
      percentage: number;
    };
    totalAmount: number;
  };
  status: 'Pending' | 'Confirmed' | 'CheckedIn' | 'CheckedOut' | 'Cancelled' | 'NoShow';
  paymentStatus: 'Pending' | 'Paid' | 'PartiallyPaid' | 'Refunded' | 'Failed';
  specialRequests?: string;
  createdAt: string;
  updatedAt: string;
}

// Menu Item types
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  price: number;
  discountPrice?: number;
  cuisine?: string;
  dietaryInfo: {
    isVegetarian: boolean;
    isVegan: boolean;
    isGlutenFree: boolean;
    isDairyFree: boolean;
    isKeto: boolean;
    isSpicy: boolean;
    spiceLevel: number;
  };
  ingredients: Array<{
    name: string;
    quantity?: string;
    allergen: boolean;
  }>;
  allergens: string[];
  preparationTime: number;
  servingSize: string;
  images: Array<{
    url: string;
    altText?: string;
    isPrimary: boolean;
  }>;
  availability: {
    isAvailable: boolean;
    availableDays: string[];
    availableHours: {
      start: string;
      end: string;
    };
  };
  popularity: {
    orderCount: number;
    averageRating: number;
    totalReviews: number;
  };
  isSignatureDish: boolean;
  isFeatured: boolean;
  isActive: boolean;
}

// Review types
export interface Review {
  id: string;
  user: string | User;
  booking: string | Booking;
  room?: string | Room;
  menuItem?: string | MenuItem;
  reviewType: 'room' | 'menuItem' | 'service' | 'overall';
  rating: number;
  title: string;
  comment: string;
  detailedRatings?: {
    cleanliness?: number;
    comfort?: number;
    service?: number;
    value?: number;
    location?: number;
    amenities?: number;
    taste?: number;
    presentation?: number;
    portion?: number;
  };
  pros: string[];
  cons: string[];
  images: Array<{
    url: string;
    caption?: string;
  }>;
  isApproved: boolean;
  isVerified: boolean;
  visitType?: 'Business' | 'Leisure' | 'Family' | 'Couple' | 'Solo' | 'Group';
  stayDuration?: string;
  createdAt: string;
}

// Payment types
export interface Payment {
  id: string;
  paymentId: string;
  booking: string | Booking;
  user: string | User;
  amount: number;
  currency: 'INR' | 'USD' | 'EUR' | 'GBP';
  paymentMethod: 'CreditCard' | 'DebitCard' | 'UPI' | 'PayPal' | 'Razorpay' | 'Stripe' | 'Cash';
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed' | 'Cancelled' | 'Refunded';
  paymentDate: string;
  description?: string;
  receipt?: {
    receiptNumber: string;
    receiptUrl: string;
  };
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

// Auth types
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
}

// Filter and Search types
export interface RoomFilters {
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  checkInDate?: string;
  checkOutDate?: string;
  guests?: number;
  amenities?: string[];
  sortBy?: 'price_low' | 'price_high' | 'rating' | 'name';
}

export interface MenuFilters {
  category?: string;
  cuisine?: string;
  minPrice?: number;
  maxPrice?: number;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  sortBy?: 'price_low' | 'price_high' | 'rating' | 'name' | 'popularity';
}

// Booking form types
export interface BookingFormData {
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  guests: {
    adults: number;
    children: number;
  };
  guestDetails: {
    name: string;
    email: string;
    phone: string;
  };
  additionalGuests: Array<{
    name: string;
    age?: number;
    relation?: string;
  }>;
  specialRequests?: string;
  preferences: {
    earlyCheckIn: boolean;
    lateCheckOut: boolean;
    floorPreference?: number;
    dietaryRequirements?: string;
  };
  extraServices: string[];
  menuItems: Array<{
    itemId: string;
    quantity: number;
    scheduledFor?: string;
  }>;
}

// Dashboard types
export interface DashboardStats {
  totalBookings: number;
  totalRevenue: number;
  totalCustomers: number;
  occupancyRate: number;
  averageRating: number;
  recentBookings: Booking[];
  revenueChart: Array<{
    date: string;
    revenue: number;
  }>;
  roomStatusChart: Array<{
    status: string;
    count: number;
  }>;
}

// Theme types
export interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

// Notification types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: string;
  read: boolean;
}