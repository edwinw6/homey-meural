import axios from "axios";

interface MeuralCloudDevice {
  id: number;
  alias: string;
  localIp: string;
}

class MeuralCloudApi {
  static baseUrl = "https://api.meural.com/v1";

  static async testCredentials(username: string, password: string) {
    try {
      await this.login(username, password);
    } catch (error: any) {
      if (error.response) {
        switch (error.response.status) {
          case 401:
            throw new Error("Your credentials are invalid");
          default:
            throw new Error(
              `An unexpected error occurred (${error.response.status})`
            );
        }
      } else {
        throw error;
      }
    }
    return true;
  }

  static async login(username: string, password: string) {
    const response = await axios.request({
      method: "POST",
      url: `${MeuralCloudApi.baseUrl}/authenticate`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: {
        username,
        password,
      },
    });

    const { token } = response.data;
    return new this(token);
  }

  constructor(private token: string) {
    this.token = token;
  }

  async get(path: string) {
    const response = await axios.request({
      method: "GET",
      url: `${MeuralCloudApi.baseUrl}${path}`,
      headers: { Authorization: `Token ${this.token}` },
    });

    return response.data.data;
  }

  async getDevices(): Promise<MeuralCloudDevice[]> {
    return this.get("/user/devices");
  }
}

export default MeuralCloudApi;
