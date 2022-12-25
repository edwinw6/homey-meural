import Homey from "homey";
import MeuralApi from "../../apis/meural";

class Canvas2Device extends Homey.Device {
  api?: MeuralApi;
  updateIntervals: NodeJS.Timer[] = [];
  albumImage?: Homey.Image;
  currentItemId?: number;

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.albumImage = await this.homey.images.createImage();
    await this.setAlbumArtImage(this.albumImage);

    this.api = await MeuralApi.initialize({
      username: this.getSetting("username"),
      password: this.getSetting("password"),
      localIp: this.getSetting("localIp"),
      deviceId: this.getData().id,
      onIpUpdate: (localIp) => {
        this.setSettings({ localIp });
      },
      log: this.log.bind(this),
    });

    this.registerCapabilityListener("onoff", this.onOnOff.bind(this));
    this.registerCapabilityListener("dim", this.onDim.bind(this));
    this.registerCapabilityListener("speaker_next", this.onNext.bind(this));
    this.registerCapabilityListener("speaker_prev", this.onPrevious.bind(this));
    this.homey.flow
      .getActionCard("preview")
      .registerRunListener(async (args) => {
        const imageStream = await args.droptoken.getStream();
        this.api?.setPostcardFromStream(imageStream, imageStream.contentType);
      });

    this.updateIntervals.push(
      setInterval(this.localUpdate.bind(this), 3 * 1000)
    );

    this.updateIntervals.push(
      setInterval(this.remoteUpdate.bind(this), 60 * 1000)
    );

    this.localUpdate();
    this.remoteUpdate();

    this.log("Canvas2Device has been initialized");
  }

  async localUpdate() {
    const sleeping = await this.api?.getSleepStatus();
    const brightness = await this.api?.getBrightness();

    if (brightness) {
      this.setCapabilityValue("onoff", !sleeping).catch(this.error);
      this.setCapabilityValue("dim", sleeping ? 0 : brightness / 100).catch(
        this.error
      );
    }
  }

  async remoteUpdate() {
    const status = await this.api?.getGalleryStatus();

    if (status) {
      if (parseInt(status.current_gallery, 10) > 4) {
        const item = await this.api
          ?.getItem(status.current_item)
          .catch(this.error);

        if (item && item.id !== this.currentItemId && this.albumImage) {
          this.currentItemId = item.id;
          this.albumImage.setUrl(item.image);
          await this.albumImage.update();
        }
      }
    }
  }

  async onOnOff(isOn: boolean) {
    return this.api?.setSleepStatus(!isOn);
  }

  async onDim(brightness: number) {
    if (brightness === 0) {
      return this.api?.setSleepStatus(true);
    }

    await this.api?.setSleepStatus(false);
    return this.api?.setBrightness(brightness * 100);
  }

  async onNext() {
    // TODO: gesture flip
    await this.api?.sendKey("right");
    setTimeout(this.remoteUpdate.bind(this), 500);
  }

  async onPrevious() {
    await this.api?.sendKey("left");
    setTimeout(this.remoteUpdate.bind(this), 500);
  }

  // /**
  //  * onAdded is called when the user adds the device, called just after pairing.
  //  */
  // async onAdded() {
  //   this.log("Canvas2Device has been added");
  // }

  // /**
  //  * onSettings is called when the user updates the device's settings.
  //  * @param {object} event the onSettings event data
  //  * @param {object} event.oldSettings The old settings object
  //  * @param {object} event.newSettings The new settings object
  //  * @param {string[]} event.changedKeys An array of keys changed since the previous version
  //  * @returns {Promise<string|void>} return a custom message that will be displayed
  //  */
  // async onSettings({
  //   oldSettings: {},
  //   newSettings: {},
  //   changedKeys: [],
  // }): Promise<string | void> {
  //   this.log("Canvas2Device settings where changed");
  // }

  // /**
  //  * onRenamed is called when the user updates the device's name.
  //  * This method can be used this to synchronise the name to the device.
  //  * @param {string} name The new name
  //  */
  // async onRenamed(name: string) {
  //   this.log("Canvas2Device was renamed");
  // }

  // /**
  //  * onDeleted is called when the user deleted the device.
  //  */
  async onDeleted() {
    this.updateIntervals.forEach((interval) => clearInterval(interval));
    this.log("Canvas2Device has been deleted");
  }
}

module.exports = Canvas2Device;
