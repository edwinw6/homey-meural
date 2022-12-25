import Homey from "homey";

class HomeyMeural extends Homey.App {
  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log("Meural has been initialized");
  }
}

module.exports = HomeyMeural;
