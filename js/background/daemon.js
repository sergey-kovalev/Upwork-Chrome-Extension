'use strict';

import * as config from 'config';
import * as async from 'async';
import * as _ from 'underscore';
import * as storage from 'modules/storage';
import * as settings from 'modules/settings';
import * as odeskR from 'modules/odesk_request';
import * as cache from 'modules/cache';

var notifyInterval;

var prevNotificationCount = 0;
var notificationShow = function(count) {
  if (!count || count === prevNotificationCount) {
    return;
  }
  prevNotificationCount = count;
  var popup = chrome.extension.getViews({type: 'popup'})[0];
  if (popup) {
    popup.postMessage('newJobs', '*');
  } else {
    chrome.notifications.getPermissionLevel(permission => {
      if (permission === 'granted') {
        chrome.notifications.create(storage.get('feeds') + ':', {
          type: 'basic',
          title: storage.get('feeds') + ':',
          iconUrl: '/images/icon128n.png',
          message: `You have new ${count} vacancies`
        });
      }
    });
    chrome.browserAction.setBadgeText({
      text: count.toString()
    });
  }
};
chrome.notifications.onClicked.addListener(notificationId => {
  if (notificationId === storage.get('feeds') + ':') {
    window.open('popup.html');
  }
});

var createNotifier = function() {
  var alarmName = 'newJobsNotifier';
  chrome.alarms.clear(alarmName);
  chrome.alarms.create(alarmName, {
    periodInMinutes: notifyInterval
  });
};

var settingsCheck = function() {
  var newInterval = settings.get('notifyInterval');
  if (newInterval !== notifyInterval) {
    notifyInterval = newInterval;
    createNotifier();
  }
};
settingsCheck();

var checkNewJobs = function() {
  var feeds = storage.get('feeds'),
    API_access = storage.get('access');

  if (!feeds || !API_access) {
    return;
  }

  odeskR.request({
    query: feeds,
    start: 0,
    end: 20
  }, (err, response) => {
    if (err) {
      console.log(err);
    } else {
      var downloadedJobs = response.jobs,
        cacheJobs = cache.get() || [],
        favoritesJobs = storage.get('favorites') || [],
        trashJobs = storage.get('trash') || [],
        localJobs = [].concat(cacheJobs).concat(favoritesJobs).concat(trashJobs),
        newJobs = 0;

      _.each(downloadedJobs, downloaded => {
        var included;
        _.each(localJobs, local => {
          if (local.title === downloaded.title && local.date_created === downloaded.date_created) {
            included = true;
          }
        });
        if (!included) {
          newJobs += 1;
          downloaded.is_new = true;
          cacheJobs.unshift(downloaded);
        }
      });
      if (cacheJobs.length > config.cache_limit) {
        cacheJobs.length = config.cache_limit;
      }
      cacheJobs = _.sortBy(cacheJobs, item => {
        return -new Date(item.date_created).getTime();
      });
      cache.set(cacheJobs);
      console.log(newJobs);
      notificationShow(1);
    }
  });
};

chrome.alarms.create('settingsWatch', {
  periodInMinutes: 1
});

chrome.alarms.onAlarm.addListener(alarm => {
  switch (alarm.name) {
    case 'settingsWatch':
      settingsCheck();
      break;
    case 'newJobsNotifier':
      checkNewJobs();
      break;
    default:
  }
});
