import api from './api';

export interface AvailableRoom {
  roomId: string;
  roomName: string;
  roomType: string;
  description?: string;
  pricePerNight: number;
  totalPrice: number;
  capacity: number;
  adults?: number;
  children?: number;
  bedType: string;
  amenities: string[];
  image?: string;
  availableCount?: number;
}

export interface ChatSource {
  title: string;
  category?: string;
}

export interface ChatResponseData {
  answer: string;
  sources: ChatSource[];
  toolUsed: string | null;
  availableRooms: AvailableRoom[];
  checkIn?: string | null;
  checkOut?: string | null;
}

export interface ChatApiResponse {
  success: boolean;
  data: ChatResponseData;
  message?: string;
}

export const sendChatMessage = async (message: string): Promise<ChatResponseData> => {
  try {
    const response = await api.post<ChatApiResponse>('/ai/chat', { message });
    if (response.data && response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to get response from AI assistant');
  } catch (error: any) {
    console.error('AI Chat Error:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Error communicating with AI Assistant';
    throw new Error(errorMessage);
  }
};
