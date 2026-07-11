export type UserRole = 'admin' | 'customer' | 'technician';

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  role: UserRole;
  avatar_url: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  model: string;
  category: string;
  image_url: string;
  description: string;
  warranty_months: number;
  warranty_type: 'standard' | 'extended';
  warranty_terms: string;
  coverage_details: string;
  created_at: string;
}

export interface ProductRegistration {
  id: string;
  user_id: string;
  product_id: string;
  serial_number: string;
  purchase_date: string;
  invoice_url: string;
  warranty_card_code: string;
  warranty_expires_at: string;
  status: 'active' | 'expired' | 'transferred';
  created_at: string;
}

// Result of: product_registrations.select('*, product_id(*)')
export type ProductRegistrationWithProduct = Omit<ProductRegistration, 'product_id'> & {
  product_id: Product;
};

export type ServiceStatus = 'pending' | 'accepted' | 'repairing' | 'completed' | 'delivered';

export interface ServiceRequest {
  id: string;
  user_id: string;
  registration_id: string;
  problem_category: string;
  description: string;
  image_url: string;
  preferred_date: string | null;
  status: ServiceStatus;
  technician_id: string | null;
  technician_notes: string;
  estimated_delivery: string | null;
  created_at: string;
  updated_at: string;
}

// Result of: service_requests.select('*, registration_id(*, product_id(*)), technician_id(*)')
export type ServiceRequestWithRelations = Omit<ServiceRequest, 'registration_id' | 'technician_id'> & {
  registration_id: ProductRegistrationWithProduct;
  technician_id: Profile | null;
};

export interface ServiceTimelineEntry {
  id: string;
  service_request_id: string;
  status: ServiceStatus;
  note: string;
  created_by: string;
  created_at: string;
}

export interface Technician {
  id: string;
  profile_id: string;
  specialization: string;
  status: 'available' | 'busy' | 'offline';
  created_at: string;
}

// Result of: technicians.select('*, profile_id(*)')
export type TechnicianWithProfile = Omit<Technician, 'profile_id'> & {
  profile_id: Profile;
};

export interface OwnershipTransfer {
  id: string;
  registration_id: string;
  from_user_id: string;
  to_name: string;
  to_email: string;
  to_phone: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  resolved_at: string | null;
}

// Result of: ownership_transfers.select('*, registration_id(*, product_id(*))')
export type OwnershipTransferWithRelations = Omit<OwnershipTransfer, 'registration_id'> & {
  registration_id: ProductRegistrationWithProduct;
};

export interface Activity {
  id: string;
  user_id: string | null;
  type: string;
  description: string;
  created_at: string;
}
