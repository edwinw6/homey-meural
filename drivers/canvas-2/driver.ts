import Homey from "homey";
import MeuralCloudApi from "../../apis/meural-cloud";

class Canvas2Driver extends Homey.Driver {
  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log("Canvas2Driver has been initialized");
  }

  async onPair(session: any) {
    let username = "";
    let password = "";

    session.setHandler(
      "login",
      (data: { username: string; password: string }) => {
        username = data.username;
        password = data.password;
        return MeuralCloudApi.testCredentials(username, password);
      }
    );

    session.setHandler("list_devices", async () => {
      const api = await MeuralCloudApi.login(username, password);
      const devices = await api.getDevices();

      return devices.map((device) => ({
        name: device.alias,
        data: {
          id: device.id,
        },
        settings: {
          username,
          password,
          localIp: device.localIp,
        },
      }));
    });
  }
}

module.exports = Canvas2Driver;
