import axios from "axios";

class MeuralLocalApi {
  baseUrl: string;

  constructor(localIp: string) {
    this.baseUrl = `http://${localIp}/remote`;
  }

  async get(path: string) {
    const response = await axios.request({
      method: "GET",
      url: `${this.baseUrl}${path}`,
    });

    return response.data.response;
  }

  async post(path: string, data?: any) {
    await axios.request({
      method: "POST",
      url: `${this.baseUrl}${path}`,
      data,
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.request({
        method: "GET",
        url: `${this.baseUrl}/identify`,
      });

      return response.data.status === "pass";
    } catch (error) {
      return false;
    }
  }
}

export default MeuralLocalApi;
