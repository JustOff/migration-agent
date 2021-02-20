"use strict";

const {interfaces: Ci, results: Cr, utils: Cu} = Components;

Cu.import("resource://gre/modules/Services.jsm");

const extList = {
  "{9e96e0c4-9bde-49b7-989f-a4ca4bdc90bb}": "active-stop-button",
  "abh2me@Off.JustOff": "add-bookmark-helper",
  "AdvancedNightMode@Off.JustOff": "advanced-night-mode",
  "behind-the-overlay-me@Off.JustOff": "dismiss-the-overlay",
  "CookiesExterminator@Off.JustOff": "cookies-exterminator",
  "esrc-explorer@Off.JustOff": "esrc-explorer",
  "greedycache@Off.JustOff": "greedy-cache",
  "h5vtuner@Off.JustOff": "html5-video-tuner",
  "location4evar@Off.JustOff": "L4E",
  "lull-the-tabs@Off.JustOff": "lull-the-tabs",
  "modhresponse@Off.JustOff": "modify-http-response",
  "moonttool@Off.JustOff": "moon-tester-tool",
  "password-backup-tool@Off.JustOff": "password-backup-tool",
  "pmforum-smart-preview@Off.JustOff": "pmforum-smart-preview",
  "pxruler@Off.JustOff": "proxy-privacy-ruler",
  "resp-bmbar@Off.JustOff": "responsive-bookmarks-toolbar",
  "save-images-me@Off.JustOff": "save-all-images",
  "tab2device@Off.JustOff": "send-link-to-device",
  "SStart@Off.JustOff": "speed-start",
  "youtubelazy@Off.JustOff": "youtube-lazy-load"
};
const updateURLmask = "https://raw.githubusercontent.com/JustOff/%REPO%/master/update.xml";
const extIdMask = /component=aus.+?&id=([^&]*)/;
const migrationPref = "extensions.justoff-migration";

var httpObserver = {
  observe: function(subject, topic, data) {
    if (topic == 'http-on-modify-request') {
      let channel = subject.QueryInterface(Ci.nsIHttpChannel);
      if ((channel.URI.host == "addons.palemoon.org" || channel.URI.host == "addons.basilisk-browser.org") &&
          channel.notificationCallbacks && channel.notificationCallbacks.toString() == "[object XMLHttpRequest]") {
        let match = extIdMask.exec(channel.URI.spec);
        if (match && match[1] in extList) {
          let loadContext, newChannel, newUri = Services.io.newURI(updateURLmask.replace("%REPO%", extList[match[1]]), null, null);
          if ("newChannelFromURI2" in Services.io) {
            newChannel = Services.io.newChannelFromURI2(newUri, null, Services.scriptSecurityManager.getSystemPrincipal(),
              null, Ci.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_DATA_IS_NULL, Ci.nsIContentPolicy.TYPE_OTHER);
          } else {
            newChannel = Services.io.newChannelFromURI(newUri);
          }
          newChannel.loadInfo = channel.loadInfo;
          newChannel.notificationCallbacks = channel.notificationCallbacks;
          if (newChannel.notificationCallbacks instanceof Ci.nsILoadContext) {
            loadContext = newChannel.notificationCallbacks.getInterface(Ci.nsILoadContext);
          }
          let loadGroup = channel.loadGroup;
          newChannel.loadGroup = loadGroup;
          channel.loadGroup = null;
          newChannel.loadFlags |= channel.loadFlags;
          if (channel instanceof Ci.nsIHttpChannelInternal && newChannel instanceof Ci.nsIHttpChannelInternal) {
            newChannel.documentURI = channel.documentURI == channel.URI ? newChannel.URI : channel.documentURI;
          }
          let eventSink = channel.notificationCallbacks.getInterface(Ci.nsIChannelEventSink);
          eventSink.asyncOnChannelRedirect(channel, newChannel, Ci.nsIChannelEventSink.REDIRECT_INTERNAL, function() {});
          let replacementListener = {
            onDataAvailable: function() {},
            onStopRequest: function() {},
            onStartRequest: function() {}
          }
          channel.QueryInterface(Ci.nsITraceableChannel);
          let oldListener = channel.setNewListener(replacementListener);
          channel.notificationCallbacks = null;
          newChannel.asyncOpen(oldListener, loadContext);
          channel.cancel(Cr.NS_BINDING_REDIRECTED);
          if (loadGroup) {
            loadGroup.removeRequest(channel, loadContext, Cr.NS_BINDING_REDIRECTED);
          }
        }
      }
    }
  },
  QueryInterface: function(aIID) {
    if (aIID.equals(Ci.nsIObserver) || aIID.equals(Ci.nsISupports)) {
      return this;
    } else {
      throw Cr.NS_NOINTERFACE;
    }
  },
  register: function() {
    Services.obs.addObserver(this, "http-on-modify-request", false);
  },
  unregister: function() {
    Services.obs.removeObserver(this, "http-on-modify-request");
  }
}

function startup(data, reason) {
  Services.prefs.setBoolPref(migrationPref, true);
  httpObserver.register();
}

function shutdown(data, reason) {
  if (reason == APP_SHUTDOWN) return;
  if (reason == ADDON_DISABLE) {
    Services.prefs.clearUserPref(migrationPref);
  }
  httpObserver.unregister();
}

function install() {}

function uninstall() {
  Services.prefs.clearUserPref(migrationPref);
}
