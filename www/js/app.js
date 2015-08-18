var PROX_UNKNOWN = 'ProximityUnknown';
var PROX_FAR = 'ProximityFar';
var PROX_NEAR = 'ProximityNear';
var PROX_IMMEDIATE = 'ProximityImmediate';

var app = angular.module('myApp', ['onsen']);
//ニフティクラウドmobile backendアプリID
var ncmb_app_id = 'YOURAPPID'; 

app.service('iBeaconService', function() {
    this.currentBeaconUuid = null;
    this.onDetectCallback = function(){};
    
    //ウォッチするビーコンリスト
    var beacons = {
                      'com.nifty.mbaas1': {
                          uuid: "E2C56DB5-DFFB-48D2-B060-D0F5A71096E0",
                          name: "mbaas beacon1",
                          icon: 'img/mbaas.png', 
                          rssi: -63, 
                          proximity: PROX_UNKNOWN, 
                          major: 1022, 
                          minor: 1
                      },
                      'com.nifty.mbaas2': {
                          uuid: "E2C56DB5-DFFB-48D2-B060-D0F5A71096E0",
                          name: "mbaas beacon2",
                          icon: 'img/logo.png', 
                          rssi: -63, 
                          proximity: PROX_UNKNOWN, 
                          major: 1022, 
                          minor: 2
                      }
                    };
    this.beacons = beacons;
    
    createBeacons = function() {
        var result = [];
        try {
            angular.forEach(beacons, function(value, key) {
                result.push(new cordova.plugins.locationManager.BeaconRegion(key, value.uuid, value.major, value.minor));
            });
        } catch (e) {
            alert('createBeacon err: ' + e);
        }
        return result;
    };
    
    this.watchBeacons = function(callback){
        document.addEventListener("deviceready", function(){
            var beacons = createBeacons();
            try {    
                var delegate = new cordova.plugins.locationManager.Delegate();

                delegate.didDetermineStateForRegion = function (pluginResult) {
                    console.log('[DOM] didDetermineStateForRegion: ' + JSON.stringify(pluginResult));
                    cordova.plugins.locationManager.appendToDeviceLog('[DOM] didDetermineStateForRegion: '
                        + JSON.stringify(pluginResult));
                };
                
                delegate.didStartMonitoringForRegion = function (pluginResult) {
                    console.log('didStartMonitoringForRegion:', pluginResult);
                    console.log('didStartMonitoringForRegion:' + JSON.stringify(pluginResult));
                };
                
                delegate.didRangeBeaconsInRegion = function (pluginResult) {
                    var beaconData;
                    beaconData = pluginResult.beacons[0];
                    var uuid = pluginResult.region.uuid.toUpperCase();
                    var id = pluginResult.region.identifier;
                    if (!beaconData || !uuid) {
                        return;
                    }
                    callback(beaconData, id);
                    console.log('[DOM] didRangeBeaconsInRegion: ' + JSON.stringify(pluginResult));
                };
                
                cordova.plugins.locationManager.setDelegate(delegate);
                
                // required in iOS 8+
                cordova.plugins.locationManager.requestWhenInUseAuthorization(); 
                // or cordova.plugins.locationManager.requestAlwaysAuthorization()
                
                beacons.forEach(function(beacon) {
                    cordova.plugins.locationManager.startRangingBeaconsInRegion(beacon);
                });
                
            } catch (e) {
                alert('Delegate err: ' + e);   
            }
        }, false);
    };
});

app.controller('TopPageCtrl', ['$scope', 'iBeaconService', function($scope, iBeaconService) {        
    iBeaconService.currentBeaconUuid = null;
    $scope.beacons = iBeaconService.beacons;
    
    var callback = function(deviceData, id)
    {
        var beacon = $scope.beacons[id];
        $scope.$apply(function()
        {
            beacon.rssi = deviceData.rssi;
            switch (deviceData.proximity)
            {
                case PROX_IMMEDIATE:
                    beacon.proximity = 'Immediate';
                    break;
                case PROX_NEAR:
                    beacon.proximity = 'Near';
                    break;
                case PROX_FAR:
                    beacon.proximity = 'Far';
                    break;
                case PROX_UNKNOWN:
                default:
                    break;
            }

            //Show notification
            if (iBeaconService.currentBeaconUuid === null && beacon.rssi >-60) {
                cordova.plugins.notification.local.schedule({
                    id: 1,
                    title: 'iBeaconを検出しました！クーポンを見ましょう！'
                });
            } 
            if (iBeaconService.currentBeaconUuid === null && beacon.rssi > -45) {
                $scope.enterInfoPage(beacon.uuid, beacon.major, beacon.minor);
            }
        });
    };
    iBeaconService.watchBeacons(callback);

    $scope.enterInfoPage = function(currentUuid, currentMajorId, currentMinorId) {
        iBeaconService.currentBeaconUuid = currentUuid;
        iBeaconService.currentMajorId = currentMajorId;
        iBeaconService.currentMinorId = currentMinorId;
        $scope.ons.navigator.pushPage('coupon-page.html');
        $scope.ons.navigator.on("prepop", function() {
        	iBeaconService.currentBeaconUuid = null;
        });
    };

}]);

app.controller('CouponPageCtrl', ['$scope', 'iBeaconService', function($scope, iBeaconService) {
    //ニフティクラウドmobile backendサーバーからクーポン情報を取得
    NCMB.initialize("YOUR_APPKEY", "YOUR_CLIENTKEY");
    var Beacon = NCMB.Object.extend("Beacon");
    var query = new NCMB.Query(Beacon);
    query.equalTo("uuid", iBeaconService.currentBeaconUuid);
    query.equalTo("major", iBeaconService.currentMajorId);
    query.equalTo("minor", iBeaconService.currentMinorId);
    query.find({
       success: function(results) {
          //検索結果からクーポンファイル名を抽出し、ファイルストアに保存しているファイルURL生成
          //公開ファイルURL：http://mb.cloud.nifty.com/doc/current/rest/filestore/publicFileGet.html
          var coupon_lst = results[0].get("coupon"); 
          var coupon_files = [];
          for (var j = 0; j < coupon_lst.length; j++) {
              coupon_files.push({'url':'https://mb.api.cloud.nifty.com/2013-09-01/applications/'+ ncmb_app_id +'/publicFiles/' + coupon_lst[j]});
          }
          $scope.coupons = coupon_files; 
       },
       error: function(error) {
          // エラー
       }
    });
}]);
