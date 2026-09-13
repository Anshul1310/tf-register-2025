import { auth } from "@/utiils/auth";

const rawBackendUrl = import.meta.env.VITE_PROD_URL_BACKEND || "http://localhost:8000";
export const BACKEND_URL = rawBackendUrl.startsWith("http")
  ? rawBackendUrl
  : `http://${rawBackendUrl}`;

async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  try {
    const { data: { session } } = await auth.getSession();
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
    if (session?.user?.id) {
      headers["X-User-ID"] = session.user.id;
    }
    if (session?.user?.email) {
      headers["X-User-Email"] = session.user.email;
    }
  } catch (error) {
    console.error("Failed to retrieve auth session headers:", error);
  }

  return headers;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
  [key: string]: any;
}

export const apiClient = {
  async syncUser(userData: {
    user_id?: string;
    email?: string;
    name?: string;
    pfp?: string;
  }): Promise<ApiResponse> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BACKEND_URL}/user/sync`, {
      method: "POST",
      headers,
      body: JSON.stringify(userData),
    });
    const result = await response.json();
    if (result.token) {
      auth.setToken(result.token);
    }
    return result;
  },

  async getCurrentUser(): Promise<ApiResponse> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BACKEND_URL}/user/me`, {
      method: "GET",
      headers,
    });
    return response.json();
  },

  async getUserById(userId: string): Promise<ApiResponse> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BACKEND_URL}/user/${userId}`, {
      method: "GET",
      headers,
    });
    return response.json();
  },

  async updateProfile(profileData: {
    name: string;
    roll_number: string;
    hostel: string;
    mess: string;
    gender: string;
    email?: string;
  }): Promise<ApiResponse> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BACKEND_URL}/user/profile`, {
      method: "PUT",
      headers,
      body: JSON.stringify(profileData),
    });
    return response.json();
  },

  async leaveTeam(): Promise<ApiResponse> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BACKEND_URL}/user/leave-team`, {
      method: "POST",
      headers,
    });
    return response.json();
  },

  async createTeam(teamData: {
    name: string;
    contactNumber: string;
    domain?: string | null;
    problem_statement?: string | null;
    leader_email?: string;
    leader_user_id?: string;
  }): Promise<ApiResponse> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BACKEND_URL}/team/create`, {
      method: "POST",
      headers,
      body: JSON.stringify(teamData),
    });
    return response.json();
  },

  async joinTeam(teamCode: string): Promise<ApiResponse> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BACKEND_URL}/team/join`, {
      method: "POST",
      headers,
      body: JSON.stringify({ teamCode }),
    });
    return response.json();
  },

  async getTeamById(teamId: string): Promise<ApiResponse> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BACKEND_URL}/team/${teamId}`, {
      method: "GET",
      headers,
    });
    return response.json();
  },

  async getPublicTeams(domain?: string, search?: string): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (domain) params.append("domain", domain);
    if (search) params.append("search", search);

    const queryString = params.toString() ? `?${params.toString()}` : "";
    const headers = await getAuthHeaders();
    const response = await fetch(`${BACKEND_URL}/team/public${queryString}`, {
      method: "GET",
      headers,
    });
    return response.json();
  },

  async getMemberCount(teamId: string): Promise<ApiResponse> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BACKEND_URL}/team/${teamId}/members/count`, {
      method: "GET",
      headers,
    });
    return response.json();
  },

  async getPaymentStats(): Promise<ApiResponse> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BACKEND_URL}/team/stats/payment`, {
      method: "GET",
      headers,
    });
    return response.json();
  },

  async updateTeamVisibility(teamId: string, isPublic: boolean): Promise<ApiResponse> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BACKEND_URL}/team/${teamId}/visibility`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ ispublic: isPublic }),
    });
    return response.json();
  },

  async updateTeamName(teamId: string, name: string): Promise<ApiResponse> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BACKEND_URL}/team/${teamId}/name`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ name }),
    });
    return response.json();
  },

  async updateTeamDetails(
    teamId: string,
    domain?: string | null,
    problemStatement?: string | null
  ): Promise<ApiResponse> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BACKEND_URL}/team/${teamId}/details`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        domain: domain || null,
        problem_statement: problemStatement || null,
      }),
    });
    return response.json();
  },

  async regenerateTeamId(teamId: string): Promise<ApiResponse> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BACKEND_URL}/team/${teamId}/regenerate-id`, {
      method: "POST",
      headers,
    });
    return response.json();
  },

  async deleteTeam(teamId: string): Promise<ApiResponse> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BACKEND_URL}/team/${teamId}`, {
      method: "DELETE",
      headers,
    });
    return response.json();
  },

  async createCheckoutOrder(orderData: {
    teamId: string;
    userId: string;
    teamName: string;
  }): Promise<any> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BACKEND_URL}/api/checkout`, {
      method: "POST",
      headers,
      body: JSON.stringify(orderData),
    });
    return response.json();
  },

  async verifyPayment(orderId: string, teamId: string): Promise<ApiResponse> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BACKEND_URL}/api/payment/verify`, {
      method: "POST",
      headers,
      body: JSON.stringify({ order_id: orderId, team_id: teamId }),
    });
    return response.json();
  },

  async submitManualPayment(teamId: string, formData: FormData): Promise<ApiResponse> {
    let authHeader = "";
    try {
      const { data: { session } } = await auth.getSession();
      if (session?.access_token) {
        authHeader = `Bearer ${session.access_token}`;
      }
    } catch (e) {
      console.error(e);
    }

    const headers: Record<string, string> = {};
    if (authHeader) headers["Authorization"] = authHeader;

    const response = await fetch(`${BACKEND_URL}/team/${teamId}/pay`, {
      method: "POST",
      headers,
      body: formData,
    });
    return response.json();
  },
};
