import axios from "axios";
import FormData from "form-data";

import MeuralCloudApi from "./meural-cloud";
import MeuralLocalApi from "./meural-local";

interface MeuralSettings {
  username: string;
  password: string;
  localIp: string;
  deviceId: number;
  onIpUpdate: (localIp: string) => void;
  log: (message: string) => void;
}

interface MeuralStatus {
  current_gallery: string;
  current_item: string;
  current_gallery_name: string;
}

interface MeuralCloudItem {
  id: number;
  image: string;
}

class MeuralApi {
  constructor(
    private username: string,
    private password: string,
    private cloudApi: MeuralCloudApi,
    private localApi: MeuralLocalApi,
    private deviceId: number,
    private onIpUpdate: (localIp: string) => void,
    private log: (message: any) => void
  ) {}

  static async initialize({
    username,
    password,
    localIp,
    deviceId,
    onIpUpdate,
    log,
  }: MeuralSettings) {
    const localApi = new MeuralLocalApi(localIp);

    try {
      const cloudApi = await MeuralCloudApi.login(username, password);
      return new this(
        username,
        password,
        cloudApi,
        localApi,
        deviceId,
        onIpUpdate,
        log
      );
    } catch (error: any) {
      throw new Error(
        `Failed to initialize Meural Cloud API: ${error.message}`
      );
    }
  }

  async withRetry<T>(fn: () => Promise<T>, retry = false): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      if (retry) {
        throw new Error(
          `Failed to connect to Meural. Error: ${error?.message}`
        );
      }

      await this.reconnectLocalApi();
      return this.withRetry(fn, true);
    }
  }

  async getSleepStatus(): Promise<boolean> {
    return this.withRetry(() => this.localApi.get("/control_check/sleep"));
  }

  setSleepStatus(sleep: boolean): Promise<void> {
    return this.withRetry(() =>
      this.localApi.post(`/control_command/${sleep ? "suspend" : "resume"}`)
    );
  }

  async getBrightness(): Promise<number> {
    const brightness = await this.withRetry(() =>
      this.localApi.get("/get_backlight")
    );
    return parseInt(brightness, 10);
  }

  setBrightness(brightness: number): Promise<void> {
    return this.withRetry(() =>
      this.localApi.post(`/control_command/set_backlight/${brightness}`)
    );
  }

  sendKey(key: "up" | "down" | "left" | "right"): Promise<void> {
    return this.withRetry(() =>
      this.localApi.post(`/control_command/set_key/${key}`)
    );
  }

  getGalleryStatus(): Promise<MeuralStatus> {
    return this.withRetry(() => this.localApi.get("/get_gallery_status_json"));
  }

  async setPostcardFromStream(photo: Buffer, contentType: string) {
    if (contentType === "image/jpg") {
      contentType = "image/jpeg";
    }

    if (contentType !== "image/jpeg" && contentType !== "image/png") {
      throw new Error(`Unsupported image type: ${contentType}`);
    }

    const data = new FormData();
    data.append("photo", photo, {
      contentType,
      filename: "postcard",
    });

    return this.withRetry(() => this.localApi.post("/postcard", data));
  }

  async setPostcardFromUrl(photoUrl: string) {
    const image = await axios.request({
      method: "GET",
      url: photoUrl,
      responseType: "arraybuffer",
    });

    let contentType = image.headers["content-type"];
    if (contentType === "image/jpg") {
      contentType = "image/jpeg";
    }

    if (contentType !== "image/jpeg" && contentType !== "image/png") {
      throw new Error(`Unsupported image type: ${contentType}`);
    }

    const data = new FormData();
    data.append("photo", image.data, {
      contentType,
      filename: "postcard",
    });

    return this.withRetry(() => this.localApi.post("/postcard", data));
  }

  getItem(itemId: string): Promise<MeuralCloudItem> {
    return this.cloudApi.get(`/items/${itemId}`);
  }

  async reconnectLocalApi() {
    try {
      const { localIp } = await this.cloudApi.get(`/devices/${this.deviceId}`);
      this.log(`Reconnecting to Meural at ${localIp}`);
      this.localApi = new MeuralLocalApi(localIp);
      this.onIpUpdate(localIp);
    } catch (error: any) {
      throw new Error(`Failed to get device: ${error.message}`);
    }
  }
}

export default MeuralApi;
